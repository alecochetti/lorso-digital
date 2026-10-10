/* =====================================================================
   PDI Marketing · avaliação individual do time de marketing do cliente
   Entra quem foi entrevistado com a marca MKT. Só a equipe LORSO vê
   (tabela avaliacoes com RLS is_equipe). Não entra em relatório nem PPTX.
   Carregado depois de app.js.
   ===================================================================== */
ICO.pdi='M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM17 11l2 2 4-4';
const PDI_COMP=[['entrega','Entrega e prazos','Cumpre o combinado e avisa antes de atrasar'],['qualidade','Qualidade técnica','Domina o que faz; pouco retrabalho'],['atendimento','Atendimento ao cliente interno','Escuta, negocia e acompanha quem pede'],['autonomia','Autonomia e proatividade','Resolve sem depender do gestor e propõe melhorias'],['colaboracao','Colaboração e comunicação','Passa o bastão com contexto; trabalha bem em equipe'],['dados','Dados e ferramentas','Usa dados e sistemas para decidir e entregar'],['aprendizado','Aprendizado e adaptação','Aprende rápido e acompanha as mudanças']];
const PDI_ESC=['','Abaixo do esperado','Em desenvolvimento','Atende','Supera'];
const PDI_POT=['','Baixo','Médio','Alto'];
const PDI_CRIT=['Indispensável','Importante','Substituível','Dispensável'];
const PDI_DEC=[['Manter','var(--n4)'],['Mudar de função ou posição','var(--n3)'],['Avaliar aumento','var(--brand-2)'],['Plano de desenvolvimento','var(--n2)'],['Desligar','var(--n1)']];
const PDI_9=[['Enigma','Forte potencial','Estrela'],['Questionável','Mantenedor','Forte desempenho'],['Insuficiente','Eficaz','Profissional confiável']]; // linhas: potencial alto → baixo; colunas: desempenho baixo → alto
let pdiSt={diag:null,map:{},carregando:false,aberta:null}, pdiT={};

const pdiKey=nome=>slugN(nome);
function pdiPessoas(){ if(!cur)return [];
  const g={}; cur.entrevistas.filter(e=>e.mkt&&(e.nome||'').trim()).forEach(e=>{ const k=pdiKey(e.nome); const p=g[k]||(g[k]={key:k,nome:e.nome.trim(),cargos:new Set(),areas:new Set()}); if(e.cargo)p.cargos.add(e.cargo); if(e.area)p.areas.add(e.area); });
  return Object.values(g).map(p=>({...p,cargos:[...p.cargos],areas:[...p.areas]})).sort((a,b)=>a.nome.localeCompare(b.nome)); }
async function pdiLoad(){ if(!cur||pdiSt.carregando)return; const id=cur.id; pdiSt={diag:id,map:{},carregando:true,aberta:null};
  const r=await sb.from('avaliacoes').select('*').eq('diagnostico_id',id);
  if(!cur||cur.id!==id)return; pdiSt.carregando=false;
  if(r.error){ console.warn('avaliacoes',r.error.message); toast('Não foi possível carregar as avaliações'); }
  (r.data||[]).forEach(x=>pdiSt.map[x.pessoa]=x.dados||{}); render(); }
const pdiD=k=>pdiSt.map[k]||(pdiSt.map[k]={});
function pdiSave(k,now){ clearTimeout(pdiT[k]); const id=cur.id, dados=pdiD(k); const go=async()=>{ const r=await sb.from('avaliacoes').upsert({diagnostico_id:id,pessoa:k,dados,updated_at:new Date().toISOString()}); if(r.error) toast('Não foi possível salvar a avaliação: '+r.error.message); }; if(now) go(); else pdiT[k]=setTimeout(go,600); }

