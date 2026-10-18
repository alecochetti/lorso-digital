// Leitura segura do texto do contrato (tela e impressão). Usado pela página pública de assinatura:
// não importa nada além disto.
export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

export function renderizar(texto) {
  const negrito = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
  const out = [];
  let lista = null;
  const fechar = () => { if (lista) { out.push(`<ol>${lista.join("")}</ol>`); lista = null; } };
  for (const bruto of String(texto ?? "").split(/\r?\n/)) {
    const l = bruto.trimEnd();
    if (!l.trim()) { fechar(); continue; }
    let m;
    if ((m = l.match(/^#\s+(.*)/))) { fechar(); out.push(`<h1>${negrito(m[1])}</h1>`); }
    else if ((m = l.match(/^##\s+(.*)/))) { fechar(); out.push(`<h2>${negrito(m[1])}</h2>`); }
    else if ((m = l.match(/^\s*\d+\.\s+(.*)/)) && !/^\s*\d+\.\d/.test(l)) { (lista ||= []).push(`<li>${negrito(m[1])}</li>`); }
    else { fechar(); out.push(`<p>${negrito(l)}</p>`); }
  }
  fechar();
  return out.join("\n");
}

