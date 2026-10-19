// Módulo Contratos (só administrador). A segurança de verdade está no banco (RLS) e nas Edge Functions;
// esta tela só organiza o trabalho.
import { supabase, exigirSessao, carregarPerfil, sair, LOGO } from "/admin/assets/auth.js";
import { esc, renderizar, gerarTexto, dadosPadrao, signatariosDe, moeda, numeroDe } from "/admin/assets/contrato-texto.js";

const $ = (id) => document.getElementById(id);
const app = $("app");
document.getElementById("marca").insertAdjacentHTML("afterbegin", LOGO);
$("sair").addEventListener("click", sair);

const STATUS = {
  rascunho: { nome: "Rascunho", tag: "", ponto: "def" },
  revisao: { nome: "Em revisão", tag: "rev", ponto: "rev" },
  assinatura: { nome: "Em assinatura", tag: "and", ponto: "and" },
  concluido: { nome: "Assinado", tag: "ok", ponto: "ok" },
  cancelado: { nome: "Cancelado", tag: "alerta", ponto: "alerta" },
};
const SIG = { pendente: "Ainda não enviado", enviado: "Link enviado", visualizado: "Abriu o contrato", assinado: "Assinou" };
const EVENTO = {
  versao_travada: "Versão travada para assinatura", link_enviado: "Link enviado", link_reenviado: "Link reenviado",
  falha_envio: "Falha no envio do e-mail", documento_aberto: "Documento aberto", codigo_enviado: "Código enviado por e-mail",
  codigo_incorreto: "Código incorreto digitado", assinado: "Assinatura registrada", concluido: "Contrato concluído",
  integridade_falhou: "Falha de integridade do documento", cpf_nao_confere: "CPF informado não confere",
};
const dataHora = (iso) => iso ? new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "medium" }) : "";
const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || "").trim());

// ---------- acesso ----------
const usuario = await exigirSessao();
const perfil = await carregarPerfil(usuario);
if (perfil?.papel !== "admin") {
  app.innerHTML = `<div class="card" style="margin-top:28px"><h1 style="margin-top:0">Sem acesso</h1>
    <p class="lead">Contratos ficam visíveis só para o administrador da LORSO.</p>
    <p style="margin-top:14px"><a class="btn" href="/admin/painel.html">Voltar para o painel</a></p></div>`;
  throw new Error("sem acesso");
}

// ---------- roteamento simples por ?id= ----------
let atual = null;
window.addEventListener("popstate", rota);
function ir(id) { history.pushState(null, "", id ? `?id=${encodeURIComponent(id)}` : location.pathname); rota(); }
async function rota() {
  const id = new URLSearchParams(location.search).get("id");
  try { id ? await abrir(id) : await lista(); }
  catch (e) { console.error(e); app.innerHTML = `<div class="aviso alerta" style="margin-top:24px"><span class="i">!</span><span>${esc(e.message || "Não foi possível carregar.")}</span></div>`; }
}
await rota();

// ---------- lista ----------
async function lista() {
  app.innerHTML = `<p class="carregando">Carregando…</p>`;
  const { data, error } = await supabase.from("contratos").select("id, titulo, status, dados, updated_at").order("updated_at", { ascending: false });
  if (error) throw error;
  const grupos = [
    ["Em preparação", data.filter((c) => ["rascunho", "revisao"].includes(c.status))],
    ["Em assinatura", data.filter((c) => c.status === "assinatura")],
    ["Assinados", data.filter((c) => c.status === "concluido")],
    ["Cancelados", data.filter((c) => c.status === "cancelado")],
  ];
  const linha = (c) => {
    const st = STATUS[c.status] || STATUS.rascunho;
    const d = c.dados || {};
    return `<button class="linha" type="button" data-id="${esc(c.id)}"><span class="ponto" data-st="${st.ponto}"></span>
      <span class="t"><b>${esc(c.titulo)}</b><small>${d.valor ? `R$ ${esc(moeda(numeroDe(d.valor)))} por mês · ` : ""}${d.meses ? `${esc(d.meses)} meses · ` : ""}atualizado em ${esc(dataHora(c.updated_at))}</small></span>
      <span class="tag ${st.tag}">${st.nome}</span></button>`;
  };
  app.innerHTML = `
    <div class="cab"><div><h1>Contratos</h1><p class="lead">Gere a minuta, revise com o cliente e colete as assinaturas aqui mesmo.</p></div>
      <button class="btn p" type="button" id="novo">+ Novo contrato</button></div>
    <div class="area">${grupos.map(([nome, l]) => `
      <div class="grupo">${nome} <span class="n">${l.length}</span></div>
      ${l.length ? l.map(linha).join("") : `<p class="vazio">Nenhum contrato aqui.</p>`}`).join("")}</div>`;
  $("novo").addEventListener("click", novo);
  app.querySelectorAll(".linha").forEach((b) => b.addEventListener("click", () => ir(b.dataset.id)));
}

