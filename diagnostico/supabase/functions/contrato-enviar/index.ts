// Envia um contrato para assinatura (trava a versão e manda um link único a cada signatário)
// ou reenvia o link de um signatário. Só administrador LORSO, com sessão válida.
import {
  botao, cors, dominioTeste, ehTeste, enviarEmail, esc, ipDe, json, modoTeste, moldura, novoToken, registrar, servico, sha256, SITE_URL, uaDe,
} from "./comum.ts";

const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

Deno.serve(async (req) => {
  const h = cors(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response("ok", { headers: h });
  if (req.method !== "POST") return json({ erro: "Método não permitido." }, 405, h);

  const sb = servico();
  const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: u } = await sb.auth.getUser(jwt);
  if (!u?.user) return json({ erro: "Sessão expirada. Entre de novo." }, 401, h);
  const { data: perfil } = await sb.from("profiles").select("papel, ativo, email").eq("id", u.user.id).maybeSingle();
  if (!perfil || perfil.papel !== "admin" || !perfil.ativo) return json({ erro: "Sem permissão." }, 403, h);

  let body: any;
  try { body = await req.json(); } catch { return json({ erro: "Pedido inválido." }, 400, h); }
  const ip = ipDe(req), ua = uaDe(req);

  // ----- reenviar o link de um signatário (gera token novo; o antigo deixa de valer) -----
  if (body.acao === "reenviar") {
    const sid = String(body.signatario_id ?? "");
    const { data: s } = await sb.from("contrato_signatarios").select("id, contrato_id, nome, email, status").eq("id", sid).maybeSingle();
    if (!s) return json({ erro: "Signatário não encontrado." }, 404, h);
    if (s.status === "assinado") return json({ erro: "Esta pessoa já assinou." }, 400, h);
    const { data: c } = await sb.from("contratos").select("id, titulo, status, prazo_dias").eq("id", s.contrato_id).single();
    if (!c || c.status !== "assinatura") return json({ erro: "O contrato não está em assinatura." }, 400, h);
    const token = novoToken();
    const expira = new Date(Date.now() + c.prazo_dias * 864e5).toISOString();
    const { error: et } = await sb.from("contrato_signatarios").update({
      token_hash: await sha256(token), token_expira: expira, otp_hash: null, otp_expira: null, otp_tentativas: 0,
      otp_total: 0, codigos_qtd: 0, codigos_janela: null, otp_ultimo_envio: null,
    }).eq("id", s.id).neq("status", "assinado");
    if (et) return json({ erro: "Não foi possível gerar o novo link." }, 500, h);
    const link = `${SITE_URL}/assinar/#t=${token}`;
    try {
      await enviarEmail(s.email, `Contrato para assinatura: ${c.titulo}`, emailConvite(s.nome, c.titulo, link, expira));
    } catch (e) {
      console.error("email", e);
      await registrar(sb, { contrato_id: c.id, signatario_id: s.id, tipo: "falha_envio", detalhe: { email: s.email }, ip, user_agent: ua });
      return json({ erro: "O link foi gerado, mas o e-mail não saiu. Tente reenviar em instantes." }, 502, h);
    }
    await registrar(sb, { contrato_id: c.id, signatario_id: s.id, tipo: "link_reenviado", detalhe: { email: s.email, por: perfil.email }, ip, user_agent: ua });
    return json({ ok: true, ...(ehTeste(s.email) ? { teste_link: link } : {}) }, 200, h);
  }

  // ----- enviar o contrato -----
  const cid = String(body.contrato_id ?? "");
  const { data: c } = await sb.from("contratos").select("id, titulo, status, conteudo, prazo_dias").eq("id", cid).maybeSingle();
  if (!c) return json({ erro: "Contrato não encontrado." }, 404, h);
  if (!["rascunho", "revisao"].includes(c.status)) return json({ erro: "Este contrato já foi enviado." }, 400, h);
  if (!c.conteudo || c.conteudo.trim().length < 200) return json({ erro: "O texto do contrato está vazio ou incompleto." }, 400, h);

  const { data: sigs } = await sb.from("contrato_signatarios").select("id, nome, email, ordem, status").eq("contrato_id", c.id).order("ordem");
  if (!sigs?.length) return json({ erro: "Inclua pelo menos um signatário." }, 400, h);
  if (sigs.some((s) => s.status !== "pendente")) return json({ erro: "Este contrato já teve envio. Cancele e crie outro." }, 400, h);
  if (!modoTeste() && sigs.some((s) => dominioTeste(s.email))) return json({ erro: "Há um e-mail de teste (@exemplo.test) entre os signatários." }, 400, h);
  const ruim = sigs.find((s) => !emailOk(s.email) || s.nome.trim().length < 2);
  if (ruim) return json({ erro: `Confira o nome e o e-mail de ${ruim.nome || "um signatário"}.` }, 400, h);
  const repetido = sigs.find((s, i) => sigs.findIndex((x) => x.email.toLowerCase() === s.email.toLowerCase()) !== i);
  if (repetido) return json({ erro: `O e-mail ${repetido.email} aparece duas vezes.` }, 400, h);

  // 1. trava a versão (texto exato + impressão digital SHA-256)
  const hash = await sha256(c.conteudo);
  const { data: ult } = await sb.from("contrato_versoes").select("numero").eq("contrato_id", c.id).order("numero", { ascending: false }).limit(1);
  const numero = (ult?.[0]?.numero ?? 0) + 1;
  const { data: v, error: ev } = await sb.from("contrato_versoes")
    .insert({ contrato_id: c.id, numero, conteudo: c.conteudo, hash_sha256: hash, travada_por: u.user.id })
    .select("id").single();
  if (ev || !v) return json({ erro: "Não foi possível travar a versão do contrato." }, 500, h);

  const { data: mudou, error: es } = await sb.from("contratos").update({ status: "assinatura" }).eq("id", c.id).in("status", ["rascunho", "revisao"]).select("id");
  if (es || !mudou?.length) return json({ erro: "O contrato mudou enquanto era enviado. Abra de novo e confira." }, 409, h);
  await registrar(sb, { contrato_id: c.id, tipo: "versao_travada", detalhe: { versao: numero, sha256: hash, por: perfil.email }, ip, user_agent: ua });

  // 2. um link único por signatário
  const expira = new Date(Date.now() + c.prazo_dias * 864e5).toISOString();
  const resultado: { id: string; email: string; ok: boolean; teste_link?: string }[] = [];
  for (const s of sigs) {
    const token = novoToken();
    const { error: et } = await sb.from("contrato_signatarios").update({
      token_hash: await sha256(token), token_expira: expira, status: "enviado", versao_id: v.id,
      otp_hash: null, otp_expira: null, otp_tentativas: 0, otp_total: 0, codigos_qtd: 0, codigos_janela: null,
    }).eq("id", s.id);
    const link = `${SITE_URL}/assinar/#t=${token}`;
    if (et) {
      await registrar(sb, { contrato_id: c.id, signatario_id: s.id, tipo: "falha_envio", detalhe: { email: s.email, motivo: "token" }, ip, user_agent: ua });
      resultado.push({ id: s.id, email: s.email, ok: false });
      continue;
    }
    try {
      await enviarEmail(s.email, `Contrato para assinatura: ${c.titulo}`, emailConvite(s.nome, c.titulo, link, expira));
      await registrar(sb, { contrato_id: c.id, signatario_id: s.id, tipo: "link_enviado", detalhe: { email: s.email }, ip, user_agent: ua });
      resultado.push({ id: s.id, email: s.email, ok: true, ...(ehTeste(s.email) ? { teste_link: link } : {}) });
    } catch (e) {
      console.error("email", e);
      await registrar(sb, { contrato_id: c.id, signatario_id: s.id, tipo: "falha_envio", detalhe: { email: s.email }, ip, user_agent: ua });
      resultado.push({ id: s.id, email: s.email, ok: false });
    }
  }
  return json({ ok: true, versao: numero, sha256: hash, signatarios: resultado }, 200, h);
});

function emailConvite(nome: string, titulo: string, link: string, expira: string) {
  const data = new Date(expira).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const pn = (nome.trim().split(/\s+/)[0] || "");
  return moldura(`Olá, ${esc(pn.charAt(0).toUpperCase() + pn.slice(1).toLowerCase())}. Há um contrato aguardando a sua assinatura.`, `
    <p style="margin:0 0 6px;font-size:15px"><b>${esc(titulo)}</b></p>
    <p style="margin:0 0 14px;font-size:14px;color:#344054">Enviado por L'ORSO Comunicação Ltda. Você lê o contrato, confirma seu CPF e um código que chega neste e-mail, e assina. Não precisa criar conta nem instalar nada.</p>
    ${botao(link, "Ler e assinar o contrato")}
    <p style="margin:14px 0 0;font-size:13px;color:#5B6474">O link é pessoal e vale até ${esc(data)}. Não encaminhe este e-mail.</p>`);
}
