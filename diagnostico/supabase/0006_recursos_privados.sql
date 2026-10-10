-- Recursos privados da Central (ex.: o app de lançamento de curso).
-- Ficam no banco, não no site público: só quem está logado carrega.
create table public.app_recursos (
  nome text primary key,
  conteudo text not null,
  updated_at timestamptz not null default now()
);
alter table public.app_recursos enable row level security;
create policy app_recursos_le on public.app_recursos for select to authenticated using (true);
-- O conteúdo do módulo 'lancamento' é carregado por SQL (não fica no repositório).
