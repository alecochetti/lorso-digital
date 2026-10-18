-- A tabela modulos só aceitava 'dre' e 'lancamento': os salvamentos do PTC eram recusados.
alter table public.modulos drop constraint modulos_modulo_check;
alter table public.modulos add constraint modulos_modulo_check check (modulo in ('dre','lancamento','ptc'));
