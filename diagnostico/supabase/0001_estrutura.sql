-- Central de Diagnóstico · LORSO Digital
-- Estrutura inicial: perfis, convites, diagnósticos e tudo o que é coletado em cada um.
-- Acesso: só entra quem foi convidado. Equipe LORSO (admin/equipe) vê todos os diagnósticos;
-- o papel "cliente" fica reservado para dar acesso a um diagnóstico específico no futuro.

create extension if not exists pgcrypto;

-- ---------- pessoas ----------
create table public.convites (
  email text primary key check (email = lower(email)),
  nome text,
  papel text not null default 'equipe' check (papel in ('admin','equipe','cliente')),
  funcao text,
  convidado_por uuid,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  nome text,
  papel text not null default 'equipe' check (papel in ('admin','equipe','cliente')),
  funcao text,
  contato text,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- Só quem está em convites consegue criar conta; o perfil nasce com o papel do convite.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare c public.convites;
begin
  select * into c from public.convites where email = lower(new.email);
  if not found then
    raise exception 'Este e-mail não foi convidado para a Central de Diagnóstico.';
  end if;
  insert into public.profiles (id, email, nome, papel, funcao)
  values (new.id, lower(new.email), c.nome, c.papel, c.funcao);
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and papel = 'admin' and ativo);
$$;

create or replace function public.is_equipe() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and papel in ('admin','equipe') and ativo);
$$;

