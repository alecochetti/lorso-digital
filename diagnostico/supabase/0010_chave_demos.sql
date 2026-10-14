-- Demonstrações do /admin (financeiro-loja, lancamento-curso, lancamento-perpetuo):
-- a chave que abre as páginas cifradas fica em app_recursos como 'chave_demos'
-- e só admin ou equipe leem. Os demais recursos continuam visíveis a quem está logado.
drop policy if exists app_recursos_le on public.app_recursos;
create policy app_recursos_le on public.app_recursos for select to authenticated
  using (nome <> 'chave_demos' or (select public.is_equipe()));
-- O valor da chave é gravado por SQL (não fica no repositório).
