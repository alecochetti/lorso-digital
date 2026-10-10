-- Módulos da Central (DRE, lançamento de curso): um documento por cliente e módulo.
-- E quais módulos cada cliente pode usar. Só equipe LORSO muda essa lista.
create table public.modulos (
  diagnostico_id uuid not null references public.diagnosticos(id) on delete cascade,
  modulo text not null check (modulo in ('dre','lancamento')),
  dados jsonb not null default '{}'::jsonb,
  updated_by uuid default auth.uid(),
  updated_at timestamptz not null default now(),
  primary key (diagnostico_id, modulo)
);
alter table public.modulos enable row level security;
create policy modulos_acesso on public.modulos for all to authenticated
  using ((select public.can_access(diagnostico_id))) with check ((select public.can_access(diagnostico_id)));
alter publication supabase_realtime add table public.modulos;

alter table public.diagnosticos add column modulos text[] not null default array['diagnostico','dre','lancamento'];

create or replace function public.proteger_modulos() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.modulos is distinct from old.modulos and not public.is_equipe() then
    raise exception 'Só a equipe LORSO pode mudar os módulos do cliente.';
  end if;
  return new;
end $$;
revoke execute on function public.proteger_modulos() from anon, authenticated, public;
create trigger diagnosticos_modulos before update on public.diagnosticos
  for each row execute function public.proteger_modulos();