/* ---------- cálculo ---------- */
function pdiScore(d){ const v=PDI_COMP.map(([k])=>d.comp&&d.comp[k]).filter(Boolean); return v.length?v.reduce((a,b)=>a+b,0)/v.length:null; }
const pdiFaixa=s=>s==null?null:s<2?0:s<3?1:2;
function pdiEvid(p){
  const areas=p.areas.map(a=>({id:a,nome:nameOf(a),lv:L(a),pe:P(a,'E')}));
  const nm=p.nome.toLowerCase(); const dores=cur.dores.filter(d=>(d.quem||'').trim().toLowerCase()===nm);
  return {areas,dores}; }
function pdiTime(){
  const P=pdiPessoas().map(p=>{ const d=pdiSt.map[p.key]||{}; return {...p,d,score:pdiScore(d),custo:num(d.custo)}; });
  const aval=P.filter(x=>x.score!=null||x.d.decisao);
  const custo=P.reduce((a,x)=>a+(x.custo||0),0), custoDep=P.filter(x=>x.d.decisao!=='Desligar').reduce((a,x)=>a+(x.custo||0),0);
  const sai=P.filter(x=>x.d.decisao==='Desligar').length;
  const disp=P.filter(x=>x.d.crit==='Dispensável'), custoDisp=disp.reduce((a,x)=>a+(x.custo||0),0);
  const box=[[[],[],[]],[[],[],[]],[[],[],[]]]; P.forEach(x=>{ const f=pdiFaixa(x.score), pt=num(x.d.pot); if(f!=null&&pt) box[3-pt][f].push(x); });
  const med=aval.filter(x=>x.score!=null); return {P,aval,custo,custoDep,sai,disp,custoDisp,box,media:med.length?med.reduce((a,x)=>a+x.score,0)/med.length:null}; }

/* ---------- telas ---------- */
const pdiDecPill=dec=>{ const c=(PDI_DEC.find(x=>x[0]===dec)||[])[1]; return dec?`<span class="pdec" style="--c:${c}">${esc(dec)}</span>`:'<span class="pdec vazio">Sem decisão</span>'; };
function pdiNineBox(T){
  return `<div class="nbox" role="img" aria-label="Matriz desempenho por potencial"><span class="ny">Potencial →</span>
   ${T.box.map((row,i)=>row.map((cel,j)=>`<div class="nc r${i} c${j} ${i===0&&j===2?'top':i===2&&j===0?'low':''}"><small>${PDI_9[i][j]}</small><div>${cel.map(x=>`<button class="nchip" data-act="pdi-abrir" data-v="${x.key}" title="${esc(x.nome)}: desempenho ${dec(x.score)}">${esc(initials(x.nome))}</button>`).join('')}</div></div>`).join('')).join('')}
   <span class="nx">Desempenho →</span></div>`; }
function pdiCard(x){ const ev=pdiEvid(x);
  return `<button class="pcard" data-act="pdi-abrir" data-v="${x.key}"><div class="ph1"><span class="av">${esc(initials(x.nome))}</span><div><b>${esc(x.nome)}</b><small>${esc(x.cargos.join(' · ')||'Cargo não informado')}</small></div>${x.score!=null?`<span class="psc l${pdiFaixa(x.score)}">${dec(x.score)}</span>`:''}</div>
   <div class="ktags">${ev.areas.map(a=>`<span class="tag">${esc(a.nome)}${a.lv?` · N${a.lv}`:''}</span>`).join('')}${ev.dores.length?`<span class="tag alta">${pl(ev.dores.length,'dor relatada','dores relatadas')}</span>`:''}</div>
   <div class="pf">${pdiDecPill(x.d.decisao)}${x.d.crit?`<span class="tag ${x.d.crit==='Indispensável'?'ok':x.d.crit==='Dispensável'?'alta':''}">${esc(x.d.crit)}</span>`:''}${x.custo?`<span class="muted mono" style="margin-left:auto;font-size:12px">${brl(x.custo)}/mês</span>`:''}</div></button>`; }
