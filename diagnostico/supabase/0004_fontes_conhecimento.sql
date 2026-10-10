-- Fontes da base de conhecimento do cliente: textos do NotebookLM, arquivos, páginas do site.
-- Ficam no diagnóstico do cliente e seguem a mesma regra de acesso dele.
create table public.fontes (
  id uuid primary key default gen_random_uuid(),
  diagnostico_id uuid not null references public.diagnosticos(id) on delete cascade,
  tipo text not null default 'texto' check (tipo in ('notebooklm','site','arquivo','texto')),
  titulo text,
  url text,
  conteudo text,
  dados jsonb,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index on public.fontes(diagnostico_id);
alter table public.fontes enable row level security;
create policy fontes_acesso on public.fontes for all to authenticated
  using ((select public.can_access(diagnostico_id))) with check ((select public.can_access(diagnostico_id)));
alter publication supabase_realtime add table public.fontes;
