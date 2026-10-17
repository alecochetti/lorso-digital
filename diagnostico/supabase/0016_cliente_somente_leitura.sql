-- Cliente em modo leitura (por diagnóstico): vê tudo, não grava nada. A equipe LORSO continua gravando.
-- Feito com políticas restritivas, somadas às de acesso que já existem.
alter table public.diagnosticos add column if not exists cliente_leitura boolean not null default false;
create or replace function public.can_write(d uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_equipe() or not coalesce((select x.cliente_leitura from public.diagnosticos x where x.id = d), false);
$$;
revoke execute on function public.can_write(uuid) from anon, public;
grant execute on function public.can_write(uuid) to authenticated;
do $$
declare t text;
begin
  foreach t in array array['campos','cursos','dores','entrevistas','experimentos','fofa_itens','fontes','indicadores','modulos','pessoas','responsaveis_area','respostas','sistemas','tarefas'] loop
    execute format('create policy %1$s_so_leitura_ins on public.%1$s as restrictive for insert to authenticated with check ((select public.can_write(diagnostico_id)))', t);
    execute format('create policy %1$s_so_leitura_upd on public.%1$s as restrictive for update to authenticated using ((select public.can_write(diagnostico_id))) with check ((select public.can_write(diagnostico_id)))', t);
    execute format('create policy %1$s_so_leitura_del on public.%1$s as restrictive for delete to authenticated using ((select public.can_write(diagnostico_id)))', t);
  end loop;
end $$;
create policy diag_so_leitura_upd on public.diagnosticos as restrictive for update to authenticated
  using ((select public.can_write(id))) with check ((select public.can_write(id)));
-- proteger_modulos(): só a equipe LORSO muda pdi_reitoria e cliente_leitura.
-- FECAP marcada como cliente_leitura = true em 17/10/2026.
