// Lê o site do cliente e devolve o conteúdo organizado para a Base de conhecimento.
// Só equipe LORSO e administradores. Se houver ANTHROPIC_API_KEY nos segredos, também estrutura cursos e preços.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { DOMParser } from "jsr:@b-fuze/deno-dom@0.1.48";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

const KW = /curso|gradua|p[oó]s|mba|mestrado|col[eé]gio|ensino|vestibular|inscri|mensalidade|bolsa|ead|semipresencial|h[ií]brido|matr[ií]cula|pre[cç]o|investimento|sobre|institucional/i;

function bloqueado(u: URL) {
  const h = u.hostname.toLowerCase();
  if (!/^https?:$/.test(u.protocol)) return true;
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal") || h.endsWith(".localhost")) return true;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(h)) {
    const [a, b] = h.split(".").map(Number);
    if (a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) return true;
  }
  if (h.includes(":")) return true; // IPv6 literal
  return false;
}

async function baixar(url: string) {
  const ac = new AbortController(); const t = setTimeout(() => ac.abort(), 12000);
  try {
    const r = await fetch(url, { signal: ac.signal, redirect: "follow", headers: { "User-Agent": "Mozilla/5.0 (compatible; LORSO-Central/1.0)", "Accept": "text/html,*/*;q=0.5", "Accept-Language": "pt-BR,pt;q=0.9" } });
    const final = new URL(r.url || url);
    if (bloqueado(final)) throw new Error("Endereço não permitido");
    if (!r.ok) throw new Error("O site respondeu " + r.status);
    const ct = r.headers.get("content-type") || "";
    if (!/html|text/.test(ct)) throw new Error("A página não é HTML");
    const buf = new Uint8Array(await r.arrayBuffer());
    return { html: new TextDecoder("utf-8").decode(buf.slice(0, 1_500_000)), url: final.toString() };
  } finally { clearTimeout(t); }
}

const limpa = (s: string) => s.replace(/\s+/g, " ").trim();

function extrair(html: string, base: string) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  if (!doc) return null;
  doc.querySelectorAll("script,style,noscript,svg,iframe,template").forEach((n: any) => n.remove());
  const meta = (sel: string) => limpa((doc.querySelector(sel) as any)?.getAttribute("content") || "");
  const titulo = limpa(doc.querySelector("title")?.textContent || "");
  const descricao = meta('meta[name="description"]') || meta('meta[property="og:description"]');
  const blocos: string[] = []; const vistos = new Set<string>();
  doc.querySelectorAll("h1,h2,h3,h4,p,li,td,th,dt,dd,span.price,div.price").forEach((n: any) => {
    const tx = limpa(n.textContent || ""); if (tx.length < 3 || tx.length > 600 || vistos.has(tx)) return; vistos.add(tx);
    const tag = (n.tagName || "").toLowerCase();
    blocos.push(/^h[1-4]$/.test(tag) ? `${"#".repeat(Math.min(4, +tag[1] + 1))} ${tx}` : tag === "li" ? `- ${tx}` : tx);
  });
  const corpo = limpa(doc.body?.textContent || "");
  const precos = [...new Set((corpo.match(/[^.;:!?]{0,80}R\$\s?\d{1,3}(?:\.\d{3})*(?:,\d{2})?[^.;!?]{0,40}/g) || []).map(limpa))].slice(0, 40);
  const host = new URL(base).host; const links: { url: string; texto: string }[] = []; const lv = new Set<string>();
  doc.querySelectorAll("a[href]").forEach((a: any) => {
    try { const u = new URL(a.getAttribute("href"), base); u.hash = ""; const tx = limpa(a.textContent || "");
      if (u.host !== host || lv.has(u.toString()) || /\.(pdf|jpe?g|png|gif|zip|docx?)$/i.test(u.pathname)) return;
      lv.add(u.toString()); links.push({ url: u.toString(), texto: tx.slice(0, 80) }); } catch (_) { /* link inválido */ }
  });
  return { titulo, descricao, blocos: blocos.slice(0, 400), precos, links };
}

async function estruturar(texto: string) {
  const key = Deno.env.get("ANTHROPIC_API_KEY"); if (!key) return null;
  const prompt = `Você recebe o texto de páginas do site de uma instituição de ensino brasileira. Extraia só o que estiver no texto, sem inventar.
Responda apenas com JSON neste formato:
{"instituicao":"","resumo":"até 3 frases","diferenciais":[""],"cursos":[{"un":"colegio|graduacao|pos|mestrado","nome":"","modalidade":"Presencial|EAD|Híbrido|","turno":"Diurno|Noturno|Integral|Flexível|","preco":"valor em reais só com números e vírgula, ou vazio","status":"Vigente|Lançamento"}],"processos_seletivos":[""],"contatos":[""]}
Texto:
${texto.slice(0, 60000)}`;
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: Deno.env.get("ANTHROPIC_MODEL") || "claude-sonnet-5-5", max_tokens: 4000, messages: [{ role: "user", content: prompt }] }) });
    if (!r.ok) return { erro: "A IA respondeu " + r.status };
    const j = await r.json(); const tx = (j.content || []).map((c: any) => c.text || "").join("");
    const m = tx.match(/\{[\s\S]*\}/); return m ? JSON.parse(m[0]) : { erro: "Resposta da IA sem JSON" };
  } catch (e) { return { erro: String((e as Error).message || e) }; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ erro: "Use POST" }, 405);
  const auth = req.headers.get("Authorization") || "";
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const { data: eq, error: eqErr } = await sb.rpc("is_equipe");
  if (eqErr || eq !== true) return json({ erro: "Só a equipe LORSO pode ler sites." }, 403);

  let body: any = {}; try { body = await req.json(); } catch (_) { /* corpo vazio */ }
  let alvo: URL; try { alvo = new URL(String(body.url || "").trim().match(/^https?:\/\//i) ? String(body.url).trim() : "https://" + String(body.url || "").trim()); } catch (_) { return json({ erro: "Endereço inválido" }, 400); }
  if (bloqueado(alvo)) return json({ erro: "Endereço não permitido" }, 400);
  const maxPag = Math.max(1, Math.min(12, Number(body.paginas) || 6));

  const paginas: any[] = []; const fila = [alvo.toString()]; const feitas = new Set<string>();
  while (fila.length && paginas.length < maxPag) {
    const u = fila.shift()!; if (feitas.has(u)) continue; feitas.add(u);
    try {
      const { html, url } = await baixar(u); const x = extrair(html, url); if (!x) continue;
      paginas.push({ url, titulo: x.titulo, descricao: x.descricao, precos: x.precos, texto: x.blocos.join("\n") });
      if (paginas.length === 1) x.links.filter((l) => KW.test(l.url) || KW.test(l.texto)).slice(0, 30).forEach((l) => fila.push(l.url));
    } catch (e) { if (!paginas.length) return json({ erro: "Não foi possível ler o site: " + String((e as Error).message || e) }, 502); }
  }
  const texto = paginas.map((p) => `## ${p.titulo || p.url}\n${p.url}\n${p.descricao ? "\n> " + p.descricao + "\n" : ""}\n${p.texto}${p.precos.length ? "\n\n### Valores encontrados\n" + p.precos.map((x: string) => "- " + x).join("\n") : ""}`).join("\n\n---\n\n");
  const ia = await estruturar(texto);
  return json({ url: alvo.toString(), titulo: paginas[0]?.titulo || alvo.host, paginas: paginas.map((p) => ({ url: p.url, titulo: p.titulo })), precos: [...new Set(paginas.flatMap((p) => p.precos))].slice(0, 60), texto, ia });
});
