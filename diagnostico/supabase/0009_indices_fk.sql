-- Índices nas chaves estrangeiras apontadas pelo assistente de desempenho do Supabase.
create index if not exists diagnosticos_created_by_idx on public.diagnosticos(created_by);
create index if not exists projetos_diagnostico_id_idx on public.projetos(diagnostico_id);
create index if not exists projetos_responsavel_idx on public.projetos(responsavel);
create index if not exists tarefas_internas_projeto_id_idx on public.tarefas_internas(projeto_id);
