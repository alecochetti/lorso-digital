-- Resposta 0 = "Não se aplica / não sei": registrada, mas fora da nota.
alter table public.respostas drop constraint if exists respostas_nivel_check;
alter table public.respostas add constraint respostas_nivel_check check (nivel between 0 and 4);
