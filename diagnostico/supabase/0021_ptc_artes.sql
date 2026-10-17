-- PTC (plano tático de comunicação): artes guardadas por cliente no Storage.
-- Caminho: <id do cliente>/<id da peça>/<arquivo>. Vê quem acessa o cliente; envia e apaga só quem edita.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ptc', 'ptc', false, 52428800, array['image/png','image/jpeg','image/webp','image/gif','video/mp4','video/quicktime','application/pdf'])
on conflict (id) do update set file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Cliente dono do arquivo, a partir da primeira pasta do caminho (nulo se não for um id válido)
create or replace function public.ptc_cliente(nome text)
 returns uuid language sql immutable set search_path to 'public' as $$
  select case when split_part(nome, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
              then split_part(nome, '/', 1)::uuid end;
$$;

create policy ptc_ler on storage.objects for select to authenticated
  using (bucket_id = 'ptc' and (select public.can_access(public.ptc_cliente(name))));
create policy ptc_enviar on storage.objects for insert to authenticated
  with check (bucket_id = 'ptc' and (select public.can_write(public.ptc_cliente(name))));
create policy ptc_trocar on storage.objects for update to authenticated
  using (bucket_id = 'ptc' and (select public.can_write(public.ptc_cliente(name))))
  with check (bucket_id = 'ptc' and (select public.can_write(public.ptc_cliente(name))));
create policy ptc_apagar on storage.objects for delete to authenticated
  using (bucket_id = 'ptc' and (select public.can_write(public.ptc_cliente(name))));
