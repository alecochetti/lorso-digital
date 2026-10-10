-- Tarefas internas da LORSO: o kanban da equipe, fora do contexto do cliente.
-- Podem estar ligadas a um diagnóstico (ex.: coleta de uma área) ou ser só internas.
-- Só equipe LORSO e administradores veem; o papel "cliente" nunca acessa.
create table public.tarefas_internas (
  id uuid primary key default gen_random_uuid(),
  titulo text,
  descricao text,
  responsavel uuid references public.profiles(id) on delete set null,
  diagnostico_id uuid references public.diagnosticos(id) on delete cascade,
  area text,
  prazo date,
  prioridade text not null default 'Média' check (prioridade in ('Alta','Média','Baixa')),
  status text not null default 'A fazer' check (status in ('A fazer','Em andamento','Em revisão','Concluída')),
  origem text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.tarefas_internas(responsavel);
create index on public.tarefas_internas(diagnostico_id);
alter table public.tarefas_internas enable row level security;
create policy tarefas_internas_equipe on public.tarefas_internas for all to authenticated
  using ((select public.is_equipe())) with check ((select public.is_equipe()));
alter publication supabase_realtime add table public.tarefas_internas;
