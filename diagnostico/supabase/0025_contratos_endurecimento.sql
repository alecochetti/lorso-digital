-- Endurecimento do módulo Contratos (achados da revisão de segurança).
--  * Código por e-mail: emissão e conferência numa só operação atômica, com teto vitalício por link.
--  * Contrato em assinatura não volta para rascunho; contrato não nasce travado nem com dono trocado.
--  * Corrente de evidências com sequência própria por contrato (não forka com eventos simultâneos).
--  * CPF esperado por signatário, conferido na assinatura.

alter table public.contrato_signatarios
  add column if not exists cpf_esperado text check (cpf_esperado is null or cpf_esperado ~ '^[0-9]{11}$'),
  add column if not exists otp_total smallint not null default 0,
  add column if not exists codigos_janela timestamptz,
  add column if not exists codigos_qtd smallint not null default 0,
  add column if not exists aberto_em timestamptz;
grant select (cpf_esperado), insert (cpf_esperado), update (cpf_esperado) on public.contrato_signatarios to authenticated;

alter table public.contrato_eventos add column if not exists seq int;
create unique index if not exists contrato_eventos_seq_uq on public.contrato_eventos(contrato_id, seq);

-- corrente: sequência e hash calculados dentro da trava do contrato
create or replace function public.contrato_eventos_corrente()
 returns trigger language plpgsql set search_path = public, extensions as $$
declare ant text; ant_seq int;
begin
  perform pg_advisory_xact_lock(hashtextextended(new.contrato_id::text, 0));
  select e.hash, e.seq into ant, ant_seq from public.contrato_eventos e
   where e.contrato_id = new.contrato_id order by e.seq desc nulls last, e.id desc limit 1;
  new.seq := coalesce(ant_seq, 0) + 1;
  new.criado_em := now();
  new.hash_anterior := ant;
  new.hash := encode(extensions.digest(
      new.seq::text || '|' || coalesce(ant,'') || '|' || new.contrato_id::text || '|' || coalesce(new.signatario_id::text,'') || '|' ||
      new.tipo || '|' || new.detalhe::text || '|' || coalesce(new.ip,'') || '|' || coalesce(new.user_agent,'') || '|' ||
      to_char(new.criado_em at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
    'sha256'), 'hex');
  return new;
end $$;

-- status: em assinatura só anda para concluído (servidor) ou cancelado
create or replace function public.contratos_guarda()
 returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  if new.created_by is distinct from old.created_by and (select auth.role()) is distinct from 'service_role' then
    raise exception 'O dono do contrato não pode ser trocado.';
  end if;
  if old.status in ('assinatura','concluido','cancelado')
     and (new.conteudo is distinct from old.conteudo or new.dados is distinct from old.dados
          or new.copia_emails is distinct from old.copia_emails or new.diagnostico_id is distinct from old.diagnostico_id) then
    raise exception 'Contrato já enviado para assinatura: o texto não pode mais ser alterado.';
  end if;
  if old.status in ('concluido','cancelado') and new.status <> old.status then
    raise exception 'Contrato concluído ou cancelado não muda de situação.';
  end if;
  if old.status = 'assinatura' and new.status not in ('assinatura','concluido','cancelado') then
    raise exception 'Contrato em assinatura não volta para rascunho: cancele e crie outro.';
  end if;
  if (select auth.role()) is distinct from 'service_role' and new.status in ('assinatura','concluido') and new.status <> old.status then
    raise exception 'Envio e conclusão só acontecem pelo fluxo de assinatura.';
  end if;
  return new;
end $$;

create or replace function public.contratos_novo()
 returns trigger language plpgsql set search_path = public as $$
begin
  if (select auth.role()) is distinct from 'service_role' then
    new.status := 'rascunho';
    new.created_by := auth.uid();
  end if;
  return new;
end $$;
drop trigger if exists contratos_novo on public.contratos;
create trigger contratos_novo before insert on public.contratos for each row execute function public.contratos_novo();
revoke execute on function public.contratos_novo() from public, anon, authenticated;

-- emissão do código: espera entre envios, limite por hora e teto vitalício, tudo numa operação
create or replace function public.contrato_emitir_codigo(sid uuid, p_hash text, p_validade_min int, p_espera_s int, p_max_hora int, p_max_total int)
 returns text language plpgsql volatile security definer set search_path = public as $$
declare s public.contrato_signatarios;
begin
  update public.contrato_signatarios set
    otp_hash = p_hash, otp_expira = now() + make_interval(mins => p_validade_min), otp_tentativas = 0, otp_ultimo_envio = now(),
    codigos_qtd = case when codigos_janela is null or codigos_janela < now() - interval '1 hour' then 1 else codigos_qtd + 1 end,
    codigos_janela = case when codigos_janela is null or codigos_janela < now() - interval '1 hour' then now() else codigos_janela end
  where id = sid and status <> 'assinado'
    and (otp_ultimo_envio is null or otp_ultimo_envio < now() - make_interval(secs => p_espera_s))
    and (codigos_janela is null or codigos_janela < now() - interval '1 hour' or codigos_qtd < p_max_hora)
    and otp_total < p_max_total;
  if found then return 'ok'; end if;
  select * into s from public.contrato_signatarios where id = sid;
  if not found or s.status = 'assinado' then return 'indisponivel'; end if;
  if s.otp_total >= p_max_total then return 'limite_total'; end if;
  if s.otp_ultimo_envio >= now() - make_interval(secs => p_espera_s) then return 'aguarde'; end if;
  return 'limite_hora';
end $$;

-- conferência: consome a tentativa e compara com o código ATUAL do banco; acerto apaga o código
create or replace function public.contrato_conferir_codigo(sid uuid, p_hash text, p_limite int, p_max_total int)
 returns text language plpgsql volatile security definer set search_path = public as $$
declare acertou boolean; tent int; s public.contrato_signatarios;
begin
  update public.contrato_signatarios
     set otp_tentativas = otp_tentativas + 1, otp_total = otp_total + 1
   where id = sid and otp_hash is not null and otp_expira > now()
     and otp_tentativas < p_limite and otp_total < p_max_total
  returning (otp_hash = p_hash), otp_tentativas into acertou, tent;
  if not found then
    select * into s from public.contrato_signatarios where id = sid;
    if s.otp_total >= p_max_total then return 'limite_total'; end if;
    if s.otp_hash is null then return 'sem_codigo'; end if;
    if s.otp_expira <= now() then return 'expirado'; end if;
    return 'bloqueado';
  end if;
  if not acertou then return 'errado:' || greatest(p_limite - tent, 0); end if;
  update public.contrato_signatarios set otp_hash = null, otp_expira = null where id = sid and otp_hash = p_hash;
  if not found then return 'sem_codigo'; end if;
  return 'ok';
end $$;

revoke execute on function public.contrato_emitir_codigo(uuid, text, int, int, int, int),
  public.contrato_conferir_codigo(uuid, text, int, int) from public, anon, authenticated;
grant execute on function public.contrato_emitir_codigo(uuid, text, int, int, int, int),
  public.contrato_conferir_codigo(uuid, text, int, int) to service_role;
-- a função contrato_consumir_tentativa (0024) deixa de ser usada pelo servidor; fica no banco, inofensiva (só a chave de serviço chama)