async function novo() {
  // parte dos dados do último contrato (fica no banco, só o administrador lê); o primeiro começa em branco
  const { data: ult } = await supabase.from("contratos").select("titulo, dados").order("created_at", { ascending: false }).limit(1);
  const base = ult?.[0];
  const dados = base?.dados ? { ...dadosPadrao(), ...base.dados, texto_manual: false } : dadosPadrao();
  const { data, error } = await supabase.from("contratos").insert({
    titulo: base ? `${base.titulo} (cópia)` : "Novo contrato de consultoria", dados, conteudo: gerarTexto(dados),
  }).select("id").single();
  if (error) return alerta(error.message);
  await sincronizarSignatarios(data.id, dados);
  ir(data.id);
}

// ---------- abrir um contrato ----------
async function abrir(id) {
  app.innerHTML = `<p class="carregando">Carregando…</p>`;
  const [c, s, v, e] = await Promise.all([
    supabase.from("contratos").select("*").eq("id", id).maybeSingle(),
    supabase.from("contrato_signatarios").select("id, ordem, nome, papel, email, status, cpf, assinatura_nome, assinatura_ip, assinatura_ua, assinado_em, token_expira").eq("contrato_id", id).order("ordem"),
    supabase.from("contrato_versoes").select("id, numero, conteudo, hash_sha256, travada_em").eq("contrato_id", id).order("numero", { ascending: false }),
    supabase.from("contrato_eventos").select("id, seq, signatario_id, tipo, detalhe, ip, user_agent, criado_em, hash").eq("contrato_id", id).order("id"),
  ]);
  for (const r of [c, s, v, e]) if (r.error) throw r.error;
  if (!c.data) throw new Error("Contrato não encontrado.");
  atual = { c: c.data, sigs: s.data, versoes: v.data, eventos: e.data };
  ["rascunho", "revisao"].includes(atual.c.status) ? editor() : acompanhamento();
}

