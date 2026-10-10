-- Base de conhecimento (cursos, preços e vagas) e matriz de priorização interna.
create table public.cursos (
  id uuid primary key default gen_random_uuid(),
  diagnostico_id uuid not null references public.diagnosticos(id) on delete cascade,
  un text, nome text, modalidade text, turno text,
  preco text, vagas text, matriculados text,
  status text not null default 'Vigente' check (status in ('Vigente','Lançamento','Descontinuado')),
  lancamento text, obs text,
  created_at timestamptz not null default now()
);
create index on public.cursos(diagnostico_id);
alter table public.cursos enable row level security;
create policy cursos_acesso on public.cursos for all to authenticated
  using ((select public.can_access(diagnostico_id))) with check ((select public.can_access(diagnostico_id)));

-- Iniciativas priorizadas: só equipe LORSO e administradores (nunca papel cliente).
create table public.iniciativas (
  id uuid primary key default gen_random_uuid(),
  diagnostico_id uuid not null references public.diagnosticos(id) on delete cascade,
  titulo text, bloco text, area text,
  horizonte text check (horizonte in ('Curto','Médio','Longo')),
  impacto smallint check (impacto between 1 and 5),
  esforco smallint check (esforco between 1 and 5),
  risco smallint check (risco between 1 and 5),
  dependencias text, alinhamento text,
  recomendacao text check (recomendacao in ('Fazer agora','Próximo','Não agora')),
  motivo text, indicador text, ordem int not null default 0,
  created_at timestamptz not null default now()
);
create index on public.iniciativas(diagnostico_id);
alter table public.iniciativas enable row level security;
create policy iniciativas_equipe on public.iniciativas for all to authenticated
  using ((select public.is_equipe())) with check ((select public.is_equipe()));

alter publication supabase_realtime add table public.cursos, public.iniciativas;