function pdiDrawer(){ const k=pdiSt.aberta; if(!k)return ''; const p=pdiPessoas().find(x=>x.key===k); if(!p){ pdiSt.aberta=null; return ''; }
  const d=pdiD(k), ev=pdiEvid(p), sc=pdiScore(d), acs=d.acoes||[];
  const sel=(f,ops,ph)=>`<select data-pdi="${f}" data-k="${k}"><option value="">${ph||'—'}</option>${ops.map(o=>`<option ${d[f]===o?'selected':''}>${esc(o)}</option>`).join('')}</select>`;
  return `<div class="drawer-back" data-act="pdi-fechar"></div><aside class="drawer pdid" role="dialog" aria-label="Avaliação de ${esc(p.nome)}"><div class="dh"><span class="eyebrow"><b>PDI Marketing</b></span><button class="xbtn" data-act="pdi-fechar" aria-label="Fechar">×</button></div>
   <div class="ph1 big"><span class="av">${esc(initials(p.nome))}</span><div><b>${esc(p.nome)}</b><small>${esc(p.cargos.join(' · ')||'Cargo não informado')}</small></div>${sc!=null?`<span class="psc l${pdiFaixa(sc)}">${dec(sc)}</span>`:''}</div>
   <div class="dsec pev"><b>O que o diagnóstico mostra</b>
    ${ev.areas.map(a=>`<div class="pevr"><span>${esc(a.nome)}</span>${a.lv?`<span class="lv l${a.lv}">N${a.lv}</span>`:'<span class="muted">sem nota</span>'}<small>${a.pe!=null?'Pessoas '+dec(a.pe):''}</small></div>`).join('')}
    ${ev.dores.length?`<div class="pdor"><small>Dores que relatou</small>${ev.dores.slice(0,4).map(x=>`<p>${esc(x.txt)}</p>`).join('')}</div>`:'<small class="muted">Nenhuma dor registrada em nome desta pessoa.</small>'}</div>
   <div class="dsec"><b>Competências <span class="muted">${sc!=null?'média '+dec(sc):'1 a 4'}</span></b>
    ${PDI_COMP.map(([c,l,ds])=>{ const v=d.comp&&d.comp[c]; return `<div class="pcomp"><div><span>${esc(l)}</span><small>${esc(ds)}</small></div><div class="seg4" role="group" aria-label="${esc(l)}">${[1,2,3,4].map(n=>`<button class="${v===n?'on l'+n:''}" data-act="pdi-comp" data-k="${k}" data-c="${c}" data-n="${n}" title="${PDI_ESC[n]}" aria-pressed="${v===n}">${n}</button>`).join('')}</div></div>`; }).join('')}
    <div class="pcomp"><div><span>Potencial</span><small>Capacidade de crescer e assumir mais</small></div><div class="seg4 s3" role="group" aria-label="Potencial">${[1,2,3].map(n=>`<button class="${num(d.pot)===n?'on l'+(n+1):''}" data-act="pdi-pot" data-k="${k}" data-n="${n}" aria-pressed="${num(d.pot)===n}">${PDI_POT[n]}</button>`).join('')}</div></div></div>
   <div class="dgrid"><label>Criticidade${sel('crit',PDI_CRIT)}</label><label>Minha decisão${sel('decisao',PDI_DEC.map(x=>x[0]))}</label>
    <label>Custo mensal (salário + encargos)<input data-pdi="custo" data-k="${k}" inputmode="decimal" value="${esc(d.custo||'')}" placeholder="R$"></label><label>Tempo de casa<input data-pdi="tempo" data-k="${k}" value="${esc(d.tempo||'')}" placeholder="Ex.: 3 anos"></label></div>
   <div class="dsec"><b>Pontos fortes</b><textarea data-pdi="fortes" data-k="${k}" rows="2">${esc(d.fortes||'')}</textarea></div>
   <div class="dsec"><b>Pontos a desenvolver</b><textarea data-pdi="desenv" data-k="${k}" rows="2">${esc(d.desenv||'')}</textarea></div>
   <div class="dsec"><b>Minha observação</b><textarea data-pdi="obs" data-k="${k}" rows="3" placeholder="Por que mantenho, mudo de função, avalio aumento ou desligo">${esc(d.obs||'')}</textarea></div>
   <div class="dsec"><b>Ações do PDI</b>${acs.map(a=>`<div class="sub"><input type="checkbox" data-pdiac="${a.id}" data-k="${k}" ${a.ok?'checked':''} aria-label="Concluir ação"><span class="${a.ok?'okline':''}">${esc(a.t)}</span>${a.prazo?`<small class="muted">${a.prazo.split('-').reverse().join('/')}</small>`:''}<button class="xbtn" data-act="pdi-acdel" data-k="${k}" data-v="${a.id}" aria-label="Remover">×</button></div>`).join('')}
    <form class="addline" data-pdiform="${k}"><input name="t" placeholder="Ex.: Curso de gestão de projetos"><input name="prazo" type="date" aria-label="Prazo" style="max-width:150px"><button class="btn sm" type="submit">+</button></form></div>
   <div class="dfoot"><span class="muted" style="font-size:12.5px">Visível só para a equipe LORSO.</span><button class="btn primary" data-act="pdi-fechar">Pronto</button></div></aside>`; }
