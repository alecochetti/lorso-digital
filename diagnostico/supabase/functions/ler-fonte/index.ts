// Leitura com IA de uma fonte da Base de conhecimento (NotebookLM, PDF, Word, Excel, site).
// Só equipe LORSO. Precisa do segredo ANTHROPIC_API_KEY no Supabase; sem ele, responde
// um aviso e a Central continua com a leitura automática do navegador.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "content-type": "application/json; charset=utf-8" } });

const PROMPT = `Você recebe um material de uma instituição de ensino brasileira (resumo do NotebookLM, planilha, documento ou site).
Extraia SÓ o que estiver escrito. Não invente números, datas nem nomes. Se algo não aparece, deixe vazio.
Responda apenas com JSON neste formato:
{
 "resumo": "até 3 frases sobre o que este material traz",
 "cursos": [{"un":"colegio|graduacao|pos|mestrado|","nome":"","modalidade":"Presencial|EAD|Híbrido|","turno":"Diurno|Noturno|Integral|Flexível|","preco":"mensalidade só com números e vírgula","turmas":"","vagas":"capacidade em alunos","meta":"meta de captação","matriculados":"","status":"Vigente|Lançamento","obs":"grupo ou detalhe curto, ex.: Curta duração · Online"}],
 "capacidade": [{"linha":"colegio|grad_diurno|grad_noturno|grad_ead|pos_noturno|pos_ead|pos_hibrido|mestrado","alunos":"","meta":"","captados":"","ticket":""}],
 "calendario": ["uma linha por marco: data e o que acontece, ex.: 15/11/2026 · fim das inscrições do vestibular de verão"],
 "concorrentes": ["nome do concorrente e como se posiciona"],
 "diferenciais": ["o que a instituição tem e o concorrente não"]
}
Regras:
- Curta duração, extensão e educação executiva ficam com "un" vazio e o grupo em "obs".
- Flex e semipresencial são Híbrido. Live, online e a distância são EAD.
- "capacidade" só quando o material traz totais por UN e turno. Totais por curso vão em "cursos".
- Números absolutos sem pontos de milhar (1200, não 1.200).`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ erro: "Use POST" }, 405);
  const auth = req.headers.get("Authorization") || "";
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const { data: eq, error: eqErr } = await sb.rpc("is_equipe");
  if (eqErr || eq !== true) return json({ erro: "Só a equipe LORSO pode usar a leitura com IA." }, 403);

  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) return json({ erro: "A leitura com IA ainda não está ligada (falta a chave da IA no Supabase). A leitura automática continua valendo." });

  let body: any = {}; try { body = await req.json(); } catch (_) { /* corpo vazio */ }
  const texto = String(body.texto || "").slice(0, 120000);
  if (!texto.trim()) return json({ erro: "Fonte sem texto para ler." }, 400);
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: Deno.env.get("ANTHROPIC_MODEL") || "claude-sonnet-5-5", max_tokens: 16000,
        messages: [{ role: "user", content: `${PROMPT}\n\nTítulo do material: ${String(body.titulo || "").slice(0, 200)}\n\nMaterial:\n${texto}` }] }),
    });
    if (!r.ok) return json({ erro: "A IA respondeu " + r.status + ". Tente de novo em instantes." });
    const j = await r.json(); const tx = (j.content || []).map((c: any) => c.text || "").join("");
    const m = tx.match(/\{[\s\S]*\}/); if (!m) return json({ erro: "A IA não devolveu a leitura no formato esperado." });
    const d = JSON.parse(m[0]);
    const arr = (x: unknown) => Array.isArray(x) ? x : [];
    return json({ resumo: String(d.resumo || ""), cursos: arr(d.cursos), capacidade: arr(d.capacidade), calendario: arr(d.calendario).map(String), concorrentes: arr(d.concorrentes).map(String), diferenciais: arr(d.diferenciais).map(String), em: new Date().toISOString() });
  } catch (e) { return json({ erro: "Não foi possível ler com IA: " + String((e as Error).message || e) }); }
});
