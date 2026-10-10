-- PDI do marketing: entrevistado marcado como equipe de marketing e avaliação individual.
-- A avaliação é só da equipe LORSO: o cliente nunca lê nem grava (nem a reitoria, nem o marketing avaliado).
alter table public.entrevistas add column if not exists marketing boolean not null default false;

create table if not exists public.avaliacoes (
  diagnostico_id uuid not null references public.diagnosticos(id) on delete cascade,
  pessoa text not null,
  dados jsonb not null default '{}'::jsonb,
  updated_by uuid default auth.uid(),
  updated_at timestamptz not null default now(),
  primary key (diagnostico_id, pessoa)
);
alter table public.avaliacoes enable row level security;
create policy avaliacoes_so_equipe on public.avaliacoes for all to authenticated
  using ((select public.is_equipe()) and (select public.can_access(diagnostico_id)))
  with check ((select public.is_equipe()) and (select public.can_access(diagnostico_id)));
revoke all on public.avaliacoes from anon;
