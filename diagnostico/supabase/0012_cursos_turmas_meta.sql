-- Números por curso: quantas turmas e a meta de captação do curso.
-- "vagas" continua sendo a capacidade em alunos (a tela chama de Alunos).
alter table public.cursos add column if not exists turmas text, add column if not exists meta text;
