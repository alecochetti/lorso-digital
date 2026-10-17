/* =====================================================================
   Áreas administrativas: quem pede ao marketing
   Não avalia a área em si. Mede o que ela demanda do marketing, em quanto
   tempo recebe e onde trava: base da volumetria (administrativo e projetos
   x captação) e do SLA até a arte final.
   Não entra na maturidade do marketing: tem leitura própria em Resultados.
   ===================================================================== */
ICO.solicitantes=ICO.sistemas;
const SOL_TIPOS=['Peças e artes','Comunicação interna e endomarketing','Eventos','Site e landing pages','Campanha de captação','Vídeo','Redes sociais','Impressos'];
const SOL_CANAIS=['E-mail','WhatsApp','Sistema ou formulário','Reunião','Pedido verbal'];
const SOL_COMUM=[['ouvido','Quem foi ouvido (nome e cargo)','tx'],['dem_mes','Pedidos ao marketing por mês','n'],['sla_comb','Prazo combinado até a arte final','d'],['sla_real','Prazo real médio até a arte final','d'],['no_prazo','Pedidos entregues no prazo','%'],['ajustes','Rodadas de ajuste por pedido, em média','n'],['satisf','Satisfação com o atendimento do marketing (1 a 5)','n']];
const SOL_AREAS=[
 {id:'financeiro',nome:'Financeiro',foco:'Liberação da verba: pedido de compra, cartão e aprovação do gestor de marketing depois de Compras.',
  extra:[['lib_dias','Tempo médio para liberar uma verba ou pedido','d'],['lib_fluxo','Como a verba é liberada hoje (passo a passo)','t']]},
 {id:'rh',nome:'RH',foco:'Pedidos de comunicação interna, eventos e endomarketing.',
  extra:[['endo_mes','Pedidos de endomarketing e eventos internos por mês','n']]},
 {id:'ti',nome:'Tecnologia',foco:'Pedidos de comunicação e de site que passam pelo marketing.',
  extra:[['site_dias','Tempo para publicar uma página ou mudança no site','d']]},
 {id:'compras',nome:'Compras',foco:'Se o processo de compras é respeitado e quanto tempo leva.',
  extra:[['proc','O processo de compras é respeitado?','sel',['Sempre','Na maioria das vezes','Raramente']],['compra_dias','Tempo médio de uma compra do marketing','d']]},
 {id:'projetos',nome:'Projetos',foco:'Projetos e manutenção definidos nas reuniões quinzenais com os gestores administrativos.',
  extra:[['proj_and','Projetos em andamento que dependem do marketing','n'],['proj_atr','Desses, quantos estão atrasados','n']]},
 {id:'secretaria',nome:'Secretaria acadêmica',foco:'Só a passagem de bastão: edital, site, inscrições, prova e matriculado.',
  extra:[['b_edital','Do edital pronto até ele estar no site','d'],['b_insc','Da abertura das inscrições até a prova','d'],['b_result','Da prova até o resultado','d'],['b_mat','Do resultado até a matrícula efetivada','d']]},
 {id:'asa',nome:'ASA (matrícula e atendimento)',foco:'Funil de inscrito a matriculado e pedidos de briefing e peças ao marketing.',
  extra:[['insc','Inscritos no ciclo','n'],['mat','Matriculados no ciclo','n'],['contato_h','Tempo até o primeiro contato com o inscrito','h']]}
];
const solK=(a,k)=>`sol.${a}.${k}`;
const solV=(a,k)=>num(cur.campos[solK(a,k)]);
const solTipos=a=>String(cur.campos[solK(a,'tipos')]||'').split('|').filter(Boolean);

function solCampo(a,[k,l,t,ops]){
  const key=solK(a,k), v=cur.campos[key]??'';
  if(t==='t') return `<div class="field wide"><label for="c-${key}">${esc(l)}</label><textarea id="c-${key}" data-campo="${key}" rows="2">${esc(v)}</textarea></div>`;
  if(t==='tx') return `<div class="field"><label for="c-${key}">${esc(l)}</label><input id="c-${key}" data-campo="${key}" value="${esc(v)}"></div>`;
  if(t==='sel') return `<div class="field"><label for="c-${key}">${esc(l)}</label><select id="c-${key}" data-campo="${key}"><option value=""></option>${ops.map(o=>`<option ${v===o?'selected':''}>${o}</option>`).join('')}</select></div>`;
  const u={'d':'dias','%':'%','h':'horas','n':''}[t]||'';
  return `<div class="field"><label for="c-${key}">${esc(l)}</label><div class="inu"><input id="c-${key}" data-campo="${key}" inputmode="decimal" value="${esc(v)}" placeholder="0">${u?`<span class="u">${u}</span>`:''}</div></div>`;
}

