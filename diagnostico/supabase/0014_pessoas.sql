-- Cadastro das pessoas ouvidas no diagnóstico: um registro por pessoa, com foto,
-- cargo, departamento, jornada e as frentes de captação em que atua.
-- Cada entrevista por área aponta para a pessoa (pessoa_id).
create table if not exists public.pessoas (
  id uuid primary key default gen_random_uuid(),
  diagnostico_id uuid not null references public.diagnosticos(id) on delete cascade,
  nome text, cargo text, departamento text, foto text,
  email text, telefone text,
  regime text, jornada_horas text, periodo text,
  frentes text, tempo_casa text, gestor text,
  marketing boolean not null default false,
  obs text,
  created_at timestamptz not null default now()
);
create index if not exists pessoas_diag on public.pessoas (diagnostico_id);
alter table public.pessoas enable row level security;
create policy pessoas_acesso on public.pessoas for all to authenticated
  using ((select public.can_access(diagnostico_id))) with check ((select public.can_access(diagnostico_id)));
revoke all on public.pessoas from anon;
alter publication supabase_realtime add table public.pessoas;
-- sem chave estrangeira: o app grava pessoas e entrevistas em paralelo
alter table public.entrevistas add column if not exists pessoa_id uuid;
create index if not exists entrevistas_pessoa on public.entrevistas (pessoa_id);
