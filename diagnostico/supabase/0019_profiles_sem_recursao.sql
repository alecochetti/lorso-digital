-- Política de edição de perfis sem recursão (a conferência do papel e do ativo passa por funções seguras)
create or replace function public.meu_papel() returns text language sql stable security definer set search_path to 'public' as $$ select papel from public.profiles where id = auth.uid(); $$;
create or replace function public.meu_ativo() returns boolean language sql stable security definer set search_path to 'public' as $$ select ativo from public.profiles where id = auth.uid(); $$;
alter policy profiles_proprio on public.profiles using ((id = (select auth.uid())) or (select public.is_admin())) with check (((id = (select auth.uid())) and (papel = (select public.meu_papel())) and (ativo = (select public.meu_ativo()))) or (select public.is_admin()));
