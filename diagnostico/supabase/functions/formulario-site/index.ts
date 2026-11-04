// Recebe os formulários públicos do site (vagas, banco de talentos e diagnóstico).
// 1. Grava no banco (formularios_site) e o currículo no bucket privado "curriculos".
// 2. Manda o aviso interno para a LORSO (com o currículo em anexo).
// 3. Manda a confirmação para o candidato (vagas e banco de talentos).
// Se um e-mail falhar, o envio continua salvo no banco.
// Publicada com verify_jwt = false: é chamada pelo site sem login.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const SITE_URL = "https://www.lorsodigital.com.br";
const LOGO_URL = `${SITE_URL}/assets/img/email/logo-lorso-email.png`;
const DESTINO = Deno.env.get("FORMULARIOS_DESTINO") ?? "alessandro@lorsodigital.com.br";
const REMETENTE_INTERNO = Deno.env.get("FORMULARIOS_REMETENTE") ?? "Site LORSO Digital <site@lorsodigital.com.br>";
const REMETENTE_CANDIDATO = Deno.env.get("CANDIDATURAS_REMETENTE") ?? "LORSO Digital · Gente & Gestão <gente@lorsodigital.com.br>";
const BANCO = "Banco de talentos";
const MAX_ARQUIVO = 5 * 1024 * 1024;
const LIMITE_POR_HORA = 8;

const ORIGENS = (Deno.env.get("ALLOWED_ORIGINS") ?? "https://www.lorsodigital.com.br,https://lorsodigital.com.br")
  .split(",").map((s) => s.trim());

function cors(origin: string | null) {
  let local = false;
  try {
    const u = new URL(origin ?? "");
    local = u.protocol === "http:" && (u.hostname === "localhost" || u.hostname === "127.0.0.1");
  } catch (_) { /* sem origem */ }
  const ok = origin && (ORIGENS.includes(origin) || local);
  return {
    "Access-Control-Allow-Origin": ok ? origin! : ORIGENS[0],
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
    "Vary": "Origin",
    "Cache-Control": "no-store",
  };
}
const json = (b: unknown, s: number, h: Record<string, string>) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...h, "Content-Type": "application/json" } });

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
const limpa = (v: unknown, max = 2000) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);

const ipDe = (req: Request) =>
  (req.headers.get("cf-connecting-ip") ?? req.headers.get("x-real-ip") ?? (req.headers.get("x-forwarded-for") ?? "").split(",")[0])
    .trim().slice(0, 64) || null;

function base64(bytes: Uint8Array) {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

async function enviarEmail(msg: {
  from: string; to: string[]; subject: string; html: string; text?: string; reply_to?: string;
  attachments?: { filename: string; content: string }[];
}) {
  const chave = Deno.env.get("RESEND_API_KEY");
  if (!chave) throw new Error("RESEND_API_KEY ausente");
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
    body: JSON.stringify(msg),
  });
  if (!r.ok) throw new Error(`resend ${r.status}: ${(await r.text()).slice(0, 300)}`);
}

// Campos de controle que não aparecem no e-mail nem no banco
const OCULTOS = new Set(["_subject", "_template", "_captcha", "_next", "_honey", "_tipo", "Currículo", "Fit (0 a 100)", "Triagem"]);

