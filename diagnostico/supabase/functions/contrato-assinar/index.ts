// Página pública de assinatura. Quem assina não tem conta: o acesso é o token do link (só existe como hash no banco).
// Ações: abrir (lê o contrato), codigo (manda o código de 6 números por e-mail), assinar.
import {
  cors, cpfValido, ehTeste, enviarEmail, esc, hmac, igual, ipDe, json, mascaraCpf, mascaraEmail, moldura, novoCodigo,
  registrar, servico, sha256, uaDe,
} from "./comum.ts";

const CODIGO_MIN = 10;          // validade do código
const MAX_TENTATIVAS = 5;       // erros por código
const ENVIOS_POR_HORA = 5;      // códigos por signatário por hora
const ESPERA_REENVIO_S = 60;

Deno.serve(async (req) => {
  const h = cors(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response("ok", { headers: h });
  if (req.method !== "POST") return json({ erro: "Método não permitido." }, 405, h);

  let body: any;
  try { body = await req.json(); } catch { return json({ erro: "Pedido inválido." }, 400, h); }
  const token = String(body.token ?? "");
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) return json({ erro: "Link inválido. Abra pelo e-mail que você recebeu." }, 400, h);

  const sb = servico();
  const ip = ipDe(req), ua = uaDe(req);
  const { data: s } = await sb.from("contrato_signatarios")
    .select("id, contrato_id, nome, papel, email, status, versao_id, token_expira, otp_hash, otp_expira, otp_tentativas, otp_ultimo_envio, assinado_em")
    .eq("token_hash", await sha256(token)).maybeSingle();
  if (!s) return json({ erro: "Link inválido ou substituído por um mais novo. Use o último e-mail que você recebeu." }, 404, h);

  const { data: c } = await sb.from("contratos").select("id, titulo, status, created_by, copia_emails").eq("id", s.contrato_id).single();
  if (!c) return json({ erro: "Contrato não encontrado." }, 404, h);
  const { data: v } = await sb.from("contrato_versoes").select("id, numero, conteudo, hash_sha256").eq("id", s.versao_id).single();
  const assinantes = async () => {
    const { data } = await sb.from("contrato_signatarios").select("nome, papel, status, assinado_em").eq("contrato_id", c.id).order("ordem");
    return (data ?? []).map((x) => ({ nome: x.nome, papel: x.papel, assinou: x.status === "assinado", assinado_em: x.assinado_em }));
  };

  if (s.status === "assinado") {
    return json({ assinado: true, nome: s.nome, titulo: c.titulo, assinado_em: s.assinado_em, sha256: v?.hash_sha256, assinantes: await assinantes() }, 200, h);
  }
  if (c.status === "cancelado") return json({ erro: "Este contrato foi cancelado por quem enviou." }, 410, h);
  if (c.status !== "assinatura" || !v) return json({ erro: "Este contrato não está disponível para assinatura." }, 409, h);
  if (!s.token_expira || new Date(s.token_expira) < new Date()) return json({ erro: "O prazo deste link acabou. Peça um novo link a quem enviou o contrato." }, 410, h);

  // integridade: o texto guardado precisa bater com a impressão digital travada no envio
  if ((await sha256(v.conteudo)) !== v.hash_sha256) {
    await registrar(sb, { contrato_id: c.id, signatario_id: s.id, tipo: "integridade_falhou", ip, user_agent: ua });
    return json({ erro: "Não foi possível conferir a integridade do documento. A assinatura foi bloqueada por segurança." }, 409, h);
  }

  // ----- abrir -----
  if (body.acao === "abrir") {
    if (s.status === "enviado") await sb.from("contrato_signatarios").update({ status: "visualizado" }).eq("id", s.id);
    await registrar(sb, { contrato_id: c.id, signatario_id: s.id, tipo: "documento_aberto", ip, user_agent: ua });
    return json({
      nome: s.nome, papel: s.papel, email: mascaraEmail(s.email), titulo: c.titulo,
      versao: v.numero, sha256: v.hash_sha256, conteudo: v.conteudo, expira: s.token_expira, assinantes: await assinantes(),
    }, 200, h);
  }

  // ----- código por e-mail -----
  if (body.acao === "codigo") {
    if (s.otp_ultimo_envio && Date.now() - new Date(s.otp_ultimo_envio).getTime() < ESPERA_REENVIO_S * 1000) {
      return json({ erro: "Aguarde um minuto para pedir outro código." }, 429, h);
    }
    const { count } = await sb.from("contrato_eventos").select("id", { count: "exact", head: true })
      .eq("signatario_id", s.id).eq("tipo", "codigo_enviado").gte("criado_em", new Date(Date.now() - 36e5).toISOString());
    if ((count ?? 0) >= ENVIOS_POR_HORA) return json({ erro: "Muitos códigos pedidos. Tente de novo daqui a uma hora." }, 429, h);

    const codigo = novoCodigo();
    await sb.from("contrato_signatarios").update({
      otp_hash: await hmac(`${s.id}:${codigo}`), otp_expira: new Date(Date.now() + CODIGO_MIN * 6e4).toISOString(),
      otp_tentativas: 0, otp_ultimo_envio: new Date().toISOString(),
    }).eq("id", s.id);
    try {
      await enviarEmail(s.email, `Seu código para assinar: ${codigo}`, moldura("Código para assinar o contrato", `
        <p style="margin:0 0 12px;font-size:14px;color:#344054">Use este código na página de assinatura de <b>${esc(c.titulo)}</b>:</p>
        <div style="font-size:30px;font-weight:800;letter-spacing:8px;margin:6px 0 14px">${codigo}</div>
        <p style="margin:0;font-size:13px;color:#5B6474">Vale por ${CODIGO_MIN} minutos. Se não foi você quem pediu, ignore este e-mail.</p>`));
    } catch (e) {
      console.error("email", e);
      return json({ erro: "Não conseguimos enviar o código agora. Tente de novo em instantes." }, 502, h);
    }
    await registrar(sb, { contrato_id: c.id, signatario_id: s.id, tipo: "codigo_enviado", detalhe: { email: mascaraEmail(s.email) }, ip, user_agent: ua });
    return json({ ok: true, email: mascaraEmail(s.email), ...(ehTeste(s.email) ? { teste_codigo: codigo } : {}) }, 200, h);
  }

  // ----- assinar -----
  if (body.acao === "assinar") {
    if (body.aceite !== true) return json({ erro: "Confirme que leu e concorda com o contrato." }, 400, h);
    const cpf = cpfValido(String(body.cpf ?? ""));
    if (!cpf) return json({ erro: "CPF inválido. Confira os números." }, 400, h);
    const nome = String(body.nome ?? "").replace(/\s+/g, " ").trim();
    if (nome.length < 5 || nome.length > 160 || !nome.includes(" ")) return json({ erro: "Digite seu nome completo." }, 400, h);
    const codigo = String(body.codigo ?? "").replace(/\D/g, "");
    if (!s.otp_hash || !s.otp_expira) return json({ erro: "Peça o código por e-mail primeiro." }, 400, h);
    if (new Date(s.otp_expira) < new Date()) return json({ erro: "O código expirou. Peça um novo." }, 400, h);
    // consome a tentativa no banco antes de conferir (pedidos simultâneos não furam o limite)
    const { data: usada, error: et } = await sb.rpc("contrato_consumir_tentativa", { sid: s.id, limite: MAX_TENTATIVAS });
    if (et) return json({ erro: "Não foi possível conferir o código agora." }, 500, h);
    if (usada === null || usada === undefined) return json({ erro: "Muitas tentativas. Peça um novo código." }, 429, h);
    if (codigo.length !== 6 || !igual(await hmac(`${s.id}:${codigo}`), s.otp_hash)) {
      await registrar(sb, { contrato_id: c.id, signatario_id: s.id, tipo: "codigo_incorreto", ip, user_agent: ua });
      const resta = MAX_TENTATIVAS - Number(usada);
      return json({ erro: resta > 0 ? `Código incorreto. Restam ${resta} tentativa${resta > 1 ? "s" : ""}.` : "Código incorreto. Peça um novo código." }, 400, h);
    }

    const agora = new Date().toISOString();
    const { data: feito } = await sb.from("contrato_signatarios").update({
      status: "assinado", cpf, assinatura_nome: nome, assinatura_ip: ip, assinatura_ua: ua, assinado_em: agora,
      otp_hash: null, otp_expira: null, otp_tentativas: 0,
    }).eq("id", s.id).neq("status", "assinado").select("id");
    if (!feito?.length) return json({ erro: "Esta assinatura já foi registrada." }, 409, h);
    await registrar(sb, {
      contrato_id: c.id, signatario_id: s.id, tipo: "assinado",
      detalhe: { nome_digitado: nome, cpf: mascaraCpf(cpf), email_verificado: mascaraEmail(s.email), versao: v.numero, sha256: v.hash_sha256, aceite: true },
      ip, user_agent: ua,
    });

    const lista = await assinantes();
    const todos = lista.every((x) => x.assinou);
    const { data: dono } = c.created_by ? await sb.from("profiles").select("email").eq("id", c.created_by).maybeSingle() : { data: null };
    if (todos) {
      await sb.from("contratos").update({ status: "concluido" }).eq("id", c.id).eq("status", "assinatura");
      await registrar(sb, { contrato_id: c.id, tipo: "concluido", detalhe: { sha256: v.hash_sha256, assinantes: lista.length } });
      const { data: sigs } = await sb.from("contrato_signatarios").select("email").eq("contrato_id", c.id);
      const para = [...new Set([...(sigs ?? []).map((x) => x.email), ...(c.copia_emails ?? []), ...(dono?.email ? [dono.email] : [])])];
      try {
        await enviarEmail(para, `Contrato assinado por todos: ${c.titulo}`, moldura("Contrato assinado por todas as partes", `
          <p style="margin:0 0 10px;font-size:14px;color:#344054"><b>${esc(c.titulo)}</b> foi assinado por ${lista.length} pessoa${lista.length > 1 ? "s" : ""}.</p>
          <ul style="margin:0 0 12px;padding-left:18px;font-size:14px;color:#344054">${lista.map((x) => `<li>${esc(x.nome)}${x.papel ? ` (${esc(x.papel)})` : ""}</li>`).join("")}</ul>
          <p style="margin:0 0 6px;font-size:13px;color:#5B6474">Impressão digital do documento (SHA-256):</p>
          <p style="margin:0 0 12px;font-family:monospace;font-size:12px;word-break:break-all">${esc(v.hash_sha256)}</p>
          <p style="margin:0;font-size:13px;color:#5B6474">A via assinada, com o registro de evidências, fica com L'ORSO Comunicação Ltda e pode ser solicitada a qualquer momento.</p>`));
      } catch (e) { console.error("email conclusao", e); }
    } else if (dono?.email) {
      try {
        await enviarEmail(dono.email, `${nome} assinou: ${c.titulo}`, moldura(`${esc(nome)} assinou o contrato`, `
          <p style="margin:0;font-size:14px;color:#344054">${esc(c.titulo)}: ${lista.filter((x) => x.assinou).length} de ${lista.length} assinaturas.</p>`));
      } catch (e) { console.error("email aviso", e); }
    }
    return json({ ok: true, assinado: true, concluido: todos, assinado_em: agora, sha256: v.hash_sha256, assinantes: lista }, 200, h);
  }

  return json({ erro: "Ação desconhecida." }, 400, h);
});