/* volumetria: UNs (da entrevista da UN) + áreas administrativas */
function volumetria(){
  const unsL=UNS.map(u=>({id:u.id,nome:u.nome,tipo:'un',dem:num(cur.campos[`${u.id}.dem_mkt`]),atr:num(cur.campos[`${u.id}.dem_atraso`])}));
  const adm=SOL_AREAS.map(a=>({id:a.id,nome:a.nome,tipo:'adm',dem:solV(a.id,'dem_mes'),comb:solV(a.id,'sla_comb'),real:solV(a.id,'sla_real'),prazo:solV(a.id,'no_prazo'),satisf:solV(a.id,'satisf')}));
  const tot=L=>L.reduce((s,x)=>s+(x.dem||0),0), tU=tot(unsL), tA=tot(adm);
  const sla=adm.filter(x=>x.comb&&x.real), slaR=sla.length?sla.reduce((s,x)=>s+x.real/x.comb,0)/sla.length:null;
  const ts=typeof tempoStats==='function'?tempoStats():null;
  const pAdmProj=ts?(ts.p.adm||0)+(ts.p.projetos||0):null;
  return {unsL,adm,tU,tA,pAdmDem:tU+tA?tA/(tU+tA):null,slaR,ts,pAdmProj,piores:sla.filter(x=>x.real>1.5*x.comb).sort((x,y)=>y.real/y.comb-x.real/x.comb)};
}

function renderSolicitantes(){
  const a=SOL_AREAS.find(x=>x.id===ui.solArea)||SOL_AREAS[0], V=volumetria();
  const prog=x=>[...SOL_COMUM,...x.extra].filter(([k])=>cur.campos[solK(x.id,k)]!=null&&cur.campos[solK(x.id,k)]!=='').length/([...SOL_COMUM,...x.extra].length);
  $('#main').innerHTML=`<section class="panel">
   <header class="ph" style="grid-template-columns:minmax(0,1fr)"><div><span class="eyebrow">Passo 3 · <b>Entrevistas</b></span><h2 style="margin-top:8px">Áreas administrativas</h2><p class="lead">Não avaliamos a área. Medimos o que ela pede ao marketing, em quanto tempo recebe e onde trava. É a base da volumetria: quanto do marketing vai para administrativo e projetos e quanto vai para captação.</p></div></header>
   <div class="stats bu-k">
    <div class="stat"><b>${V.tA?V.tA.toLocaleString('pt-BR'):'—'}</b><span>pedidos por mês das áreas administrativas</span>${V.tU?`<small>${V.tU.toLocaleString('pt-BR')} das UNs</small>`:''}</div>
    <div class="stat ${V.pAdmDem!=null&&V.pAdmDem>=0.4?'warn':''}"><b>${V.pAdmDem!=null?pct(V.pAdmDem):'—'}</b><span>dos pedidos vêm do administrativo</span></div>
    <div class="stat ${V.slaR!=null&&V.slaR>1.5?'bad':''}"><b>${V.slaR!=null?V.slaR.toFixed(1).replace('.',',')+'x':'—'}</b><span>prazo real / prazo combinado</span></div>
    <div class="stat"><b>${V.pAdmProj!=null?pct(V.pAdmProj):'—'}</b><span>das horas em administrativo e projetos</span><small>de Gestão de demandas</small></div>
   </div>
   <nav class="subtabs bu-tabs" aria-label="Áreas">${SOL_AREAS.map(x=>`<button class="${x.id===a.id?'on':''}" data-act="sol-area" data-v="${x.id}">${esc(x.nome)}${prog(x)?` <span class="bu-n">${Math.round(prog(x)*100)}%</span>`:''}</button>`).join('')}</nav>
   <section class="block"><div class="block-h"><h3>${esc(a.nome)}</h3><p>${esc(a.foco)}</p></div>
    <div class="fields">${SOL_COMUM.map(c=>solCampo(a.id,c)).join('')}</div>
    <div class="dsec"><b>Tipos de pedido mais comuns</b><div class="pchips">${SOL_TIPOS.map(t=>`<label class="mktag ${solTipos(a.id).includes(t)?'on':''}"><input type="checkbox" data-sol-tipo="${a.id}" value="${esc(t)}" ${solTipos(a.id).includes(t)?'checked':''}> ${t}</label>`).join('')}</div></div>
    <div class="fields">${solCampo(a.id,['canal','Como pede ao marketing','sel',SOL_CANAIS])}${a.extra.map(c=>solCampo(a.id,c)).join('')}${solCampo(a.id,['gargalo','Onde o pedido mais trava','t'])}${solCampo(a.id,['obs','Observações da conversa','t'])}</div>
   </section>
   ${volumetriaHtml(true)}
  </section>`;
}

