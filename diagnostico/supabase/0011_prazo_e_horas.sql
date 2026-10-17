-- Prazo do projeto e horas da equipe LORSO.
--
-- 1) Prazo: início do trabalho, entrega prevista e o histórico de prorrogações.
--    O cliente vê; só a equipe LORSO muda.
-- 2) Horas: minutos de uso ativo de cada pessoa da equipe LORSO no sistema, por dia e por cliente.
--    Só o administrador lê. Ninguém grava direto na tabela: o navegador chama
--    registrar_atividade() uma vez por minuto enquanto a pessoa está usando a tela.

alter table public.diagnosticos
  add column if not exists inicio_projeto date,
  add column if not exists fim_previsto date,
  add column if not exists prazo_historico jsonb not null default '[]'::jsonb;

create or replace function public.proteger_modulos() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.modulos is distinct from old.modulos and not public.is_equipe() then
    raise exception 'Só a equipe LORSO pode mudar os módulos do cliente.';
  end if;
  if (new.inicio_projeto is distinct from old.inicio_projeto
      or new.fim_previsto is distinct from old.fim_previsto
      or new.prazo_historico is distinct from old.prazo_historico) and not public.is_equipe() then
    raise exception 'Só a equipe LORSO pode mudar o prazo do projeto.';
  end if;
  return new;
end $$;
revoke execute on function public.proteger_modulos() from anon, authenticated, public;

create table if not exists public.horas_atividade (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  dia date not null,
  diagnostico_id uuid references public.diagnosticos(id) on delete set null,
  minutos integer not null default 0 check (minutos >= 0),
  primeiro timestamptz not null default now(),
  ultimo timestamptz not null default now()
);
create unique index if not exists horas_atividade_unico
  on public.horas_atividade (user_id, dia, (coalesce(diagnostico_id, '00000000-0000-0000-0000-000000000000'::uuid)));
create index if not exists horas_atividade_dia on public.horas_atividade (dia);
create index if not exists horas_atividade_diag on public.horas_atividade (diagnostico_id);

alter table public.horas_atividade enable row level security;
create policy horas_so_admin on public.horas_atividade for select to authenticated
  using ((select public.is_admin()));
revoke insert, update, delete on public.horas_atividade from anon, authenticated;
revoke all on public.horas_atividade from anon;

-- Soma 1 minuto para quem chamou. Só conta equipe LORSO (admin e equipe).
-- No máximo 1 minuto a cada 50 segundos por pessoa, mesmo com várias abas abertas.
create or replace function public.registrar_atividade(p_diag uuid default null, p_dia date default null)
returns void
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  d date := coalesce(p_dia, (now() at time zone 'America/Sao_Paulo')::date);
begin
  if uid is null or not public.is_equipe() then return; end if;
  if abs(d - (now() at time zone 'America/Sao_Paulo')::date) > 1 then
    d := (now() at time zone 'America/Sao_Paulo')::date;
  end if;
  if p_diag is not null and not exists (select 1 from public.diagnosticos where id = p_diag) then
    p_diag := null;
  end if;
  if exists (select 1 from public.horas_atividade
             where user_id = uid and ultimo > now() - interval '50 seconds') then
    return;
  end if;
  insert into public.horas_atividade (user_id, dia, diagnostico_id, minutos)
  values (uid, d, p_diag, 1)
  on conflict (user_id, dia, (coalesce(diagnostico_id, '00000000-0000-0000-0000-000000000000'::uuid)))
  do update set minutos = public.horas_atividade.minutos + 1, ultimo = now();
end $$;
revoke execute on function public.registrar_atividade(uuid, date) from anon, public;
grant execute on function public.registrar_atividade(uuid, date) to authenticated;
