// Utilidades compartilhadas pelas funções de contrato (envio e assinatura).
import { createClient } from "npm:@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.14";

export const SITE_URL = Deno.env.get("SITE_URL") ?? "https://www.lorsodigital.com.br";
const ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ?? "https://www.lorsodigital.com.br,https://lorsodigital.com.br")
  .split(",").map((s) => s.trim());

export function cors(origin: string | null) {
  const ok = origin && (ORIGINS.includes(origin) || origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1"));
  return {
    "Access-Control-Allow-Origin": ok ? origin! : ORIGINS[0],
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
    "Vary": "Origin",
    "Cache-Control": "no-store",
  };
}
export const json = (b: unknown, s: number, h: Record<string, string>) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...h, "Content-Type": "application/json" } });

export const servico = () =>
  createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

export const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

const hex = (buf: ArrayBuffer) => Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
export async function sha256(t: string) {
  return hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t)));
}
// HMAC com a chave de serviço (segredo do servidor): o código de 6 números nunca fica legível no banco
export async function hmac(t: string) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(t)));
}
export function igual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
export function novoToken() {
  const b = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export function novoCodigo() {
  // 6 números sem viés de módulo
  const lim = 4294000000; // múltiplo de 1.000.000 abaixo de 2^32
  let n: number;
  do { n = crypto.getRandomValues(new Uint32Array(1))[0]; } while (n >= lim);
  return String(n % 1000000).padStart(6, "0");
}

export const ipDe = (req: Request) =>
  (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim().slice(0, 64) || null;
export const uaDe = (req: Request) => (req.headers.get("user-agent") ?? "").slice(0, 300) || null;

export const mascaraEmail = (e: string) => {
  const [u, d] = String(e).split("@");
  return d ? `${u.slice(0, 1)}•••••@${d}` : "•••••";
};
export const mascaraCpf = (c: string) => `•••.•••.${c.slice(6, 9)}-${c.slice(9, 11)}`;

export function cpfValido(v: string) {
  const c = String(v).replace(/\D/g, "");
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return null;
  const dv = (n: number) => {
    let s = 0;
    for (let i = 0; i < n; i++) s += Number(c[i]) * (n + 1 - i);
    const r = (s * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(9) === Number(c[9]) && dv(10) === Number(c[10]) ? c : null;
}

// Domínio reservado de testes: nunca recebe e-mail de verdade. Para esses endereços a função
// não envia nada e devolve o link ou o código na resposta, para testar o fluxo de ponta a ponta.
export const ehTeste = (email: string) => /@exemplo\.test$/i.test(String(email));

export async function enviarEmail(para: string | string[], assunto: string, html: string) {
  const lista = (Array.isArray(para) ? para : [para]).filter((e) => !ehTeste(e));
  if (!lista.length) return;
  const resend = Deno.env.get("RESEND_API_KEY");
  if (resend) {
    const from = Deno.env.get("CONTRATOS_REMETENTE") ?? "LORSO Digital <contratos@lorsodigital.com.br>";
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resend}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: lista, subject: assunto, html }),
    });
    if (!r.ok) throw new Error(`resend ${r.status}`);
    return;
  }
  const user = Deno.env.get("SMTP_USER"), pass = Deno.env.get("SMTP_PASS");
  if (!user || !pass) throw new Error("sem servico de e-mail configurado");
  const t = nodemailer.createTransport({ host: "smtp.gmail.com", port: 465, secure: true, auth: { user, pass } });
  await t.sendMail({ from: `"LORSO Digital" <${user}>`, to: lista.join(", "), subject: assunto, html });
}

export function moldura(titulo: string, corpo: string) {
  return `<div style="background:#F3F5F9;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;color:#101828">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;padding:28px 26px;border:1px solid #E6E9F0">
    <div style="font-weight:800;font-size:16px;color:#0B7A4E;margin-bottom:18px">LORSO Digital</div>
    <h1 style="font-size:20px;line-height:1.3;margin:0 0 12px">${titulo}</h1>
    ${corpo}
    <p style="margin:24px 0 0;font-size:12px;color:#5B6474">Mensagem automática do sistema de contratos da LORSO Digital. Não responda a este e-mail.</p>
  </div></div>`;
}
export const botao = (href: string, txt: string) =>
  `<a href="${esc(href)}" style="display:inline-block;margin:8px 0;padding:13px 22px;background:#0B7A4E;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:700;font-size:15px">${esc(txt)}</a>`;

export async function registrar(sb: ReturnType<typeof servico>, ev: {
  contrato_id: string; signatario_id?: string | null; tipo: string; detalhe?: Record<string, unknown>;
  ip?: string | null; user_agent?: string | null;
}) {
  const { error } = await sb.from("contrato_eventos").insert({
    contrato_id: ev.contrato_id, signatario_id: ev.signatario_id ?? null, tipo: ev.tipo,
    detalhe: ev.detalhe ?? {}, ip: ev.ip ?? null, user_agent: ev.user_agent ?? null,
  });
  if (error) throw new Error("falha ao registrar evidencia: " + error.message);
}