function volumetriaHtml(naTela){
  const V=volumetria(); const L=[...V.unsL,...V.adm].filter(x=>x.dem);
  if(!L.length) return naTela?'':'';
  const max=Math.max(...L.map(x=>x.dem));
  return `<section class="block"><div class="block-h"><h3>Volumetria demandada ao marketing</h3><p>Pedidos por mês de cada UN e área administrativa${V.ts?' e o tempo do marketing por frente':''}.</p></div>
   <div class="chart">${L.sort((x,y)=>y.dem-x.dem).map(x=>`<div class="crow"><span class="nm">${esc(x.nome)}</span><div class="track"><span style="width:${(x.dem/max*100).toFixed(1)}%;min-width:4px;background:${x.tipo==='adm'?'var(--n2)':'var(--n3)'}"></span></div><span class="num" style="font-size:12px">${x.dem.toLocaleString('pt-BR')}${x.tipo==='adm'&&x.comb&&x.real?` · ${x.real} de ${x.comb} dias`:''}</span></div>`).join('')}</div>
   <div class="legend"><span class="lg"><i style="background:var(--n3)"></i>Unidades de negócio (captação)</span><span class="lg"><i style="background:var(--n2)"></i>Áreas administrativas</span></div>
   ${V.piores.length?`<p class="pz-aviso"><span class="i">!</span><span>Prazo real bem acima do combinado: ${V.piores.slice(0,3).map(x=>`${esc(x.nome)} (${x.real} dias contra ${x.comb} combinados)`).join('; ')}.</span></p>`:''}
  </section>`;
}

function solicitantesClick(act,d){
  if(act==='sol-area'){ ui.solArea=d.v; render(); return true; }
  return false;
}
document.addEventListener('change',e=>{ const t=e.target; if(!t||!t.dataset||!t.dataset.solTipo||!cur) return; const a=t.dataset.solTipo; const s=new Set(solTipos(a)); t.checked?s.add(t.value):s.delete(t.value); cur.campos[solK(a,'tipos')]=[...s].join('|'); touch(true); });

/* Regra: o administrativo consome o marketing e atrasa a captação */
if(typeof RULES!=='undefined'){
  RULES.push({id:'CRZ-67',sev:'alta',pad:'Gargalo de capacidade',areas:()=>['demandas'],t:'O administrativo consome o marketing e o prazo real estoura o combinado',
    test:()=>{ const V=volumetria(); return (V.pAdmDem!=null&&V.pAdmDem>=0.4&&V.tA>=10)||(V.slaR!=null&&V.slaR>=1.5); },
    txt:()=>{ const V=volumetria(); const p=[]; if(V.pAdmDem!=null&&V.pAdmDem>=0.4) p.push(`${pct(V.pAdmDem)} dos pedidos ao marketing vêm das áreas administrativas (${V.tA} por mês, contra ${V.tU} das UNs)`); if(V.slaR!=null&&V.slaR>=1.5) p.push(`o prazo real até a arte final é ${V.slaR.toFixed(1).replace('.',',')} vezes o combinado${V.piores.length?`, pior em ${V.piores.slice(0,2).map(x=>x.nome).join(' e ')}`:''}`); return p.join(' e ')+'. Com o time ocupado no administrativo, a captação recebe o que sobra.'; },
    rec:['Fila separada para pedidos administrativos, com prazo e limite por mês','Catálogo de pedidos com prazo padrão por tipo (arte, evento, site)','Pedido só entra com briefing completo, pelo mesmo canal']});
  const _bl=typeof BLOCOS!=='undefined'&&BLOCOS.find(b=>b.id==='capacidade'); if(_bl) _bl.rules.push('CRZ-67');
}
