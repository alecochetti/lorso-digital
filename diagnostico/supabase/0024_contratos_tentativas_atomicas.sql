-- Contador de tentativas do código de assinatura à prova de pedidos simultâneos:
-- cada tentativa é consumida no banco ANTES da conferência do código. Só o servidor (chave de serviço) chama.
create or replace function public.contrato_consumir_tentativa(sid uuid, limite int)
 returns int language sql volatile security definer set search_path = public as $$
  update public.contrato_signatarios
     set otp_tentativas = otp_tentativas + 1
   where id = sid and otp_hash is not null and otp_tentativas < limite
  returning otp_tentativas;
$$;
revoke execute on function public.contrato_consumir_tentativa(uuid, int) from public, anon, authenticated;
grant execute on function public.contrato_consumir_tentativa(uuid, int) to service_role;
