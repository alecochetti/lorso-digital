-- Logo do cliente (imagem pequena em data URL) para o painel e o Tarefas LORSO
alter table public.diagnosticos add column if not exists logo text;
