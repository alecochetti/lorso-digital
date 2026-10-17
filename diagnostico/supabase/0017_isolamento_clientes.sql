-- Clientes apartados: cada pessoa da equipe LORSO só lê e altera os clientes a que foi vinculada.
-- Administrador continua vendo tudo. Nada é apagado: as regras existentes ganham restrições por cima.

-- 1. Acesso a um diagnóstico: administrador, ou quem é membro dele (equipe ou cliente)
create or replace function public.can_access(d uuid)
 returns boolean language sql stable security definer set search_path to 'public' as $$
  select public.is_admin()
      or exists (select 1 from public.membros_diagnostico m where m.diagnostico_id = d and m.user_id = auth.uid());
$$;

-- 2. Quem cria um diagnóstico vira membro dele (senão a equipe criaria e não conseguiria abrir)
create or replace function public.membro_criador()
 returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if auth.uid() is not null then
    insert into public.membros_diagnostico (diagnostico_id, user_id) values (new.id, auth.uid()) on conflict do nothing;
  end if;
  return new;
end $$;
create trigger diagnosticos_membro_criador after insert on public.diagnosticos for each row execute function public.membro_criador();

-- 3. Tarefas e projetos internos: do cliente só se tiver acesso a ele; avulsas só de quem criou ou é responsável
create or replace function public.pode_interna(d uuid, pj uuid, cb uuid, resp uuid[], r uuid)
 returns boolean language sql stable security definer set search_path to 'public' as $$
  select public.is_admin()
      or (d is not null and public.can_access(d))
      or (d is null and pj is not null and exists (select 1 from public.projetos p where p.id = pj and p.diagnostico_id is not null and public.can_access(p.diagnostico_id)))
      or (d is null and not exists (select 1 from public.projetos p where p.id = pj and p.diagnostico_id is not null)
          and (cb = auth.uid() or auth.uid() = any(coalesce(resp, '{}')) or r = auth.uid()));
$$;
create policy tarefas_internas_cliente on public.tarefas_internas as restrictive for all to authenticated
  using ((select public.pode_interna(diagnostico_id, projeto_id, created_by, responsaveis, responsavel)))
  with check ((select public.pode_interna(diagnostico_id, projeto_id, coalesce(created_by, auth.uid()), responsaveis, responsavel)));
create policy projetos_cliente on public.projetos as restrictive for all to authenticated
  using ((select public.pode_interna(diagnostico_id, null, created_by, null, responsavel)))
  with check ((select public.pode_interna(diagnostico_id, null, coalesce(created_by, auth.uid()), null, responsavel)));

-- 4. Perfis: a equipe vê a equipe e as pessoas dos clientes que atende, nunca de outros clientes
create policy profiles_cliente on public.profiles as restrictive for select to authenticated
  using ((select public.is_admin()) or id = (select auth.uid()) or papel in ('admin','equipe')
         or exists (select 1 from public.membros_diagnostico m where m.user_id = profiles.id and public.can_access(m.diagnostico_id)));

-- 5. Convites: a equipe só vê convites da equipe e dos clientes que atende
create policy convites_cliente on public.convites as restrictive for select to authenticated
  using ((select public.is_admin()) or papel in ('admin','equipe')
         or (diagnostico_id is not null and (select public.can_access(convites.diagnostico_id))));
