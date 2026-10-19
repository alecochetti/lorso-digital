// Página pública de assinatura. Quem assina não tem conta: o acesso é o token do link (só existe como hash no banco).
// Ações: abrir (lê o contrato), codigo (manda o código de 6 números por e-mail), assinar.
import {
  cors, cpfValido, ehTeste, enviarEmail, esc, hmac, ipDe, json, mascaraCpf, mascaraEmail, moldura, novoCodigo,
  registrar, servico, sha256, uaDe, xffDe,
} from "./comum.ts";

const CODIGO_MIN = 10;          // validade do código
const MAX_TENTATIVAS = 5;       // erros por código
const MAX_TOTAL = 15;           // erros por link, somando todos os códigos (só o administrador zera, reenviando o link)
const ENVIOS_POR_HORA = 5;      // códigos por signatário por hora
const ESPERA_REENVIO_S = 60;
const ABERTURA_MIN = 10;        // "documento aberto" entra no registro no máximo a cada 10 minutos

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
    .select("id, contrato_id, nome, papel, email, status, versao_id, token_expira, assinado_em, cpf_esperado")
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
    const limite = new Date(Date.now() - ABERTURA_MIN * 6e4).toISOString();
    const { data: marcou } = await sb.from("contrato_signatarios")
      .update({ aberto_em: new Date().toISOString(), ...(s.status === "enviado" ? { status: "visualizado" } : {}) })
      .eq("id", s.id).or(`aberto_em.is.null,aberto_em.lt.${limite}`).select("id");
    if (marcou?.length) await registrar(sb, { contrato_id: c.id, signatario_id: s.id, tipo: "documento_aberto", ip, user_agent: ua });
    return json({
      nome: s.nome, papel: s.papel, email: mascaraEmail(s.email), titulo: c.titulo,
      versao: v.numero, sha256: v.hash_sha256, conteudo: v.conteudo, expira: s.token_expira, assinantes: await assinantes(),
    }, 200, h);
  }

  // ----- código por e-mail -----
  if (body.acao === "codigo") {
    const codigo = novoCodigo();
    const { data: r, error } = await sb.rpc("contrato_emitir_codigo", {
      sid: s.id, p_hash: await hmac(`${s.id}:${codigo}`), p_validade_min: CODIGO_MIN, p_espera_s: ESPERA_REENVIO_S,
      p_max_hora: ENVIOS_POR_HORA, p_max_total: MAX_TOTAL,
    });
    if (error) return json({ erro: "Não foi possível gerar o código agora." }, 500, h);
    if (r === "aguarde") return json({ erro: "Aguarde um minuto para pedir outro código." }, 429, h);
    if (r === "limite_hora") return json({ erro: "Muitos códigos pedidos. Tente de novo daqui a uma hora." }, 429, h);
    if (r === "limite_total") return json({ erro: "Este link foi bloqueado por excesso de tentativas. Peça um novo link a quem enviou o contrato." }, 429, h);
    if (r !== "ok") return json({ erro: "Este contrato não está disponível para assinatura." }, 409, h);
    try {
      await enviarEmail(s.email, "Seu código para assinar o contrato", moldura("Código para assinar o contrato", `
        <p style="margin:0 0 12px;font-size:14px;color:#344054">Use este código na página de assinatura de <b>${esc(c.titulo)}</b>:</p>
        <div style="font-size:30px;font-weight:800;letter-spacing:8px;margin:6px 0 14px">${codigo}</div>
        <p style="margin:0;font-size:13px;color:#5B6474">Vale por ${CODIGO_MIN} minutos. Se não foi você quem pediu, ignore este e-mail.</p>`));
    } catch (e) {
      console.error("email", e);
      return json({ erro: "Não conseguimos enviar o código agora. Tente de novo em um minuto." }, 502, h);
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
    if (codigo.length !== 6) return json({ erro: "Digite os 6 números do código." }, 400, h);

    // a tentativa é consumida e conferida contra o código atual, numa operação só (pedidos simultâneos não furam o limite)
    const { data: r, error } = await sb.rpc("contrato_conferir_codigo", { sid: s.id, p_hash: await hmac(`${s.id}:${codigo}`), p_limite: MAX_TENTATIVAS, p_max_total: MAX_TOTAL });
    if (error) return json({ erro: "Não foi possível conferir o código agora." }, 500, h);
    if (r === "sem_codigo") return json({ erro: "Peça o código por e-mail primeiro." }, 400, h);
    if (r === "expirado") return json({ erro: "O código expirou. Peça um novo." }, 400, h);
    if (r === "bloqueado") return json({ erro: "Muitas tentativas. Peça um novo código." }, 429, h);
    if (r === "limite_total") return json({ erro: "Este link foi bloqueado por excesso de tentativas. Peça um novo link a quem enviou o contrato." }, 429, h);
    if (String(r).startsWith("errado")) {
      await registrar(sb, { contrato_id: c.id, signatario_id: s.id, tipo: "codigo_incorreto", ip, user_agent: ua });
      const resta = Number(String(r).split(":")[1] ?? 0);
      return json({ erro: resta > 0 ? `Código incorreto. Restam ${resta} tentativa${resta > 1 ? "s" : ""}.` : "Código incorreto. Peça um novo código." }, 400, h);
    }
    if (r !== "ok") return json({ erro: "Não foi possível conferir o código agora." }, 500, h);

    // CPF: quando o contrato traz o CPF desta pessoa, ele precisa conferir (o código acertado já foi consumido)
    if (s.cpf_esperado && s.cpf_esperado !== cpf) {
      await registrar(sb, { contrato_id: c.id, signatario_id: s.id, tipo: "cpf_nao_confere", ip, user_agent: ua });
      return json({ erro: "O CPF informado não confere com o cadastrado para você neste contrato. Peça um novo código e tente de novo." }, 400, h);
    }

    const agora = new Date().toISOString();
    const { data: feito } = await sb.from("contrato_signatarios").update({
      status: "assinado", cpf, assinatura_nome: nome, assinatura_ip: ip, assinatura_ua: ua, assinado_em: agora,
    }).eq("id", s.id).neq("status", "assinado").select("id");
    if (!feito?.length) return json({ erro: "Esta assinatura já foi registrada." }, 409, h);
    await registrar(sb, {
      contrato_id: c.id, signatario_id: s.id, tipo: "assinado",
      detalhe: {
        nome_digitado: nome, cpf: mascaraCpf(cpf), cpf_sha256: await sha256(cpf), cpf_conferido: !!s.cpf_esperado,
        email_verificado: mascaraEmail(s.email), versao: v.numero, sha256: v.hash_sha256, aceite: true, xff: xffDe(req),
      },
      ip, user_agent: ua,
    });

    const ultimoHash = async () => {
      const { data } = await sb.from("contrato_eventos").select("hash").eq("contrato_id", c.id).order("seq", { ascending: false }).limit(1);
      return data?.[0]?.hash ?? "";
    };
    // comprovante para quem assinou (cópia externa da evidência)
    try {
      await enviarEmail(s.email, `Comprovante de assinatura: ${c.titulo}`, moldura("Sua assinatura foi registrada", `
        <p style="margin:0 0 10px;font-size:14px;color:#344054"><b>${esc(c.titulo)}</b>, versão ${v.numero}.</p>
        <p style="margin:0 0 4px;font-size:14px;color:#344054">Nome digitado: ${esc(nome)} · CPF ${esc(mascaraCpf(cpf))}</p>
        <p style="margin:0 0 12px;font-size:14px;color:#344054">Data e hora: ${esc(new Date(agora).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }))} · IP ${esc(ip ?? "")}</p>
        <p style="margin:0 0 4px;font-size:13px;color:#5B6474">Impressão digital do documento (SHA-256):</p>
        <p style="margin:0 0 10px;font-family:monospace;font-size:12px;word-break:break-all">${esc(v.hash_sha256)}</p>
        <p style="margin:0 0 4px;font-size:13px;color:#5B6474">Código do registro desta assinatura:</p>
        <p style="margin:0;font-family:monospace;font-size:12px;word-break:break-all">${esc(await ultimoHash())}</p>`));
    } catch (e) { console.error("email comprovante", e); }

    const lista = await assinantes();
    const todos = lista.every((x) => x.assinou);
    const { data: dono } = c.created_by ? await sb.from("profiles").select("email").eq("id", c.created_by).maybeSingle() : { data: null };
    if (todos) {
      const { data: virou } = await sb.from("contratos").update({ status: "concluido" }).eq("id", c.id).eq("status", "assinatura").select("id");
      if (virou?.length) {
        await registrar(sb, { contrato_id: c.id, tipo: "concluido", detalhe: { sha256: v.hash_sha256, assinantes: lista.length } });
        const final = await ultimoHash();
        const { data: sigs } = await sb.from("contrato_signatarios").select("email").eq("contrato_id", c.id);
        const para = [...new Set([...(sigs ?? []).map((x) => x.email), ...(c.copia_emails ?? []), ...(dono?.email ? [dono.email] : [])])];
        try {
          await enviarEmail(para, `Contrato assinado por todos: ${c.titulo}`, moldura("Contrato assinado por todas as partes", `
            <p style="margin:0 0 10px;font-size:14px;color:#344054"><b>${esc(c.titulo)}</b> foi assinado por ${lista.length} pessoa${lista.length > 1 ? "s" : ""}.</p>
            <ul style="margin:0 0 12px;padding-left:18px;font-size:14px;color:#344054">${lista.map((x) => `<li>${esc(x.nome)}${x.papel ? ` (${esc(x.papel)})` : ""}: ${esc(new Date(x.assinado_em).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }))}</li>`).join("")}</ul>
            <p style="margin:0 0 4px;font-size:13px;color:#5B6474">Impressão digital do documento (SHA-256):</p>
            <p style="margin:0 0 10px;font-family:monospace;font-size:12px;word-break:break-all">${esc(v.hash_sha256)}</p>
            <p style="margin:0 0 4px;font-size:13px;color:#5B6474">Código final do registro de evidências:</p>
            <p style="margin:0 0 12px;font-family:monospace;font-size:12px;word-break:break-all">${esc(final)}</p>
            <p style="margin:0;font-size:13px;color:#5B6474">Guarde este e-mail: os dois códigos acima permitem conferir, a qualquer momento, que o contrato e o registro não foram alterados. A via com o registro completo pode ser solicitada a L'ORSO Comunicação Ltda.</p>`));
        } catch (e) { console.error("email conclusao", e); }
      }
    } else if (dono?.email) {
      try {
        await enviarEmail(dono.email, `Nova assinatura: ${c.titulo}`, moldura(`${esc(nome)} assinou o contrato`, `
          <p style="margin:0;font-size:14px;color:#344054">${esc(c.titulo)}: ${lista.filter((x) => x.assinou).length} de ${lista.length} assinaturas.</p>`));
      } catch (e) { console.error("email aviso", e); }
    }
    return json({ ok: true, assinado: true, concluido: todos, assinado_em: agora, sha256: v.hash_sha256, assinantes: lista }, 200, h);
  }

  return json({ erro: "Ação desconhecida." }, 400, h);
});
