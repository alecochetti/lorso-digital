// Módulo compartilhado da Área do Cliente LORSO.
// Uso numa página protegida:
//   import { exigirModulo } from "/admin/assets/auth.js";
//   const { usuario, diagnosticos } = await exigirModulo("lancamento");
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm";

export const SUPABASE_URL = "https://wloetjknoxynstzsfchp.supabase.co";
const SUPABASE_KEY = "sb_publishable_uosX4Cwdt-U26l0v3J_r2A_Fr5mI58J";
export const SITE_URL = "https://www.lorsodigital.com.br";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "implicit" },
});

// chave → nome e endereço de cada módulo
export const MODULOS = {
  diagnostico: { nome: "Diagnóstico", url: "/admin/diagnostico/", texto: "Diagnóstico completo da operação, com Lançamentos e DRE." },
  lancamento: { nome: "Lançamentos", url: "/admin/lancamentos/", texto: "Planejamento e acompanhamento dos seus lançamentos." },
  dre: { nome: "DRE", url: "/admin/dre/", texto: "Demonstrativo de resultado mês a mês." },
};

// Chama uma Edge Function pública (POST JSON). Devolve {ok, mensagem} ou lança Error com a mensagem do servidor.
export async function chamarFuncao(nome, corpo) {
  let r, dados = {};
  try {
    r = await fetch(`${SUPABASE_URL}/functions/v1/${nome}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo),
    });
  } catch (e) { throw new Error("Sem conexão. Confira sua internet e tente de novo."); }
  try { dados = await r.json(); } catch (_) {}
  if (!r.ok || dados.erro) throw new Error(dados.erro || "Não foi possível concluir agora. Tente de novo em instantes.");
  return dados;
}

// Só aceita voltar para páginas do próprio /admin (evita redirecionamento para fora do site).
export function destinoSeguro(v) {
  if (!v) return null;
  try {
    const u = new URL(v, location.origin);
    if (u.origin === location.origin && u.pathname.startsWith("/admin/")) return u.pathname + u.search + u.hash;
  } catch (_) {}
  return null;
}

const nunca = () => new Promise(() => {});

export async function usuarioAtual() {
  const { data } = await supabase.auth.getSession();
  return data.session?.user ?? null;
}

export async function carregarPerfil(usuario) {
  const { data } = await supabase.from("profiles").select("id, nome, email, papel").eq("id", usuario.id).maybeSingle();
  return data ?? null;
}

export async function carregarDiagnosticos() {
  const { data, error } = await supabase.from("diagnosticos").select("id, nome, modulos").order("created_at");
  if (error) throw error;
  return data ?? [];
}

export const ehEquipe = (perfil) => perfil?.papel === "admin" || perfil?.papel === "equipe";

// Exige sessão. Sem sessão, manda para o login e nunca resolve.
export async function exigirSessao(app) {
  const usuario = await usuarioAtual();
  if (usuario) return usuario;
  const q = new URLSearchParams();
  if (app) q.set("app", app);
  q.set("volta", location.pathname + location.search + location.hash);
  location.replace(`/admin/login.html?${q}`);
  return nunca();
}

// Exige sessão e acesso ao módulo. Devolve { usuario, perfil, diagnosticos } com os diagnósticos que têm o módulo.
export async function exigirModulo(chave) {
  const usuario = await exigirSessao(chave);
  const [perfil, todos] = await Promise.all([carregarPerfil(usuario), carregarDiagnosticos()]);
  const diagnosticos = todos.filter((d) => (d.modulos || []).includes(chave));
  if (diagnosticos.length || ehEquipe(perfil)) return { usuario, perfil, diagnosticos };
  semAcesso(chave, usuario);
  return nunca();
}

export async function sair() {
  await supabase.auth.signOut();
  location.replace("/admin/login.html");
}

export const LOGO = `<svg aria-hidden="true" viewBox="70 92 372 326"><path d="M95 100H167Q185 100 185 118V302H390Q435 302 435 350V410H77V118Q77 100 95 100Z" fill="#00FF87"/><path d="M262 100H398L292 256H208Z" fill="#00E5FF"/><circle cx="345" cy="165" r="36" fill="#FFFFFF"/></svg>`;

export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function semAcesso(chave, usuario) {
  const nome = MODULOS[chave]?.nome ?? chave;
  document.title = "Sem acesso · LORSO Digital";
  document.body.innerHTML = `<div class="center"><div class="box">
    <a class="logo" href="/">${LOGO}<b>LORSO Digital</b></a>
    <h1>Sem acesso a este módulo</h1>
    <p>Sua conta (${esc(usuario.email)}) ainda não tem o ${esc(nome)} liberado. Peça o acesso e você recebe um e-mail assim que for aprovado.</p>
    <a class="btn" href="/admin/login.html?app=${encodeURIComponent(chave)}&aba=solicitar">Solicitar acesso ao ${esc(nome)}</a>
    <a class="btn ghost" href="/admin/painel.html">Ir para o painel</a>
    <button class="link" type="button" id="sair">Sair da conta</button>
  </div></div>`;
  document.getElementById("sair").addEventListener("click", sair);
}