function renderPdi(){
  if(pdiSt.diag!==cur.id){ pdiLoad(); }
  const T=pdiTime();
  const decs=PDI_DEC.map(([n,c])=>{ const L=T.P.filter(x=>x.d.decisao===n); return {n,c,q:L.length,custo:L.reduce((a,x)=>a+(x.custo||0),0)}; });
  $('#main').innerHTML=`<section class="panel">
   <header class="ph" style="grid-template-columns:minmax(0,1fr)"><div><span class="eyebrow">Operação · <b>Só equipe LORSO</b></span><h2 style="margin-top:8px">PDI Marketing</h2><p class="lead">Avaliação individual de quem trabalha no marketing do cliente, cruzada com o que apareceu no diagnóstico. Entra aqui todo entrevistado marcado com <b>MKT</b>. O cliente não vê esta tela.</p></div></header>
   ${pdiSt.carregando?'<p class="muted">Carregando avaliações…</p>':''}
   ${!T.P.length?`<section class="block"><p class="empty">Ninguém marcado ainda. Nas Entrevistas, marque <b>MKT</b> ao lado de cada pessoa do time de marketing e ela aparece aqui.</p><button class="btn" data-act="dstep" data-v="entrevistas">Ir para Entrevistas</button></section>`:`
   <div class="stats"><div class="stat"><span class="si">${ico('equipe',20)}</span><b>${T.P.length}</b><span>pessoas no time</span><small>${T.aval.length} avaliadas</small></div>
    <div class="stat"><span class="si">${ico('alvo',20)}</span><b>${T.media!=null?dec(T.media):'—'}</b><span>desempenho médio</span><small>de 1 a 4</small></div>
    <div class="stat"><span class="si">${ico('dre',20)}</span><b>${T.custo?brl(T.custo):'—'}</b><span>custo mensal do time</span>${T.custo&&T.sai?`<small>${brl(T.custoDep)} depois das decisões</small>`:''}</div>
    <div class="stat ${T.disp.length?'bad':''}"><span class="si">${ico('alerta',20)}</span><b>${T.disp.length}</b><span>marcadas como dispensáveis</span>${T.custoDisp?`<small>${brl(T.custoDisp)} por mês</small>`:''}</div></div>
   ${T.sai||T.disp.length?`<section class="block pconc"><p>${T.sai?`Com as decisões de hoje, o time passa de <b>${T.P.length}</b> para <b>${T.P.length-T.sai}</b> ${T.P.length-T.sai===1?'pessoa':'pessoas'}${T.custo?` e o custo mensal de <b>${brl(T.custo)}</b> para <b>${brl(T.custoDep)}</b>`:''}.`:''} ${T.disp.length?`${pl(T.disp.length,'pessoa está marcada','pessoas estão marcadas')} como dispensável${T.disp.length>1?'is':''}${T.custoDisp&&T.custo?`, somando ${pct(T.custoDisp/T.custo)} do custo do time`:''}.`:''}</p></section>`:''}
   <div class="rx-two"><section class="block"><div class="block-h"><h3>Desempenho x potencial</h3><p>Quem está em cada quadrante</p></div>${pdiNineBox(T)}</section>
    <section class="block"><div class="block-h"><h3>Decisões</h3><p>Quantas pessoas e quanto custam por mês</p></div><div class="pdecs">${decs.map(x=>`<div class="pdr"><span class="pdec" style="--c:${x.c}">${esc(x.n)}</span><span class="b"><i style="width:${T.P.length?x.q/T.P.length*100:0}%;background:${x.c}"></i></span><b>${x.q}</b><small class="mono">${x.custo?brl(x.custo):''}</small></div>`).join('')}<div class="pdr"><span class="pdec vazio">Sem decisão</span><span class="b"><i style="width:${T.P.length?T.P.filter(x=>!x.d.decisao).length/T.P.length*100:0}%;background:var(--line-2)"></i></span><b>${T.P.filter(x=>!x.d.decisao).length}</b><small></small></div></div></section></div>
   <section class="block"><div class="block-h"><h3>Pessoas</h3><p>Clique para avaliar</p></div><div class="pcards">${T.P.map(pdiCard).join('')}</div></section>`}
  </section>${pdiDrawer()}`; }

