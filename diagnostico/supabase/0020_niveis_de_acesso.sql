-- Níveis de acesso por cliente para a equipe LORSO: Editor ou Visualização.
-- Convite que já leva vários clientes. Pessoa desativada perde o acesso aos clientes.
-- Iniciativas (priorização interna) e PDI passam a respeitar o cliente e o nível.

alter table public.membros_diagnostico add column if not exists nivel text not null default 'editor';
alter table public.membros_diagnostico add constraint membros_nivel_valido check (nivel in ('editor','leitura'));
alter table public.convites add column if not exists acessos jsonb not null default '[]'::jsonb;

-- Acesso: administrador, ou membro ATIVO do diagnóstico
create or replace function public.can_access(d uuid)
 returns boolean language sql stable security definer set search_path to 'public' as $$
  select public.is_admin()
      or exists (select 1 from public.membros_diagnostico m join public.profiles p on p.id = m.user_id
                 where m.diagnostico_id = d and m.user_id = auth.uid() and p.ativo);
$$;

-- Escrita: administrador, ou membro ativo com nível Editor (cliente continua sujeito ao modo leitura do diagnóstico)
create or replace function public.can_write(d uuid)
 returns boolean language sql stable security definer set search_path to 'public' as $$
  select public.is_admin()
      or (exists (select 1 from public.membros_diagnostico m join public.profiles p on p.id = m.user_id
                  where m.diagnostico_id = d and m.user_id = auth.uid() and p.ativo and m.nivel = 'editor')
          and (public.is_equipe() or not coalesce((select x.cliente_leitura from public.diagnosticos x where x.id = d), false)));
$$;

-- Tarefas e projetos internos: ler como antes; gravar só com nível Editor no cliente
create or replace function public.pode_interna_w(d uuid, pj uuid, cb uuid, resp uuid[], r uuid)
 returns boolean language sql stable security definer set search_path to 'public' as $$
  select public.is_admin()
      or (d is not null and public.can_write(d))
      or (d is null and pj is not null and exists (select 1 from public.projetos p where p.id = pj and p.diagnostico_id is not null and public.can_write(p.diagnostico_id)))
      or (d is null and not exists (select 1 from public.projetos p where p.id = pj and p.diagnostico_id is not null)
          and (cb = auth.uid() or auth.uid() = any(coalesce(resp, '{}')) or r = auth.uid()));
$$;
alter policy tarefas_internas_cliente on public.tarefas_internas
  with check ((select public.pode_interna_w(diagnostico_id, projeto_id, coalesce(created_by, auth.uid()), responsaveis, responsavel)));
alter policy projetos_cliente on public.projetos
  with check ((select public.pode_interna_w(diagnostico_id, null, coalesce(created_by, auth.uid()), null, responsavel)));

-- Iniciativas: só do cliente que a pessoa atende; gravar só Editor
create policy iniciativas_cliente on public.iniciativas as restrictive for all to authenticated
  using ((select public.can_access(iniciativas.diagnostico_id)))
  with check ((select public.can_write(iniciativas.diagnostico_id)));

-- PDI: gravar só Editor
create policy avaliacoes_escrita_ins on public.avaliacoes as restrictive for insert to authenticated with check ((select public.can_write(avaliacoes.diagnostico_id)));
create policy avaliacoes_escrita_upd on public.avaliacoes as restrictive for update to authenticated using ((select public.can_write(avaliacoes.diagnostico_id))) with check ((select public.can_write(avaliacoes.diagnostico_id)));
create policy avaliacoes_escrita_del on public.avaliacoes as restrictive for delete to authenticated using ((select public.can_write(avaliacoes.diagnostico_id)));

-- Primeiro acesso: cria o perfil e todos os vínculos do convite
create or replace function public.handle_new_user()
 returns trigger language plpgsql security definer set search_path to 'public' as $$
declare c public.convites; a jsonb;
begin
  select * into c from public.convites where email = lower(new.email);
  if not found then
    raise exception 'Este e-mail não foi convidado para a Central de Diagnóstico.';
  end if;
  insert into public.profiles (id, email, nome, papel, funcao)
  values (new.id, lower(new.email), c.nome, c.papel, c.funcao);
  if c.diagnostico_id is not null then
    insert into public.membros_diagnostico (diagnostico_id, user_id) values (c.diagnostico_id, new.id) on conflict do nothing;
  end if;
  for a in select * from jsonb_array_elements(coalesce(c.acessos, '[]'::jsonb)) loop
    if (a->>'d') is not null then
      insert into public.membros_diagnostico (diagnostico_id, user_id, nivel)
      values ((a->>'d')::uuid, new.id, case when a->>'n' = 'leitura' then 'leitura' else 'editor' end)
      on conflict (diagnostico_id, user_id) do update set nivel = excluded.nivel;
    end if;
  end loop;
  return new;
end $$;

-- O cliente é o projeto Lilith; Ariana é a colaboradora do cliente dentro dele
update public.diagnosticos set nome = 'Lilith' where id = '102a6251-76d3-4127-8d1d-2946106db1f3';