// ---------- editor (antes do envio) ----------
function editor() {
  const c = atual.c;
  const d = Object.assign(dadosPadrao(), c.dados || {});
  d.contratante = Object.assign(dadosPadrao().contratante, d.contratante || {});
  d.contratada = Object.assign(dadosPadrao().contratada, d.contratada || {});
  d.testemunhas = [0, 1].map((i) => Object.assign({ nome: "", cpf: "", email: "" }, (d.testemunhas || [])[i] || {}));
  const st = STATUS[c.status];
  const campo = (rotulo, chave, extra = {}) => {
    const v = chave.split(".").reduce((o, k) => (o ?? {})[k], d) ?? "";
    const id = "f-" + chave.replace(/\./g, "-");
    return `<div class="campo${extra.largo ? " largo" : ""}"><label for="${id}">${rotulo}</label>
      ${extra.area ? `<textarea id="${id}" data-k="${chave}">${esc(v)}</textarea>`
        : `<input id="${id}" data-k="${chave}" type="${extra.tipo || "text"}" value="${esc(v)}"${extra.attrs || ""}>`}
      ${extra.ajuda ? `<span class="ajuda">${extra.ajuda}</span>` : ""}</div>`;
  };
  app.innerHTML = `
    <div class="cab" style="margin-top:18px"><div>
      <button class="btn peq" type="button" id="voltar">Voltar para Contratos</button>
      <h1>${esc(c.titulo)}</h1>
      <p class="lead"><span class="tag ${st.tag}">${st.nome}</span> &nbsp;Nada é assinado nesta etapa. Edite à vontade.</p></div>
      <span class="salvo" id="salvo" role="status"></span></div>

    <section class="card"><h2>Identificação</h2><div class="campos">
      <div class="campo largo"><label for="f-titulo">Nome do contrato (aparece no e-mail)</label><input id="f-titulo" value="${esc(c.titulo)}"></div>
    </div></section>

    <section class="card"><h2>Contratante</h2><div class="campos">
      ${campo("Razão social", "contratante.razao", { largo: true })}
      ${campo("CNPJ", "contratante.cnpj")}
      ${campo("Endereço completo", "contratante.endereco", { largo: true })}
      ${campo("Representante (assina)", "contratante.rep_nome")}
      ${campo("Cargo", "contratante.rep_cargo")}
      ${campo("CPF do representante", "contratante.rep_cpf", { attrs: ' inputmode="numeric" placeholder="000.000.000-00"' })}
      ${campo("E-mail do representante (recebe o link)", "contratante.rep_email", { tipo: "email" })}
      ${campo("E-mail para comunicações (item 9.4)", "contratante.email_comunicacao", { tipo: "email", ajuda: "Se ficar vazio, usa o e-mail do representante." })}
    </div></section>

    <section class="card"><h2>Valores e vigência</h2><div class="campos">
      ${campo("Valor mensal (R$)", "valor", { attrs: ' inputmode="decimal"' })}
      ${campo("Julho e dezembro (% do valor)", "pct_ferias", { tipo: "number", attrs: ' min="0" max="100"', ajuda: "100 tira a cláusula de férias." })}
      ${campo("Vigência (meses)", "meses", { tipo: "number", attrs: ' min="1" max="60"' })}
      ${campo("Data de início", "data_inicio", { tipo: "date" })}
      ${campo("Bonificação (item 6.1.2)", "bolsa", { area: true, largo: true, ajuda: "Deixe vazio para tirar a cláusula. Use **texto** para negrito." })}
    </div><p class="salvo" id="calc" style="margin:10px 0 0"></p></section>

    <section class="card"><h2>Contratada</h2><div class="campos">
      ${campo("Razão social", "contratada.razao", { largo: true })}
      ${campo("CNPJ", "contratada.cnpj")}
      ${campo("Endereço completo", "contratada.endereco", { largo: true })}
      ${campo("Representante (assina)", "contratada.rep_nome")}
      ${campo("CPF", "contratada.rep_cpf", { attrs: ' inputmode="numeric"' })}
      ${campo("E-mail (recebe o link)", "contratada.rep_email", { tipo: "email" })}
    </div></section>

    <section class="card"><h2>Testemunhas</h2><div class="campos">
      ${[0, 1].map((i) => campo(`Testemunha ${i + 1}: nome`, `testemunhas.${i}.nome`) + campo(`Testemunha ${i + 1}: CPF`, `testemunhas.${i}.cpf`, { attrs: ' inputmode="numeric" placeholder="000.000.000-00"' }) + campo(`Testemunha ${i + 1}: e-mail`, `testemunhas.${i}.email`, { tipo: "email" })).join("")}
    </div></section>

    <section class="card"><h2>Envio</h2><div class="campos">
      <div class="campo"><label for="f-prazo">Prazo para assinar (dias)</label><input id="f-prazo" type="number" min="1" max="60" value="${esc(c.prazo_dias)}"></div>
      <div class="campo largo"><label for="f-copia">Enviar cópia do aviso de conclusão para (opcional, separe por vírgula)</label>
        <input id="f-copia" value="${esc((c.copia_emails || []).join(", "))}" placeholder="juridico@fecap.br, reitoria@fecap.br"></div>
    </div></section>

    <section class="card"><div class="cab" style="margin:0 0 10px"><h2 style="margin:0">Texto do contrato</h2>
      <div class="acoes"><button class="btn peq" type="button" id="ver">Ver como documento</button>
      <button class="btn peq" type="button" id="regerar">Atualizar texto com os dados</button></div></div>
      <div id="manual-aviso" class="aviso" hidden><span class="i">!</span><span>Você editou o texto à mão. Mudanças nos campos acima não entram sozinhas: use "Atualizar texto com os dados" (isso substitui suas edições).</span></div>
      <div class="campo"><label for="f-texto">Texto (## título, **negrito**, 1. item)</label><textarea class="texto" id="f-texto">${esc(c.conteudo)}</textarea></div>
      <div class="doc" id="previa" hidden></div>
    </section>

    <div class="card" style="background:linear-gradient(120deg,#ECFDF5,#ECFEFF)">
      <div class="acoes" style="justify-content:space-between">
        <div class="acoes">
          <button class="btn" type="button" id="revisao">${c.status === "revisao" ? "Voltar para rascunho" : "Marcar como em revisão"}</button>
          <button class="btn" type="button" id="imprimir">Imprimir ou salvar minuta em PDF</button>
          <button class="btn perigo" type="button" id="cancelar">Cancelar contrato</button>
        </div>
        <button class="btn p" type="button" id="enviar">Revisar e enviar para assinatura</button>
      </div></div>`;

  let manual = !!(c.dados && c.dados.texto_manual);
  const ta = $("f-texto");
  const lerDados = () => {
    app.querySelectorAll("[data-k]").forEach((el) => {
      const ks = el.dataset.k.split("."); let o = d;
      for (let i = 0; i < ks.length - 1; i++) o = o[ks[i]] ??= {};
      o[ks[ks.length - 1]] = el.value;
    });
    d.texto_manual = manual;
    return d;
  };
  const calc = () => {
    const v = numeroDe(d.valor), p = Math.round(Number(d.pct_ferias) || 0);
    $("calc").textContent = v ? `Mensal: R$ ${moeda(v)}${p < 100 ? ` · julho e dezembro: R$ ${moeda(v * p / 100)}` : ""}` : "";
  };
  $("manual-aviso").hidden = !manual;
  calc();

  let tempo = null, fila = Promise.resolve(true);
  const agendar = () => { $("salvo").textContent = "Alterações não salvas…"; clearTimeout(tempo); tempo = setTimeout(() => { salvar(); }, 900); };
  const salvar = () => (fila = fila.catch(() => false).then(salvarAgora));
  async function salvarAgora() {
    lerDados();
    const copia = $("f-copia").value.split(/[,;\s]+/).map((x) => x.trim().toLowerCase()).filter(Boolean);
    const ruins = copia.filter((x) => !emailOk(x));
    $("salvo").textContent = "Salvando…";
    const { error } = await supabase.from("contratos").update({
      titulo: $("f-titulo").value.trim() || c.titulo, dados: d, conteudo: ta.value,
      prazo_dias: Math.max(1, Math.min(60, parseInt($("f-prazo").value, 10) || 7)),
      copia_emails: copia.filter(emailOk),
    }).eq("id", c.id);
    if (error) { $("salvo").textContent = "Não salvou: " + error.message; return false; }
    const e2 = await sincronizarSignatarios(c.id, d);
    if (e2) { $("salvo").textContent = "Não salvou os signatários: " + e2; return false; }
    $("salvo").textContent = ruins.length ? `Salvo. E-mail de cópia ignorado: ${ruins.join(", ")}` : "Salvo";
    return true;
  }

  app.querySelectorAll("[data-k]").forEach((el) => el.addEventListener("input", () => {
    lerDados(); calc();
    if (!manual) ta.value = gerarTexto(d);
    agendar();
  }));
  ["f-titulo", "f-prazo", "f-copia"].forEach((id) => $(id).addEventListener("input", agendar));
  ta.addEventListener("input", () => { manual = true; $("manual-aviso").hidden = false; agendar(); });
  $("regerar").addEventListener("click", () => {
    if (manual && !confirm("Substituir o texto pelas informações dos campos? Suas edições manuais no texto serão perdidas.")) return;
    manual = false; $("manual-aviso").hidden = true; lerDados(); ta.value = gerarTexto(d); agendar();
  });
  $("ver").addEventListener("click", () => {
    const p = $("previa"), mostrar = p.hidden;
    p.innerHTML = renderizar(ta.value); p.hidden = !mostrar; ta.parentElement.hidden = mostrar;
    $("ver").textContent = mostrar ? "Editar o texto" : "Ver como documento";
  });
  $("voltar").addEventListener("click", async () => { clearTimeout(tempo); await salvar(); ir(null); });
  $("imprimir").addEventListener("click", () => imprimir(ta.value, c.titulo, null));
  $("revisao").addEventListener("click", async () => {
    clearTimeout(tempo); if (!(await salvar())) return;
    const novo = c.status === "revisao" ? "rascunho" : "revisao";
    const { error } = await supabase.from("contratos").update({ status: novo }).eq("id", c.id);
    if (error) return alerta(error.message);
    abrir(c.id);
  });
  $("cancelar").addEventListener("click", () => cancelar(c));
  $("enviar").addEventListener("click", async () => {
    clearTimeout(tempo); if (!(await salvar())) return;
    confirmarEnvio(c.id, d, ta.value);
  });
}