/* ---------- eventos ---------- */
function pdiClick(act,d){
  if(act==='pdi-abrir'){ pdiSt.aberta=d.v; render(); return true; }
  if(act==='pdi-fechar'){ if(pdiSt.aberta) pdiSave(pdiSt.aberta,true); pdiSt.aberta=null; render(); return true; }
  if(act==='pdi-comp'){ const x=pdiD(d.k); x.comp=x.comp||{}; const n=+d.n; x.comp[d.c]=x.comp[d.c]===n?null:n; pdiSave(d.k); render(); return true; }
  if(act==='pdi-pot'){ const x=pdiD(d.k); x.pot=num(x.pot)===+d.n?null:+d.n; pdiSave(d.k); render(); return true; }
  if(act==='pdi-acdel'){ const x=pdiD(d.k); x.acoes=(x.acoes||[]).filter(a=>a.id!==d.v); pdiSave(d.k); render(); return true; }
  return false; }
function pdiChange(t){ const d=t.dataset;
  if(d.pdi!=null&&t.tagName==='SELECT'){ pdiD(d.k)[d.pdi]=t.value; pdiSave(d.k); render(); return true; }
  if(d.pdiac!=null){ const x=pdiD(d.k); const a=(x.acoes||[]).find(y=>y.id===d.pdiac); if(a){ a.ok=t.checked; pdiSave(d.k); render(); } return true; }
  return d.pdi!=null; }
function pdiInput(t){ const d=t.dataset; if(d.pdi==null||t.tagName==='SELECT')return false; pdiD(d.k)[d.pdi]=t.value; pdiSave(d.k); return true; }
function pdiSubmit(f){ const k=f.dataset.pdiform; if(k==null)return false; const v=(f.t.value||'').trim(); if(!v)return true; const x=pdiD(k); x.acoes=x.acoes||[]; x.acoes.push({id:uid(),t:v,prazo:f.prazo.value||'',ok:false}); pdiSave(k,true); render(); const el=document.querySelector('form[data-pdiform] input[name="t"]'); el&&el.focus(); return true; }
