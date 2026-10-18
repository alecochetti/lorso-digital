// Página pública de assinatura. O token vem depois do "#" no link: essa parte nunca é enviada a servidores
// nem vaza como "referer". Toda conferência acontece na função contrato-assinar.
import { esc, renderizar } from "/admin/assets/contrato-render.js";

const FUNCAO = "https://wloetjknoxynstzsfchp.supabase.co/functions/v1/contrato-assinar";
const CHAVE_PUBLICA = "sb_publishable_uosX4Cwdt-U26l0v3J_r2A_Fr5mI58J";
const app = document.getElementById("app");
const token = new URLSearchParams(location.hash.slice(1)).get("t") || "";
const primeiroNome = (n) => { const p = String(n || "").trim().split(/\s+/)[0] || ""; return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase(); };
const dataHora = (iso) => iso ? new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "long", timeStyle: "short" }) : "";

async function chamar(acao, extra = {}) {
  let r, j = {};
  try {
    r = await fetch(FUNCAO, { method: "POST", headers: { "Content-Type": "application/json", apikey: CHAVE_PUBLICA }, body: JSON.stringify({ acao, token, ...extra }) });
  } catch (_) { throw new Error("Sem conexão. Confira sua internet e tente de novo."); }
  try { j = await r.json(); } catch (_) {}
  if (!r.ok || j.erro) throw new Error(j.erro || "Não foi possível concluir agora. Tente de novo em instantes.");
  return j;
}

function erro(msg) {
  app.innerHTML = `<div class="card" style="margin-top:28px;max-width:640px"><h1 style="margin-top:0">Não foi possível abrir</h1>
    <p class="lead">${esc(msg)}</p></div>`;
}

if (!token) erro("Este endereço está incompleto. Abra o contrato pelo botão do e-mail que você recebeu.");
else {
  try {
    const d = await chamar("abrir");
    d.assinado ? comprovante(d) : tela(d);
  } catch (e) { erro(e.message); }
}

function listaAssinantes(l) {
  return (l || []).map((x) => `<div class="sig"><span class="ponto" data-st="${x.assinou ? "ok" : "pen"}"></span>
    <span class="t"><b>${esc(x.nome)}</b><small>${esc(x.papel || "")}${x.assinou ? ` · assinou em ${esc(dataHora(x.assinado_em))}` : " · aguardando"}</small></span></div>`).join("");
}

