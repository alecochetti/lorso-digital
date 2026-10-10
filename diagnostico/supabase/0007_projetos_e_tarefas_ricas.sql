-- Projetos da equipe LORSO e tarefas mais completas (vários responsáveis, início, subtarefas, comentários).
create table public.projetos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  area text,
  diagnostico_id uuid references public.diagnosticos(id) on delete set null,
  responsavel uuid references public.profiles(id) on delete set null,
  inicio date,
  fim date,
  status text not null default 'Em andamento' check (status in ('Planejado','Em andamento','Pausado','Concluído')),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
alter table public.projetos enable row level security;
create policy projetos_equipe on public.projetos for all to authenticated
  using ((select public.is_equipe())) with check ((select public.is_equipe()));
alter publication supabase_realtime add table public.projetos;

alter table public.tarefas_internas
  add column responsaveis uuid[] not null default '{}',
  add column inicio date,
  add column subtarefas jsonb not null default '[]'::jsonb,
  add column comentarios jsonb not null default '[]'::jsonb,
  add column area_eq text,
  add column projeto_id uuid references public.projetos(id) on delete set null,
  add column concluida_em timestamptz;
update public.tarefas_internas set responsaveis = array[responsavel] where responsavel is not null and responsaveis = '{}';