Deno.serve(async (req) => {
  const h = cors(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response("ok", { headers: h });
  if (req.method !== "POST") return json({ erro: "Método não permitido." }, 405, h);

  let form: FormData;
  try { form = await req.formData(); } catch { return json({ erro: "Envio inválido." }, 400, h); }

  // Anti-spam: campo invisível preenchido costuma ser robô, mas o preenchimento
  // automático do navegador também pode preencher. Por isso não descarta:
  // grava e marca o e-mail interno para conferir.
  const suspeito = !!limpa(form.get("_honey"));

  const vaga = limpa(form.get("Vaga"), 200);
  const tipo = limpa(form.get("_tipo")) === "diagnostico" ? "diagnostico" : vaga === BANCO ? "banco_talentos" : "candidatura";
  const nome = limpa(form.get("Nome"), 200);
  const email = limpa(form.get("E-mail"), 200).toLowerCase();
  const telefone = limpa(form.get("Celular") ?? form.get("WhatsApp"), 40);

  if (!nome || !emailOk(email)) return json({ erro: "Preencha nome e e-mail corretamente." }, 400, h);
  if (tipo !== "diagnostico" && !vaga) return json({ erro: "Vaga não informada." }, 400, h);

  // Todos os outros campos, na ordem do formulário
  const dados: Record<string, string> = {};
  for (const [k, v] of form.entries()) {
    if (OCULTOS.has(k) || typeof v !== "string") continue;
    const val = limpa(v);
    if (val) dados[limpa(k, 120)] = val;
  }

  let fit: number | null = null;
  const fitTxt = limpa(form.get("Fit (0 a 100)"), 5);
  if (/^\d{1,3}$/.test(fitTxt)) fit = Math.min(100, Number(fitTxt));
  const triagemTxt = limpa(form.get("Triagem"), 30);
  const triagem = ["Alto fit", "Médio fit", "Não atende"].includes(triagemTxt) ? triagemTxt : null;

  // Currículo
  let arquivo: File | null = null;
  const f = form.get("Currículo");
  if (f && typeof f !== "string" && f.size > 0) arquivo = f;
  if (tipo !== "diagnostico" && !arquivo) return json({ erro: "Anexe o currículo." }, 400, h);
  if (arquivo) {
    if (arquivo.size > MAX_ARQUIVO) return json({ erro: "O currículo deve ter até 5 MB." }, 400, h);
    if (!/\.(pdf|docx?)$/i.test(arquivo.name)) return json({ erro: "O currículo deve ser PDF ou Word." }, 400, h);
  }

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const ip = ipDe(req);
  const ua = (req.headers.get("user-agent") ?? "").slice(0, 300) || null;

  // Limite simples por IP
  if (ip) {
    const desde = new Date(Date.now() - 3600_000).toISOString();
    const { count } = await sb.from("formularios_site").select("id", { count: "exact", head: true }).eq("ip", ip).gte("criado_em", desde);
    if ((count ?? 0) >= LIMITE_POR_HORA) return json({ erro: "Muitos envios seguidos. Tente de novo mais tarde." }, 429, h);
  }

  const id = crypto.randomUUID();
  let bytes: Uint8Array | null = null;
  let curriculo_path: string | null = null;
  if (arquivo) {
    bytes = new Uint8Array(await arquivo.arrayBuffer());
    const ext = arquivo.name.split(".").pop()!.toLowerCase();
    curriculo_path = `${new Date().toISOString().slice(0, 7)}/${id}.${ext}`;
    const tipoArq = ext === "pdf" ? "application/pdf"
      : ext === "doc" ? "application/msword"
      : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    const { error } = await sb.storage.from("curriculos").upload(curriculo_path, bytes, { contentType: tipoArq, upsert: false });
    if (error) {
      console.error("upload", error.message);
      return json({ erro: "Não foi possível enviar o currículo agora. Tente de novo em instantes." }, 500, h);
    }
  }

  const { error: ei } = await sb.from("formularios_site").insert({
    id, tipo, vaga: tipo === "diagnostico" ? null : vaga, nome, email, telefone: telefone || null,
    dados: suspeito ? { ...dados, _suspeito: "campo anti-spam preenchido" } : dados,
    fit, triagem, curriculo_path, ip, user_agent: ua,
  });
  if (ei) {
    console.error("insert", ei.message);
    return json({ erro: "Não foi possível concluir agora. Tente de novo em instantes." }, 500, h);
  }

  // ----- e-mail interno -----
  let assuntoInterno: string;
  if (tipo === "diagnostico") assuntoInterno = `🚀 Novo Diagnóstico solicitado | ${nome}${dados["Empresa"] ? " | " + dados["Empresa"] : ""}`;
  else if (tipo === "banco_talentos") assuntoInterno = `💼 Banco de talentos: novo perfil | ${nome}`;
  else assuntoInterno = `💼 Nova candidatura: ${vaga}${triagem ? ` | ${triagem}` : ""}${fit !== null ? ` | Fit ${fit}` : ""} | ${nome}`;

  if (suspeito) assuntoInterno = "[conferir: possível spam] " + assuntoInterno;

  const linhas: [string, string][] = [["Nome", nome], ["E-mail", email]];
  if (telefone) linhas.push([tipo === "diagnostico" ? "WhatsApp" : "Celular", telefone]);
  for (const [k, v] of Object.entries(dados)) if (!["Nome", "E-mail", "Celular", "WhatsApp"].includes(k)) linhas.push([k, v]);
  if (triagem) linhas.push(["Triagem", triagem]);
  if (fit !== null) linhas.push(["Fit (0 a 100)", String(fit)]);

  try {
    await enviarEmail({
      from: REMETENTE_INTERNO,
      to: [DESTINO],
      reply_to: email,
      subject: assuntoInterno,
      html: emailInterno(assuntoInterno, linhas, tipo),
      attachments: arquivo && bytes ? [{ filename: arquivo.name.slice(0, 120), content: base64(bytes) }] : undefined,
    });
    await sb.from("formularios_site").update({ email_interno_ok: true }).eq("id", id);
  } catch (e) {
    console.error("email interno", String(e));
  }

  // ----- confirmação para o candidato -----
  if (tipo !== "diagnostico") {
    const c = { nome, primeiroNome: nome.split(" ")[0], vaga, banco: tipo === "banco_talentos" };
    try {
      await enviarEmail({
        from: REMETENTE_CANDIDATO,
        to: [email],
        reply_to: DESTINO,
        subject: assuntoCandidato(c),
        html: emailCandidato(c),
        text: textoCandidato(c),
      });
      await sb.from("formularios_site").update({ email_resposta_ok: true }).eq("id", id);
    } catch (e) {
      console.error("email candidato", String(e));
    }
  }

  return json({ ok: true }, 200, h);
});

/* ---------- e-mail interno (tabela com todos os campos) ---------- */
function emailInterno(titulo: string, linhas: [string, string][], tipo: string) {
  const tr = linhas.map(([k, v], i) => `<tr style="background:${i % 2 ? "#ffffff" : "#f6f8fb"}">
      <th align="left" valign="top" style="padding:10px 14px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#475569;width:38%;border-bottom:1px solid #e6e9f0">${esc(k)}</th>
      <td style="padding:10px 14px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#0f172a;border-bottom:1px solid #e6e9f0">${esc(v)}</td></tr>`).join("");
  const rodape = tipo === "diagnostico"
    ? "Responda este e-mail para falar direto com a pessoa."
    : "Currículo em anexo. Responda este e-mail para falar direto com a pessoa.";
  return `<!DOCTYPE html><html lang="pt-BR"><body style="margin:0;padding:0;background:#eef1f4">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef1f4"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="640" cellpadding="0" cellspacing="0" style="width:100%;max-width:640px;background:#ffffff;border-radius:8px;overflow:hidden">
<tr><td style="background:#090A0F;padding:20px 24px"><img src="${LOGO_URL}" width="130" alt="LORSO Digital" style="display:block;border:0;width:130px;height:auto"></td></tr>
<tr><td style="background:#00ff87;height:4px;line-height:4px;font-size:0">&nbsp;</td></tr>
<tr><td style="padding:24px 24px 8px"><h1 style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:18px;line-height:26px;color:#0f172a">${esc(titulo)}</h1></td></tr>
<tr><td style="padding:12px 24px 8px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e6e9f0;border-radius:6px;border-collapse:separate;overflow:hidden">${tr}</table></td></tr>
<tr><td style="padding:12px 24px 24px;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#64748b">${rodape}</td></tr>
</table></td></tr></table></body></html>`;
}

/* ---------- confirmação para o candidato (mesmo texto do script do Gmail) ---------- */
type Cand = { nome: string; primeiroNome: string; vaga: string; banco: boolean };

function assuntoCandidato(c: Cand) {
  return c.banco ? "Recebemos seu perfil no Banco de Talentos" : `Recebemos sua candidatura: ${c.vaga}`;
}

function paragrafos(c: Cand) {
  if (c.banco) {
    return [
      "Agradecemos pelo seu interesse em fazer parte da rede de talentos da **LORSO Digital**.",
      "Confirmamos o recebimento do seu currículo. Seu perfil ficará no nosso banco de talentos e será considerado nos próximos processos seletivos, na LORSO e em nossos clientes.",
      "Quando surgir uma oportunidade alinhada com a sua experiência, entraremos em contato.",
      "Desejamos muito sucesso em sua trajetória!",
    ];
  }
  return [
    `Agradecemos pelo seu interesse em fazer parte do nosso time e por se candidatar à vaga de **${c.vaga}**.`,
    "Confirmamos o recebimento do seu currículo. Nosso time de Gente & Gestão analisará seu perfil e histórico profissional com atenção para avaliar a compatibilidade com os desafios do cargo.",
    "Caso seu perfil esteja alinhado com o que buscamos, entraremos em contato para dar sequência às próximas etapas do processo seletivo.",
    "Desejamos muito sucesso em sua trajetória!",
  ];
}

function textoCandidato(c: Cand) {
  return [
    c.primeiroNome ? `Olá, ${c.primeiroNome}!` : "Olá!", "",
    paragrafos(c).map((t) => t.replace(/\*\*/g, "")).join("\n\n"), "",
    "Atenciosamente,", "Time de Gente & Gestão", "LORSO Digital", SITE_URL,
  ].join("\n");
}

function emailCandidato(c: Cand) {
  const saudacao = c.primeiroNome ? `Olá, ${esc(c.primeiroNome)}!` : "Olá!";
  const p = "margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#334155;";
  const corpo = paragrafos(c)
    .map((t) => `<p style="${p}">${esc(t).replace(/\*\*(.+?)\*\*/g, '<strong style="color:#0f172a;">$1</strong>')}</p>`)
    .join("\n        ");
  const selo = c.banco ? "Perfil recebido" : "Candidatura recebida";
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(assuntoCandidato(c))}</title></head>
<body style="margin:0;padding:0;background-color:#eef1f4;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#eef1f4;">
  <tr><td align="center" style="padding:24px 12px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background-color:#ffffff;border-radius:8px;overflow:hidden;">
      <tr><td style="background-color:#090A0F;padding:28px 32px;">
        <a href="${SITE_URL}" style="text-decoration:none;"><img src="${LOGO_URL}" width="150" height="53" alt="LORSO Digital" style="display:block;border:0;width:150px;height:auto;"></a>
      </td></tr>
      <tr><td style="background-color:#00ff87;height:4px;line-height:4px;font-size:0;">&nbsp;</td></tr>
      <tr><td style="padding:36px 32px 8px;">
        <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#00a85a;font-weight:bold;">${selo}</p>
        <h1 style="margin:0 0 24px;font-family:Arial,Helvetica,sans-serif;font-size:22px;line-height:30px;color:#0f172a;">${saudacao}</h1>
        ${corpo}
        <p style="margin:24px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#334155;">Atenciosamente,</p>
      </td></tr>
      <!-- Assinatura -->
      <tr><td style="padding:16px 32px 32px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="border-left:3px solid #00ff87;padding:2px 0 2px 14px;">
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:22px;color:#0f172a;font-weight:bold;">Time de Gente &amp; Gestão</p>
              <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:#64748b;">LORSO Digital · Hub de Inteligência Operacional &amp; Escala</p>
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;">
                <a href="${SITE_URL}" style="color:#00a85a;text-decoration:none;font-weight:bold;">lorsodigital.com.br</a>
                <span style="color:#cbd5e1;">&nbsp;|&nbsp;</span>
                <a href="https://www.instagram.com/lorsodigital/" style="color:#00a85a;text-decoration:none;font-weight:bold;">@lorsodigital</a>
              </p>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}