async function sincronizarSignatarios(contratoId, d) {
  const lista = signatariosDe(d).map((s) => ({ ...s, contrato_id: contratoId, nome: s.nome.trim() || `[${s.papel}]`, email: (s.email || "").trim().toLowerCase() }));
  // signatários só existem antes do envio e não são referenciados por nada: troca a lista inteira
  const { error: e1 } = await supabase.from("contrato_signatarios").delete().eq("contrato_id", contratoId);
  if (e1) return e1.message;
  const validos = lista.filter((s) => emailOk(s.email));
  if (!validos.length) return null;
  const { error: e2 } = await supabase.from("contrato_signatarios").insert(validos.map(({ contrato_id, ordem, nome, papel, email, cpf }) => {
    const d11 = String(cpf || "").replace(/\D/g, "");
    return { contrato_id, ordem, nome, papel, email, cpf_esperado: d11.length === 11 ? d11 : null };
  }));
  return e2 ? e2.message : null;
}

function confirmarEnvio(id, d, texto) {
  const sigs = signatariosDe(d);
  const problemas = [];
  sigs.forEach((s) => {
    if (!s.nome.trim()) problemas.push(`Falta o nome: ${s.papel}.`);
    if (!emailOk(s.email)) problemas.push(`E-mail inválido ou vazio: ${s.papel}${s.nome ? " (" + s.nome + ")" : ""}.`);
  });
  const emails = sigs.map((s) => s.email.trim().toLowerCase()).filter(Boolean);
  if (new Set(emails).size !== emails.length) problemas.push("Há e-mails repetidos entre os signatários.");
  const abertos = [...new Set((texto.match(/\[[^\]\n]{2,40}\]/g) || []))];
  dialogo(`
    <h2>Enviar para assinatura</h2>
    ${problemas.length ? `<div class="aviso alerta"><span class="i">!</span><span>${problemas.map(esc).join("<br>")}</span></div>` : ""}
    ${abertos.length ? `<div class="aviso"><span class="i">!</span><span>O texto ainda tem campos em aberto: ${abertos.map(esc).join(", ")}. Envie só se for proposital.</span></div>` : ""}
    <p class="lead" style="margin-bottom:10px">Cada pessoa recebe um link próprio por e-mail:</p>
    ${sigs.map((s) => `<div class="sig"><span class="t"><b>${esc(s.nome || "[sem nome]")}</b><small>${esc(s.papel)} · ${esc(s.email || "sem e-mail")}</small></span></div>`).join("")}
    <p class="lead" style="margin:14px 0">Ao enviar, o texto fica travado com uma impressão digital (SHA-256). Para mudar qualquer vírgula depois, é preciso cancelar e criar outro contrato.</p>
    <div class="acoes" style="justify-content:flex-end"><button class="btn" type="button" data-fechar>Voltar</button>
      <button class="btn p" type="button" id="ok-enviar"${problemas.length ? " disabled" : ""}>Travar e enviar</button></div>
    <p class="salvo" id="envio-msg" role="status"></p>`);
  const b = $("ok-enviar");
  b?.addEventListener("click", async () => {
    b.disabled = true; $("envio-msg").textContent = "Enviando…";
    const { data, error } = await supabase.functions.invoke("contrato-enviar", { body: { contrato_id: id } });
    if (error) { $("envio-msg").textContent = await erroDe(error); b.disabled = false; return; }
    const falhas = (data.signatarios || []).filter((x) => !x.ok);
    fecharDialogo();
    if (falhas.length) alerta(`Contrato travado, mas o e-mail não saiu para: ${falhas.map((x) => x.email).join(", ")}. Use "Reenviar link".`);
    abrir(id);
  });
}