-- ---------- diagnósticos ----------
create table public.diagnosticos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cliente text,
  status text not null default 'em_andamento',
  created_by uuid references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.membros_diagnostico (
  diagnostico_id uuid references public.diagnosticos(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  primary key (diagnostico_id, user_id)
);

create or replace function public.can_access(d uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_equipe()
      or exists (select 1 from public.membros_diagnostico m where m.diagnostico_id = d and m.user_id = auth.uid());
$$;

-- respostas das perguntas fechadas (o banco de perguntas é versionado no código)
create table public.respostas (
  diagnostico_id uuid references public.diagnosticos(id) on delete cascade,
  pergunta_id text not null,
  nivel smallint check (nivel between 1 and 4),
  nota text,
  evidenciada boolean not null default false,
  updated_by uuid default auth.uid(),
  updated_at timestamptz not null default now(),
  primary key (diagnostico_id, pergunta_id)
);

-- campos abertos e numéricos (volumes, KPIs, dados financeiros das UNs, contexto)
create table public.campos (
  diagnostico_id uuid references public.diagnosticos(id) on delete cascade,
  chave text not null,
  valor text,
  updated_by uuid default auth.uid(),
  updated_at timestamptz not null default now(),
  primary key (diagnostico_id, chave)
);

create table public.responsaveis_area (
  diagnostico_id uuid references public.diagnosticos(id) on delete cascade,
  area text not null,
  user_id uuid references public.profiles(id) on delete cascade,
  primary key (diagnostico_id, area)
);

create table public.entrevistas (
  id uuid primary key default gen_random_uuid(),
  diagnostico_id uuid not null references public.diagnosticos(id) on delete cascade,
  area text, nome text, cargo text, departamento text, data date,
  conduzida_por uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create table public.dores (
  id uuid primary key default gen_random_uuid(),
  diagnostico_id uuid not null references public.diagnosticos(id) on delete cascade,
  descricao text not null,
  area text, etapa text, tipo text,
  gravidade smallint check (gravidade between 1 and 3),
  frequencia text, relatado_por text, sistema text, data date,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create table public.sistemas (
  id uuid primary key default gen_random_uuid(),
  diagnostico_id uuid not null references public.diagnosticos(id) on delete cascade,
  nome text, uso text, usuarios text,
  satisfacao smallint check (satisfacao between 1 and 5),
  integra text, custo_mensal text, problemas text,
  created_at timestamptz not null default now()
);

create table public.tarefas (
  id uuid primary key default gen_random_uuid(),
  diagnostico_id uuid not null references public.diagnosticos(id) on delete cascade,
  titulo text, area text,
  responsavel uuid references public.profiles(id) on delete set null,
  prazo date,
  status text not null default 'A fazer' check (status in ('A fazer','Em andamento','Em revisão','Concluída')),
  origem text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.fofa_itens (
  id uuid primary key default gen_random_uuid(),
  diagnostico_id uuid not null references public.diagnosticos(id) on delete cascade,
  chave text not null,
  quadrante text not null check (quadrante in ('f','w','o','a')),
  texto text not null,
  ordem int not null default 0,
  created_at timestamptz not null default now()
);

create table public.indicadores (
  id uuid primary key default gen_random_uuid(),
  diagnostico_id uuid not null references public.diagnosticos(id) on delete cascade,
  nome text, un text, meta text, realizado text,
  created_at timestamptz not null default now()
);

create table public.experimentos (
  id uuid primary key default gen_random_uuid(),
  diagnostico_id uuid not null references public.diagnosticos(id) on delete cascade,
  hipotese text, area text,
  impacto smallint, confianca smallint, facilidade smallint,
  created_at timestamptz not null default now()
);

create index on public.entrevistas(diagnostico_id);
create index on public.dores(diagnostico_id);
create index on public.sistemas(diagnostico_id);
create index on public.tarefas(diagnostico_id);
create index on public.fofa_itens(diagnostico_id);
create index on public.indicadores(diagnostico_id);
create index on public.experimentos(diagnostico_id);
create index on public.tarefas(responsavel);
create index on public.membros_diagnostico(user_id);
create index on public.responsaveis_area(user_id);

-- ---------- RLS ----------
alter table public.convites enable row level security;
alter table public.profiles enable row level security;
alter table public.diagnosticos enable row level security;
alter table public.membros_diagnostico enable row level security;
alter table public.respostas enable row level security;
alter table public.campos enable row level security;
alter table public.responsaveis_area enable row level security;
alter table public.entrevistas enable row level security;
alter table public.dores enable row level security;
alter table public.sistemas enable row level security;
alter table public.tarefas enable row level security;
alter table public.fofa_itens enable row level security;
alter table public.indicadores enable row level security;
alter table public.experimentos enable row level security;

create policy convites_admin on public.convites for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy convites_equipe_le on public.convites for select to authenticated using ((select public.is_equipe()));

create policy profiles_le on public.profiles for select to authenticated using ((select public.is_equipe()) or id = (select auth.uid()));
create policy profiles_proprio on public.profiles for update to authenticated using (id = (select auth.uid()) or (select public.is_admin()))
  with check ((id = (select auth.uid()) and papel = (select p.papel from public.profiles p where p.id = (select auth.uid()))) or (select public.is_admin()));

create policy diag_le on public.diagnosticos for select to authenticated using ((select public.can_access(id)));
create policy diag_cria on public.diagnosticos for insert to authenticated with check ((select public.is_equipe()));
create policy diag_edita on public.diagnosticos for update to authenticated using ((select public.can_access(id))) with check ((select public.can_access(id)));
create policy diag_apaga on public.diagnosticos for delete to authenticated using ((select public.is_admin()));

create policy membros_le on public.membros_diagnostico for select to authenticated using ((select public.can_access(diagnostico_id)));
create policy membros_admin on public.membros_diagnostico for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

do $$
declare t text;
begin
  foreach t in array array['respostas','campos','responsaveis_area','entrevistas','dores','sistemas','tarefas','fofa_itens','indicadores','experimentos'] loop
    execute format('create policy %1$s_acesso on public.%1$s for all to authenticated using ((select public.can_access(diagnostico_id))) with check ((select public.can_access(diagnostico_id)))', t);
  end loop;
end $$;

-- funções de acesso só para usuários logados
revoke execute on function public.is_admin() from anon, public;
revoke execute on function public.is_equipe() from anon, public;
revoke execute on function public.can_access(uuid) from anon, public;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_equipe() to authenticated;
grant execute on function public.can_access(uuid) to authenticated;
revoke execute on function public.handle_new_user() from anon, authenticated, public;

-- tempo real para preenchimento simultâneo
alter publication supabase_realtime add table public.respostas, public.campos, public.responsaveis_area, public.entrevistas, public.dores, public.sistemas, public.tarefas, public.fofa_itens, public.indicadores, public.experimentos, public.diagnosticos;

-- administradores iniciais (Alessandro)
insert into public.convites (email, nome, papel, funcao) values
  ('alecochetti@gmail.com', 'Alessandro Cochetti', 'admin', 'Fundador'),
  ('alessandro@lorsodigital.com.br', 'Alessandro Cochetti', 'admin', 'Fundador')
on conflict (email) do nothing;
