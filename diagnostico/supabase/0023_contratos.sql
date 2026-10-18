-- Módulo Contratos: minuta, envio para assinatura eletrônica e registro de evidências.
-- Regras de segurança:
--  * Só administrador LORSO lê ou altera contratos (eles trazem honorários). Equipe e clientes não veem nada.
--  * Quem assina não tem conta: tudo do signatário passa pelas Edge Functions (chave de serviço, no servidor).
--  * Token do link e código por e-mail ficam só como hash, em colunas que nem o administrador consegue ler.
--  * Versão enviada para assinatura e registro de evidências são imutáveis (o banco recusa edição e exclusão).
--  * Cada evidência carrega o hash da anterior: qualquer alteração por fora quebra a corrente e fica visível.

create extension if not exists pgcrypto with schema extensions;

-- 1. Contratos ---------------------------------------------------------------
create table public.contratos (
  id uuid primary key default gen_random_uuid(),
  diagnostico_id uuid references public.diagnosticos(id) on delete restrict,
  titulo text not null check (char_length(titulo) between 3 and 200),
  status text not null default 'rascunho'
    check (status in ('rascunho','revisao','assinatura','concluido','cancelado')),
  dados jsonb not null default '{}'::jsonb,
  conteudo text not null default '' check (char_length(conteudo) <= 200000),
  copia_emails text[] not null default '{}',
  prazo_dias smallint not null default 7 check (prazo_dias between 1 and 60),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index contratos_diagnostico_idx on public.contratos(diagnostico_id);

-- 2. Versões travadas (o texto exato que foi assinado) -------------------------
create table public.contrato_versoes (
  id uuid primary key default gen_random_uuid(),
  contrato_id uuid not null references public.contratos(id) on delete restrict,
  numero int not null,
  conteudo text not null,
  hash_sha256 text not null check (hash_sha256 ~ '^[0-9a-f]{64}$'),
  travada_por uuid references auth.users(id) on delete set null,
  travada_em timestamptz not null default now(),
  unique (contrato_id, numero)
);

-- 3. Signatários -------------------------------------------------------------
create table public.contrato_signatarios (
  id uuid primary key default gen_random_uuid(),
  contrato_id uuid not null references public.contratos(id) on delete restrict,
  ordem smallint not null default 1 check (ordem between 1 and 20),
  nome text not null check (char_length(nome) between 2 and 160),
  papel text not null default '' check (char_length(papel) <= 160),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254),
  status text not null default 'pendente'
    check (status in ('pendente','enviado','visualizado','assinado')),
  versao_id uuid references public.contrato_versoes(id) on delete restrict,
  cpf text check (cpf is null or cpf ~ '^[0-9]{11}$'),
  assinatura_nome text,
  assinatura_ip text,
  assinatura_ua text,
  assinado_em timestamptz,
  -- segredos: só a função no servidor lê e grava
  token_hash text unique,
  token_expira timestamptz,
  otp_hash text,
  otp_expira timestamptz,
  otp_tentativas smallint not null default 0,
  otp_ultimo_envio timestamptz,
  created_at timestamptz not null default now()
);
create index contrato_signatarios_contrato_idx on public.contrato_signatarios(contrato_id);

-- 4. Registro de evidências (só cresce) ----------------------------------------
create table public.contrato_eventos (
  id bigint generated always as identity primary key,
  contrato_id uuid not null references public.contratos(id) on delete restrict,
  signatario_id uuid references public.contrato_signatarios(id) on delete restrict,
  tipo text not null check (char_length(tipo) <= 60),
  detalhe jsonb not null default '{}'::jsonb,
  ip text,
  user_agent text,
  criado_em timestamptz not null default now(),
  hash_anterior text,
  hash text
);
create index contrato_eventos_contrato_idx on public.contrato_eventos(contrato_id, id);

-- 5. Gatilhos ------------------------------------------------------------------
create or replace function public.contratos_guarda()
 returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  -- depois de enviado, texto, dados e signatários não mudam: só o status pode andar
  if old.status in ('assinatura','concluido','cancelado')
     and (new.conteudo is distinct from old.conteudo or new.dados is distinct from old.dados
          or new.copia_emails is distinct from old.copia_emails or new.diagnostico_id is distinct from old.diagnostico_id) then
    raise exception 'Contrato já enviado para assinatura: o texto não pode mais ser alterado.';
  end if;
  if old.status in ('concluido','cancelado') and new.status <> old.status then
    raise exception 'Contrato concluído ou cancelado não muda de situação.';
  end if;
  -- administrador não marca assinatura nem conclusão à mão: isso só acontece pelo servidor
  if (select auth.role()) <> 'service_role' and new.status in ('assinatura','concluido') and new.status <> old.status then
    raise exception 'Envio e conclusão só acontecem pelo fluxo de assinatura.';
  end if;
  return new;