// ---------- acompanhamento (depois do envio) ----------
function acompanhamento() {
  const { c, sigs, versoes, eventos } = atual;
  const v = versoes[0];
  const st = STATUS[c.status];
  const nomeSig = Object.fromEntries(sigs.map((s) => [s.id, s.nome]));
  const assinados = sigs.filter((s) => s.status === "assinado").length;
  app.innerHTML = `
    <div class="cab" style="margin-top:18px"><div>
      <button class="btn peq" type="button" id="voltar">Voltar para Contratos</button>
      <h1>${esc(c.titulo)}</h1>
      <p class="lead"><span class="tag ${st.tag}">${st.nome}</span> &nbsp;${assinados} de ${sigs.length} assinaturas</p></div>
      <div class="acoes"><button class="btn" type="button" id="imprimir">Imprimir ou salvar em PDF com evidências</button>
      ${c.status === "assinatura" ? `<button class="btn perigo" type="button" id="cancelar">Cancelar contrato</button>` : ""}</div></div>
    <div class="duas">
      <div class="principal">
        <section class="card"><h2>Assinaturas</h2>
          ${sigs.map((s) => `<div class="sig"><span class="ponto" data-st="${s.status === "assinado" ? "ok" : s.status === "visualizado" ? "and" : "pen"}"></span>
            <span class="t"><b>${esc(s.nome)}</b><small>${esc(s.papel)} · ${esc(s.email)}</small>
            <small>${s.status === "assinado" ? `Assinou em ${esc(dataHora(s.assinado_em))} · CPF ${esc(cpfMasc(s.cpf))} · IP ${esc(s.assinatura_ip || "")}` : `${esc(SIG[s.status] || s.status)}${s.token_expira ? ` · link vale até ${esc(dataHora(s.token_expira))}` : ""}`}</small></span>
            ${c.status === "assinatura" && s.status !== "assinado" ? `<button class="btn peq" type="button" data-reenviar="${esc(s.id)}">Reenviar link</button>` : ""}</div>`).join("")}
        </section>
        <section class="card"><h2>Registro de evidências</h2>
          <div class="tabela"><table><thead><tr><th>Data e hora</th><th>Evento</th><th>Quem</th><th>IP</th></tr></thead><tbody>
          ${eventos.map((e) => `<tr><td>${esc(dataHora(e.criado_em))}</td><td>${esc(EVENTO[e.tipo] || e.tipo)}</td><td>${esc(nomeSig[e.signatario_id] || (e.detalhe?.por ?? ""))}</td><td>${esc(e.ip || "")}</td></tr>`).join("")}
          </tbody></table></div></section>
        <section class="card"><h2>Texto assinado (versão ${esc(v?.numero ?? "")})</h2><div class="doc rolagem">${renderizar(v?.conteudo || c.conteudo)}</div></section>
      </div>
      <aside class="lado">
        <div class="hash"><div class="sobre" style="color:rgba(255,255,255,.7)">Impressão digital do documento</div>
          <code>${esc(v?.hash_sha256 || "")}</code><small>SHA-256 da versão travada em ${esc(dataHora(v?.travada_em))}. Qualquer alteração no texto muda este código.</small></div>
        <div class="card" style="margin-top:16px"><p class="lead" style="font-size:14px">As evidências não podem ser editadas nem apagadas pelo painel ou pela internet, nem por você. Cada registro guarda o código do anterior, e o código final vai por e-mail a todas as partes quando o contrato é concluído: é ele que permite provar, depois, que nada foi alterado.</p></div>
      </aside>
    </div>`;
  $("voltar").addEventListener("click", () => ir(null));
  $("imprimir").addEventListener("click", () => imprimir(v?.conteudo || c.conteudo, c.titulo, { v, sigs, eventos, nomeSig }));
  $("cancelar")?.addEventListener("click", () => cancelar(c));
  app.querySelectorAll("[data-reenviar]").forEach((b) => b.addEventListener("click", async () => {
    b.disabled = true; b.textContent = "Enviando…";
    const { error } = await supabase.functions.invoke("contrato-enviar", { body: { acao: "reenviar", signatario_id: b.dataset.reenviar } });
    if (error) { alerta(await erroDe(error)); b.disabled = false; b.textContent = "Reenviar link"; return; }
    abrir(c.id);
  }));
}

