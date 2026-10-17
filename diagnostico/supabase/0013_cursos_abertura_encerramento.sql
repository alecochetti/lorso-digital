-- Datas de cada curso ou turma: abertura e encerramento (essencial para curta duração e extensão).
alter table public.cursos add column if not exists abertura text, add column if not exists encerramento text;
