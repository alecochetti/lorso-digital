-- PDI visível para a reitoria em modo leitura, quando a LORSO liberar (por diagnóstico).
alter table public.diagnosticos add column if not exists pdi_reitoria boolean not null default false;
create policy avaliacoes_reitoria_le on public.avaliacoes for select to authenticated
  using ((select public.can_access(diagnostico_id)) and exists (select 1 from public.diagnosticos d where d.id = diagnostico_id and d.pdi_reitoria));
-- proteger_modulos(): só a equipe LORSO muda pdi_reitoria (ver o banco para a versão completa da função)