function cancelar(c) {
  dialogo(`<h2>Cancelar este contrato?</h2>
    <p class="lead">Os links de assinatura param de funcionar. O contrato e as evidências continuam guardados, mas não dá para reativar: para enviar de novo, crie outro contrato.</p>
    <div class="acoes" style="justify-content:flex-end;margin-top:16px"><button class="btn" type="button" data-fechar>Manter</button>
    <button class="btn perigo" type="button" id="ok-cancelar">Cancelar contrato</button></div>`);
  $("ok-cancelar").addEventListener("click", async () => {
    const { error } = await supabase.from("contratos").update({ status: "cancelado" }).eq("id", c.id);
    fecharDialogo();
    if (error) return alerta(error.message);
    abrir(c.id);
  });
}

// ---------- impressão (o navegador salva em PDF) ----------
function imprimir(texto, titulo, ev) {
  const el = $("impressao");
  el.innerHTML = `<div class="doc">${renderizar(texto)}</div>` + (ev ? `
    <h2 class="sec">Registro de assinaturas e evidências</h2>
    <p>Documento: ${esc(titulo)} · versão ${esc(ev.v?.numero ?? "")} · SHA-256 ${esc(ev.v?.hash_sha256 || "")}</p>
    <table><thead><tr><th>Signatário</th><th>Situação</th><th>CPF</th><th>IP</th></tr></thead><tbody>
    ${ev.sigs.map((s) => `<tr><td>${esc(s.nome)}<br><small>${esc(s.papel)} · ${esc(s.email)}</small></td><td>${s.status === "assinado" ? "Assinou em " + esc(dataHora(s.assinado_em)) : esc(SIG[s.status] || s.status)}</td><td>${esc(cpfMasc(s.cpf))}</td><td>${esc(s.assinatura_ip || "")}</td></tr>`).join("")}
    </tbody></table>
    <table style="margin-top:14px"><thead><tr><th>Data e hora</th><th>Evento</th><th>Quem</th><th>IP</th><th>Código do registro</th></tr></thead><tbody>
    ${ev.eventos.map((e) => `<tr><td>${esc(dataHora(e.criado_em))}</td><td>${esc(EVENTO[e.tipo] || e.tipo)}</td><td>${esc(ev.nomeSig[e.signatario_id] || "")}</td><td>${esc(e.ip || "")}</td><td class="mono">${esc(e.hash || "")}</td></tr>`).join("")}
    </tbody></table>` : "");
  window.print();
}

// ---------- utilidades de tela ----------
function cpfMasc(c) { const d = String(c || ""); return d.length === 11 ? `•••.•••.${d.slice(6, 9)}-${d.slice(9)}` : ""; }
function dialogo(html) {
  const dlg = $("dlg"); $("dlg-corpo").innerHTML = html;
  dlg.querySelectorAll("[data-fechar]").forEach((b) => b.addEventListener("click", fecharDialogo));
  dlg.showModal();
}
function fecharDialogo() { $("dlg").close(); }
function alerta(msg) { dialogo(`<h2>Atenção</h2><p class="lead">${esc(msg)}</p><div class="acoes" style="justify-content:flex-end;margin-top:16px"><button class="btn p" type="button" data-fechar>Entendi</button></div>`); }
async function erroDe(error) {
  try { const j = await error.context?.json(); if (j?.erro) return j.erro; } catch (_) {}
  return error.message || "Não foi possível concluir agora.";
}