function tela(d) {
  const primeiro = esc(primeiroNome(d.nome));
  app.innerHTML = `
    <h1>Olá, ${primeiro}. Este contrato aguarda a sua assinatura.</h1>
    <p class="lead">${esc(d.titulo)} · enviado por L'ORSO Comunicação Ltda. Você não precisa criar conta nem instalar nada.</p>
    <div class="duas" style="margin-top:18px">
      <article class="principal card">
        <div class="cab" style="margin:0 0 10px"><span class="sobre">Contrato · versão ${esc(d.versao)}</span>
          <button class="btn peq" type="button" id="pdf">Imprimir ou salvar em PDF</button></div>
        <div class="doc rolagem" tabindex="0" aria-label="Texto do contrato">${renderizar(d.conteudo)}</div>
        <div class="hash" style="margin-top:14px"><div class="sobre" style="color:rgba(255,255,255,.7)">Impressão digital do documento</div>
          <code>${esc(d.sha256)}</code><small>Código SHA-256 deste texto. Se uma vírgula mudar, o código muda e a assinatura deixa de valer.</small></div>
      </article>
      <aside class="lado">
        <form class="card" id="form" novalidate>
          <h2>Assinar</h2>
          <label style="display:flex;gap:10px;align-items:flex-start;font-size:14.5px;cursor:pointer;margin:0 0 14px">
            <input type="checkbox" id="aceite" style="width:20px;height:20px;margin-top:2px;accent-color:#0B7A4E;flex:0 0 20px">
            <span>Li o contrato e concordo em assiná-lo eletronicamente.</span></label>
          <div class="campo" style="margin-bottom:12px"><label for="cpf">Seu CPF</label>
            <input id="cpf" inputmode="numeric" autocomplete="off" placeholder="000.000.000-00" maxlength="14"></div>
          <button class="btn" type="button" id="pedir" style="width:100%">Receber código por e-mail</button>
          <p class="salvo" id="pedir-msg" role="status" style="margin:6px 0 10px"></p>
          <div class="campo" id="codigo-box" hidden style="margin-bottom:12px"><label for="codigo">Código de 6 números</label>
            <input id="codigo" inputmode="numeric" autocomplete="one-time-code" maxlength="6" style="letter-spacing:.3em;font-weight:700"></div>
          <div class="campo" style="margin-bottom:10px"><label for="nome">Digite seu nome completo para assinar</label>
            <input id="nome" autocomplete="name" maxlength="160"></div>
          <div style="border:1px dashed #D3D8E2;border-radius:12px;min-height:72px;display:grid;place-items:center;padding:8px 12px;margin-bottom:14px">
            <span id="previa" style="font-family:'Caveat',cursive;font-size:32px;color:#0B3B2A;line-height:1.1"></span>
            <span id="previa-vazia" style="font-size:13px;color:#5B6474">A prévia da sua assinatura aparece aqui</span></div>
          <button class="btn p" type="submit" id="assinar" style="width:100%" disabled>Assinar contrato</button>
          <p class="salvo" id="msg" role="alert" style="margin:8px 0 0"></p>
          <p style="margin:8px 0 0;font-size:12.5px;color:#5B6474">Ao assinar, registramos data, hora, endereço IP, navegador, seu CPF e o e-mail verificado.</p>
        </form>
        <div class="card"><h2>Quem assina</h2>${listaAssinantes(d.assinantes)}
          <p style="margin:10px 0 0;font-size:12.5px;color:#5B6474">Este link é pessoal e vale até ${esc(dataHora(d.expira))}.</p></div>
      </aside>
    </div>`;

  const $ = (id) => document.getElementById(id);
  const digitos = (v) => v.replace(/\D/g, "");
  const cpfOk = (v) => {
    const c = digitos(v);
    if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
    const dv = (n) => { let s = 0; for (let i = 0; i < n; i++) s += Number(c[i]) * (n + 1 - i); const r = (s * 10) % 11; return r === 10 ? 0 : r; };
    return dv(9) === Number(c[9]) && dv(10) === Number(c[10]);
  };
  let pediu = false;
  const atualizar = () => {
    const nome = $("nome").value.replace(/\s+/g, " ").trim();
    $("previa").textContent = nome; $("previa-vazia").hidden = !!nome;
    $("assinar").disabled = !($("aceite").checked && cpfOk($("cpf").value) && pediu && digitos($("codigo").value).length === 6 && nome.length >= 5 && nome.includes(" "));
  };
  $("cpf").addEventListener("input", (e) => {
    const c = digitos(e.target.value).slice(0, 11);
    e.target.value = c.replace(/^(\d{3})(\d)/, "$1.$2").replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2");
    atualizar();
  });
  ["aceite", "codigo", "nome"].forEach((id) => $(id).addEventListener("input", atualizar));
  $("aceite").addEventListener("change", atualizar);
  $("pdf").addEventListener("click", () => { document.getElementById("impressao").innerHTML = `<div class="doc">${renderizar(d.conteudo)}</div><p style="font-size:9pt">SHA-256: ${esc(d.sha256)}</p>`; window.print(); });

  $("pedir").addEventListener("click", async () => {
    const b = $("pedir"); b.disabled = true; $("pedir-msg").textContent = "Enviando…";
    try {
      const r = await chamar("codigo");
      pediu = true; $("codigo-box").hidden = false;
      $("pedir-msg").textContent = `Código enviado para ${r.email}. Vale por 10 minutos.` + (r.teste_codigo ? ` (Teste: ${r.teste_codigo})` : "");
      b.textContent = "Reenviar código";
      $("codigo").focus();
      setTimeout(() => { b.disabled = false; }, 60000);
    } catch (e) { $("pedir-msg").textContent = e.message; b.disabled = false; }
    atualizar();
  });

  $("form").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    if ($("assinar").disabled) return;
    $("assinar").disabled = true; $("msg").textContent = "Registrando sua assinatura…";
    try {
      const r = await chamar("assinar", { aceite: true, cpf: digitos($("cpf").value), codigo: digitos($("codigo").value), nome: $("nome").value });
      comprovante({ ...r, nome: d.nome, titulo: d.titulo });
    } catch (e) { $("msg").textContent = e.message; atualizar(); }
  });
}

function comprovante(d) {
  app.innerHTML = `
    <div class="card" style="margin-top:24px;background:linear-gradient(135deg,#0B7A4E 0%,#10B981 45%,#06B6D4 100%);color:#fff;border:0">
      <div class="sobre" style="color:rgba(255,255,255,.85)">Assinatura registrada</div>
      <h1 style="margin:6px 0 4px;color:#fff">Pronto, ${esc(primeiroNome(d.nome))}. Sua assinatura foi registrada.</h1>
      <p style="margin:0;opacity:.92">${esc(d.titulo)} · ${esc(dataHora(d.assinado_em))}</p></div>
    <div class="duas">
      <div class="principal card"><h2>Situação das assinaturas</h2>${listaAssinantes(d.assinantes)}
        <p class="lead" style="margin-top:12px;font-size:14px">${d.concluido || (d.assinantes || []).every((x) => x.assinou) ? "Todas as partes assinaram. Você recebe a confirmação por e-mail." : "Quando todas as partes assinarem, você recebe a confirmação por e-mail."}</p></div>
      <aside class="lado"><div class="hash"><div class="sobre" style="color:rgba(255,255,255,.7)">Impressão digital do documento</div>
        <code>${esc(d.sha256 || "")}</code><small>Guarde este código: ele identifica exatamente o texto que você assinou.</small></div></aside>
    </div>`;
}
