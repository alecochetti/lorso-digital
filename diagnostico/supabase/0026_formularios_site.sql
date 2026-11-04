-- Formulários do site (candidaturas, banco de talentos e pedidos de diagnóstico).
-- Tudo é gravado pela Edge Function formulario-site com a chave de serviço.
-- Visitantes não leem nem gravam nada direto; só administradores LORSO leem.

create table if not exists public.formularios_site (
  id uuid primary key default gen_random_uuid(),
  criado_em timestamptz not null default now(),
  tipo text not null check (tipo in ('candidatura', 'banco_talentos', 'diagnostico')),
  vaga text,
  nome text not null,
  email text not null,
  telefone text,
  dados jsonb not null default '{}'::jsonb,      -- todos os campos do formulário, na ordem
  fit integer,                                    -- nota da triagem (0 a 100)
  triagem text,                                   -- Alto fit, Médio fit ou Não atende
  curriculo_path text,                            -- caminho no bucket "curriculos"
  status text not null default 'novo' check (status in ('novo', 'em_analise', 'entrevista', 'aprovado', 'reprovado', 'arquivado')),
  email_interno_ok boolean not null default false,
  email_resposta_ok boolean not null default false,
  ip text,
  user_agent text
);

create index if not exists formularios_site_tipo_data on public.formularios_site (tipo, criado_em desc);
create index if not exists formularios_site_ip_data on public.formularios_site (ip, criado_em desc);

alter table public.formularios_site enable row level security;

create policy formularios_site_admin_ler on public.formularios_site
  for select to authenticated using (public.is_admin());

create policy formularios_site_admin_atualizar on public.formularios_site
  for update to authenticated using (public.is_admin()) with check (public.is_admin());


-- Currículos: bucket privado, até 5 MB, PDF ou Word
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('curriculos', 'curriculos', false, 5242880, array[
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/octet-stream'
])
on conflict (id) do nothing;

create policy curriculos_admin_ler on storage.objects
  for select to authenticated using (bucket_id = 'curriculos' and public.is_admin());