end $$;
create trigger contratos_guarda before update on public.contratos
  for each row execute function public.contratos_guarda();

create or replace function public.contrato_imutavel()
 returns trigger language plpgsql set search_path = public as $$
begin
  raise exception 'Registro imutável: % não aceita %.', tg_table_name, lower(tg_op);
end $$;
create trigger contrato_versoes_imutavel before update or delete on public.contrato_versoes
  for each row execute function public.contrato_imutavel();
create trigger contrato_eventos_imutavel before update or delete on public.contrato_eventos
  for each row execute function public.contrato_imutavel();

-- signatários só mudam (pelo administrador) enquanto o contrato não foi enviado
create or replace function public.contrato_signatarios_guarda()
 returns trigger language plpgsql set search_path = public as $$
declare st text;
begin
  if (select auth.role()) = 'service_role' then
    return coalesce(new, old);
  end if;
  select status into st from public.contratos where id = coalesce(new.contrato_id, old.contrato_id);
  if st not in ('rascunho','revisao') then
    raise exception 'Contrato já enviado: os signatários não podem mais ser alterados.';
  end if;
  if tg_op = 'UPDATE' and new.contrato_id <> old.contrato_id then
    raise exception 'Signatário não troca de contrato.';
  end if;
  return coalesce(new, old);
end $$;
create trigger contrato_signatarios_guarda before insert or update or delete on public.contrato_signatarios
  for each row execute function public.contrato_signatarios_guarda();

-- corrente de hashes das evidências (serializada por contrato)
create or replace function public.contrato_eventos_corrente()
 returns trigger language plpgsql set search_path = public, extensions as $$
declare ant text;
begin
  perform pg_advisory_xact_lock(hashtextextended(new.contrato_id::text, 0));
  select e.hash into ant from public.contrato_eventos e
   where e.contrato_id = new.contrato_id order by e.id desc limit 1;
  new.criado_em := now();
  new.hash_anterior := ant;
  new.hash := encode(extensions.digest(
      coalesce(ant,'') || '|' || new.contrato_id::text || '|' || coalesce(new.signatario_id::text,'') || '|' ||
      new.tipo || '|' || new.detalhe::text || '|' || coalesce(new.ip,'') || '|' || coalesce(new.user_agent,'') || '|' ||
      to_char(new.criado_em at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
    'sha256'), 'hex');
  return new;
end $$;
create trigger contrato_eventos_corrente before insert on public.contrato_eventos
  for each row execute function public.contrato_eventos_corrente();

-- 6. Permissões ----------------------------------------------------------------
alter table public.contratos enable row level security;
alter table public.contrato_versoes enable row level security;
alter table public.contrato_signatarios enable row level security;
alter table public.contrato_eventos enable row level security;

revoke all on public.contratos, public.contrato_versoes, public.contrato_signatarios, public.contrato_eventos from anon, authenticated;

-- contratos: administrador lê, cria e edita (o gatilho trava depois do envio); nunca apaga
grant select, insert, update on public.contratos to authenticated;
create policy contratos_admin_sel on public.contratos for select to authenticated using ((select public.is_admin()));
create policy contratos_admin_ins on public.contratos for insert to authenticated with check ((select public.is_admin()));
create policy contratos_admin_upd on public.contratos for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- versões e evidências: administrador só lê; quem grava é o servidor
grant select on public.contrato_versoes, public.contrato_eventos to authenticated;
create policy contrato_versoes_admin_sel on public.contrato_versoes for select to authenticated using ((select public.is_admin()));
create policy contrato_eventos_admin_sel on public.contrato_eventos for select to authenticated using ((select public.is_admin()));

-- signatários: administrador vê os dados públicos (nunca token nem código) e edita só nome, papel, e-mail e ordem
grant select (id, contrato_id, ordem, nome, papel, email, status, versao_id, cpf, assinatura_nome, assinatura_ip,
              assinatura_ua, assinado_em, token_expira, created_at) on public.contrato_signatarios to authenticated;
grant insert (contrato_id, ordem, nome, papel, email) on public.contrato_signatarios to authenticated;
grant update (ordem, nome, papel, email) on public.contrato_signatarios to authenticated;
grant delete on public.contrato_signatarios to authenticated;
create policy contrato_signatarios_admin_sel on public.contrato_signatarios for select to authenticated using ((select public.is_admin()));
create policy contrato_signatarios_admin_ins on public.contrato_signatarios for insert to authenticated with check ((select public.is_admin()));
create policy contrato_signatarios_admin_upd on public.contrato_signatarios for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy contrato_signatarios_admin_del on public.contrato_signatarios for delete to authenticated using ((select public.is_admin()));

-- funções de gatilho não são chamáveis pela API
revoke execute on function public.contratos_guarda(), public.contrato_imutavel(),
  public.contrato_signatarios_guarda(), public.contrato_eventos_corrente() from public, anon, authenticated;
