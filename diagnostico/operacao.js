/* =====================================================================
   Operação e atendimento às unidades
   SLA por tipo de demanda · passagem de bastão por etapa · grupos de campanha
   Carregado depois de app.js: usa cur, num, pct, dec, brl, esc, RULES e BLOCOS.
   ===================================================================== */

/* ---------- SLA por tipo de demanda (área Gestão de demandas) ---------- */
const SLA_TIPOS=[['post','Post ou arte para redes'],['video','Vídeo'],['lp','Landing page ou site'],['email','E-mail marketing'],['midia','Campanha de mídia paga'],['evento','Evento'],['impresso','Material impresso'],['comercial','Peça para o comercial']];
const PORTES=['Pequeno','Médio','Grande','Projeto'];
const PORTE_COR=['color-mix(in srgb,var(--n3) 30%,var(--surface))','color-mix(in srgb,var(--n3) 55%,var(--surface))','color-mix(in srgb,var(--n3) 80%,var(--surface))','var(--n3)'];
const slaK=(k,c)=>`demandas.sla_${k}_${c}`;
function slaStats(){
  const rows=SLA_TIPOS.map(([k,nome])=>({k,nome,vol:num(cur.campos[slaK(k,'vol')]),sla:num(cur.campos[slaK(k,'sla')]),real:num(cur.campos[slaK(k,'real')]),porte:cur.campos[slaK(k,'porte')]||''}))
    .filter(r=>r.vol!=null||r.sla!=null||r.real!=null);
  if(!rows.length)return null;
  rows.forEach(r=>{ r.ratio=r.sla>0&&r.real!=null?r.real/r.sla:null; r.ok=r.ratio!=null?r.ratio<=1:null; });
  const med=rows.filter(r=>r.ratio!=null), comVol=med.length>0&&med.every(r=>r.vol>0), volMed=med.reduce((a,r)=>a+(r.vol||0),0), volOk=med.filter(r=>r.ok).reduce((a,r)=>a+(r.vol||0),0);
  const pOk=!med.length?null:comVol?(volMed>0?volOk/volMed:null):med.filter(r=>r.ok).length/med.length;
  const totVol=rows.reduce((a,r)=>a+(r.vol||0),0);
  const piores=med.filter(r=>r.ratio>1.25).sort((a,b)=>b.ratio-a.ratio);
  const porte={}; PORTES.forEach(p=>porte[p]=rows.filter(r=>r.porte===p).reduce((a,r)=>a+(r.vol||0),0));
  const gr=r=>r.porte==='Grande'||r.porte==='Projeto', grandes=med.filter(gr), menores=med.filter(r=>r.porte&&!gr(r));
  return {rows,med,totVol,pOk,pOkVol:comVol,piores,porte,grandesAtrasam:grandes.length>0&&grandes.every(r=>r.ratio>1.25)&&menores.length>0&&menores.every(r=>r.ratio<=1)};
}
function slaView(s){
  const M=Math.max(1,...s.med.map(r=>Math.max(r.real,r.sla)))*1.08;
  const pz=s.totVol?PORTES.filter(p=>s.porte[p]):[];
  return `<div class="opk">${s.pOk!=null?`<div class="${s.pOk<0.6?'bad':s.pOk<0.85?'warn':'ok'}"><b>${pct(s.pOk).replace(',0%','%')}</b><span>${s.pOkVol?'do volume sai dentro do prazo combinado':'dos tipos de demanda saem dentro do prazo (preencha o volume para ponderar)'}</span></div>`:''}
    ${s.piores.length?`<div class="bad"><b>${esc(s.piores[0].nome)}</b><span>é o tipo que mais estoura: ${dec(s.piores[0].real,0)} dias para um prazo de ${dec(s.piores[0].sla,0)}</span></div>`:''}
    ${s.totVol?`<div><b>${dec(s.totVol,0)}</b><span>demandas por mês nos tipos informados</span></div>`:''}</div>
   ${s.med.length?`<div class="slab" role="img" aria-label="Prazo real contra o prazo combinado por tipo de demanda">${s.med.sort((a,b)=>b.ratio-a.ratio).map(r=>`<div class="slr"><span class="n">${esc(r.nome)}${r.porte?`<small>${esc(r.porte)}</small>`:''}</span>
     <span class="t"><i class="${r.ok?'ok':r.ratio>1.25?'bad':'warn'}" style="width:${(r.real/M*100).toFixed(1)}%" data-tip="Prazo real: ${dec(r.real,0)} dias"></i><em style="left:${(r.sla/M*100).toFixed(1)}%" data-tip="Prazo combinado: ${dec(r.sla,0)} dias"></em></span>
     <b class="${r.ok?'':r.ratio>1.25?'late':'warn'}">${dec(r.real,0)} d <small>/ ${dec(r.sla,0)}</small></b></div>`).join('')}</div>
    <div class="legend"><span class="lg"><i style="background:var(--n4)"></i>Dentro do prazo</span><span class="lg"><i style="background:var(--n2)"></i>Até 25% acima</span><span class="lg"><i style="background:var(--n1)"></i>Mais de 25% acima</span><span class="lg"><i class="mk"></i>Prazo combinado</span></div>`:''}
   ${pz.length?`<p class="muted" style="margin:16px 0 6px;font-size:12.5px;font-weight:600">Volume por porte</p><div class="stack" role="img" aria-label="Volume por porte">${pz.map(p=>`<span style="flex:${s.porte[p]};background:${PORTE_COR[PORTES.indexOf(p)]}" title="${p}: ${dec(s.porte[p],0)}"></span>`).join('')}</div><div class="legend">${pz.map(p=>`<span class="lg"><i style="background:${PORTE_COR[PORTES.indexOf(p)]}"></i>${p} <b>${pct(s.porte[p]/s.totVol)}</b></span>`).join('')}</div>`:''}`;
}
function slaHtml(){
  const s=slaStats(); const v=(k,c)=>esc(cur.campos[slaK(k,c)]||'');
  const inp=(k,c,l)=>`<input data-campo="${slaK(k,c)}" inputmode="decimal" value="${v(k,c)}" placeholder="—" aria-label="${l}">`;
  return `<section class="block"><div class="block-h"><h3>SLA por tipo de demanda</h3><p>Quanto chega de cada tipo, o prazo combinado com quem pede e o prazo que acontece de verdade. É daqui que sai o tamanho e a velocidade da operação.</p></div>
   <div class="tblw"><table class="tbl slat"><thead><tr><th>Tipo</th><th class="r">Volume no mês</th><th class="r">Prazo combinado (dias)</th><th class="r">Prazo real (dias)</th><th>Porte</th><th></th></tr></thead><tbody>
   ${SLA_TIPOS.map(([k,nome])=>{ const r=s&&s.rows.find(x=>x.k===k); return `<tr><td>${esc(nome)}</td><td class="r">${inp(k,'vol','Volume de '+nome)}</td><td class="r">${inp(k,'sla','Prazo combinado de '+nome)}</td><td class="r">${inp(k,'real','Prazo real de '+nome)}</td>
     <td><select data-campo="${slaK(k,'porte')}" aria-label="Porte de ${esc(nome)}"><option value="">—</option>${PORTES.map(p=>`<option ${cur.campos[slaK(k,'porte')]===p?'selected':''}>${p}</option>`).join('')}</select></td>
     <td>${r&&r.ratio!=null?`<span class="tag ${r.ok?'ok':r.ratio>1.25?'alta':'media'}">${r.ok?'No prazo':'+'+dec(r.real-r.sla,0)+' d'}</span>`:''}</td></tr>`; }).join('')}</tbody></table></div>
   ${s&&(s.med.length||s.totVol)?slaView(s):''}</section>`;
}

/* ---------- Passagem de bastão: tempo em cada etapa (área Fluxo e metodologia) ---------- */
const ETAPAS=[['atendimento','Atendimento','Do pedido ao briefing fechado','mkt'],['criacao','Criação','Produção da peça','mkt'],['aprovacao','Aprovação do solicitante','Esperando quem pediu aprovar','cli'],['ajustes','Ajustes','Rodadas de correção','mkt'],['publicacao','Publicação ou entrega','Da aprovação até ir ao ar','mkt']];
function etapaStats(){
  const v={}; let tot=0, n=0; ETAPAS.forEach(([k])=>{ const x=num(cur.campos['fluxo.etapa_'+k]); if(x!=null)n++; v[k]=x||0; tot+=v[k]; }); if(!tot)return null;
  const max=ETAPAS.reduce((a,e)=>v[e[0]]>v[a[0]]?e:a,ETAPAS[0]);
  const cli=ETAPAS.filter(e=>e[3]==='cli').reduce((a,e)=>a+v[e[0]],0);
  return {v,tot,max,pMax:v[max[0]]/tot,pCli:cli/tot,n,completo:n>=3};
}
function etapaView(s){
  const mx=Math.max(...ETAPAS.map(([k])=>s.v[k]));
  return `<div class="etp" role="img" aria-label="Dias em cada etapa da demanda">${ETAPAS.map(([k,l,,quem],i)=>{ const hot=s.max[0]===k&&s.pMax>=0.3; return `<div class="er ${hot?'hot':''}"><span class="ei">${i+1}</span><span class="n">${esc(l)}<small>${quem==='cli'?'com o solicitante':'com o marketing'}</small></span>
    <span class="t"><i class="${quem}" style="width:${s.v[k]?Math.max(2,s.v[k]/mx*100).toFixed(1):0}%" data-tip="${esc(l)}: ${dec(s.v[k],1)} dias"></i></span><b>${s.v[k]?dec(s.v[k],s.v[k]%1?1:0)+' d':'—'}<small>${s.v[k]?pct(s.v[k]/s.tot).replace(',0%','%'):''}</small></b></div>`; }).join('')}</div>
   ${s.n<5?`<p class="muted" style="font-size:12.5px;margin:8px 0 0">${s.n} de 5 etapas informadas. ${s.completo?'':'Com menos de 3 etapas o sistema não aponta gargalo.'}</p>`:''}<p class="etsum"><span class="${s.pMax>=0.4?'bad':s.pMax>=0.3?'warn':''}">${dec(s.tot,s.tot%1?1:0)} dias</span> do pedido à entrega. ${pct(s.pMax).replace(',0%','%')} desse tempo fica em ${esc(s.max[1].toLowerCase())}${s.pCli>=0.25&&s.max[3]!=='cli'?`, e ${pct(s.pCli).replace(',0%','%')} parado com o solicitante`:''}.</p>`;
}
function etapaHtml(){
  const s=etapaStats();
  return `<section class="block"><div class="block-h"><h3>Passagem de bastão</h3><p>Dias médios que uma demanda passa em cada etapa, do pedido do cliente interno até a publicação ou entrega. Mostra em que mão ela trava.</p></div>
   <div class="fields">${ETAPAS.map(([k,l,ds])=>`<div class="field"><label for="c-fluxo.etapa_${k}">${l}<small class="muted" style="display:block;font-size:12px">${ds}</small></label><div class="inu"><input id="c-fluxo.etapa_${k}" data-campo="fluxo.etapa_${k}" inputmode="decimal" value="${esc(cur.campos['fluxo.etapa_'+k]||'')}" placeholder="0"><span class="u">dias</span></div></div>`).join('')}</div>
   ${s?etapaView(s):''}</section>`;
}

/* ---------- Grupos de campanha: quanto cada grupo consome (área Growth) ---------- */
const GRP_N=6, GRP_MODELOS=['Verticalizada por curso','Por grupos de cursos','Misto: cursos prioritários verticalizados, demais em grupos','Só campanhas institucionais'];
const grpK=(i,c)=>`growth.g${i}_${c}`;
function grpStats(){
  const rows=[]; for(let i=0;i<GRP_N;i++){ const nome=(cur.campos[grpK(i,'nome')]||'').trim(), inv=num(cur.campos[grpK(i,'inv')]); if(!nome&&inv==null)continue;
    const leads=num(cur.campos[grpK(i,'leads')]), insc=num(cur.campos[grpK(i,'insc')]), mat=num(cur.campos[grpK(i,'mat')]);
    rows.push({i,nome:nome||'Grupo '+(i+1),inv,leads,insc,mat,cpl:inv&&leads?inv/leads:null,cpa:inv&&insc?inv/insc:null,cac:inv&&mat?inv/mat:null}); }
  if(!rows.length)return null;
  const tInv=rows.reduce((a,r)=>a+(r.inv||0),0), tMat=rows.reduce((a,r)=>a+(r.mat||0),0), tLeads=rows.reduce((a,r)=>a+(r.leads||0),0), tInsc=rows.reduce((a,r)=>a+(r.insc||0),0);
  const par=(campo)=>{ const R=rows.filter(r=>r.inv>0&&r[campo]>0); const i=R.reduce((a,r)=>a+r.inv,0), q=R.reduce((a,r)=>a+r[campo],0); return q>0?i/q:null; };
  const comp=rows.filter(r=>r.inv>0&&r.mat!=null), cInv=comp.reduce((a,r)=>a+r.inv,0), cMat=comp.reduce((a,r)=>a+r.mat,0);
  rows.forEach(r=>{ const ok=r.inv>0&&r.mat!=null; r.sInv=ok&&cInv>0?r.inv/cInv:null; r.sMat=ok&&cMat>0?r.mat/cMat:null; });
  const cacM=par('mat'), incompletos=rows.filter(r=>!(r.inv>0&&r.mat!=null)).length;
  const caros=rows.filter(r=>r.sInv!=null&&r.sMat!=null&&r.sInv>=0.15&&r.sInv>=1.5*r.sMat).sort((a,b)=>(b.sInv-b.sMat)-(a.sInv-a.sMat));
  return {rows,tInv,tMat,tLeads,tInsc,cacM,cplM:par('leads'),cpaM:par('insc'),caros,incompletos};
}
function grpView(s){
  return `<div class="opk"><div><b>${brl(s.tInv)}</b><span>investidos nos grupos no período</span></div>${s.cacM!=null?`<div><b>${brl(s.cacM)}</b><span>CAC médio de mídia por matrícula</span></div>`:''}${s.caros.length?`<div class="bad"><b>${esc(s.caros[0].nome)}</b><span>consome ${pct(s.caros[0].sInv)} da verba e traz ${pct(s.caros[0].sMat)} das matrículas</span></div>`:''}</div>
   ${s.tMat?`<div class="grpb" role="img" aria-label="Participação na verba contra participação nas matrículas por grupo">${s.rows.filter(r=>r.sInv!=null).sort((a,b)=>b.sInv-a.sInv).map(r=>`<div class="gr"><span class="n">${esc(r.nome)}</span>
     <span class="bs"><span class="b inv"><i style="width:${(r.sInv*100).toFixed(1)}%" data-tip="Verba: ${pct(r.sInv)}"></i></span><span class="b mat"><i style="width:${((r.sMat||0)*100).toFixed(1)}%" data-tip="Matrículas: ${pct(r.sMat)}"></i></span></span>
     <b class="${r.cac!=null&&s.cacM&&r.cac>1.5*s.cacM?'late':''}">${r.cac!=null?brl(r.cac):'—'}<small>CAC</small></b></div>`).join('')}</div>
    <div class="legend"><span class="lg"><i style="background:var(--n3)"></i>% da verba</span><span class="lg"><i style="background:var(--n4)"></i>% das matrículas</span><span class="lg">CAC em vermelho: mais de 1,5 vez a média</span></div>${s.incompletos?`<p class="muted" style="font-size:12.5px;margin-top:8px">${pl(s.incompletos,'grupo ficou','grupos ficaram')} fora da comparação por falta de investimento ou matrículas.</p>`:''}`:''}`;
}
function grpHtml(){
  const s=grpStats(); const v=(i,c)=>esc(cur.campos[grpK(i,c)]||'');
  const inp=(i,c,l,txt)=>`<input data-campo="${grpK(i,c)}" ${txt?'':'inputmode="decimal"'} value="${v(i,c)}" placeholder="${txt?'Ex.: Engenharias':'—'}" aria-label="${l}">`;
  const md=cur.campos['growth.modelo']||'';
  return `<section class="block"><div class="block-h"><h3>Campanhas por grupo</h3><p>Como as campanhas são organizadas e quanto cada grupo consome. Use o período do último ciclo de captação.</p></div>
   <div class="fields"><div class="field wide"><label for="c-growth.modelo">Modelo de campanha hoje</label><select id="c-growth.modelo" data-campo="growth.modelo"><option value="">—</option>${GRP_MODELOS.map(o=>`<option ${md===o?'selected':''}>${o}</option>`).join('')}</select></div></div>
   <div class="tblw"><table class="tbl slat"><thead><tr><th>Grupo ou curso</th><th class="r">Investimento (R$)</th><th class="r">Leads</th><th class="r">Inscritos</th><th class="r">Matrículas</th><th class="r">CPL</th><th class="r">CPA</th><th class="r">CAC</th></tr></thead><tbody>
   ${Array.from({length:GRP_N},(_,i)=>{ const r=s&&s.rows.find(x=>x.i===i); return `<tr><td>${inp(i,'nome','Nome do grupo '+(i+1),1)}</td><td class="r">${inp(i,'inv','Investimento')}</td><td class="r">${inp(i,'leads','Leads')}</td><td class="r">${inp(i,'insc','Inscritos')}</td><td class="r">${inp(i,'mat','Matrículas')}</td>
     <td class="r mono">${r&&r.cpl!=null?brl(r.cpl):''}</td><td class="r mono">${r&&r.cpa!=null?brl(r.cpa):''}</td><td class="r mono">${r&&r.cac!=null?brl(r.cac):''}</td></tr>`; }).join('')}
   ${s&&s.rows.length>1?`<tr><td><b>Total</b></td><td class="r"><b>${brl(s.tInv)}</b></td><td class="r"><b>${dec(s.tLeads,0)}</b></td><td class="r"><b>${dec(s.tInsc,0)}</b></td><td class="r"><b>${dec(s.tMat,0)}</b></td><td class="r mono"><b>${s.cplM!=null?brl(s.cplM):''}</b></td><td class="r mono"><b>${s.cpaM!=null?brl(s.cpaM):''}</b></td><td class="r mono"><b>${s.cacM!=null?brl(s.cacM):''}</b></td></tr>`:''}</tbody></table></div>
   <p class="muted" style="font-size:12.5px">CPL = investimento ÷ leads · CPA = investimento ÷ inscritos · CAC = investimento ÷ matrículas (só mídia).</p>
   ${s?grpView(s):''}</section>`;
}

/* ---------- Resultados: bloco para a reitoria ---------- */
function operacaoRes(){
  const sl=slaStats(), et=etapaStats(), gp=grpStats(), sr=SC.relacionamento, sat=V('relacionamento','satisf');
  if(!sl&&!et&&!gp&&(!sr||sr.score==null)&&sat==null)return '';
  const rel=sr&&sr.score!=null?`<div class="opk">${`<div class="${sr.level<=2?'bad':''}"><b>N${sr.level} · ${dec(sr.score)}</b><span>maturidade do atendimento às unidades</span></div>`}${sat!=null?`<div class="${sat<7?'bad':sat<8.5?'warn':'ok'}"><b>${dec(sat,1)}</b><span>satisfação dos coordenadores e administrativo, de 0 a 10</span></div>`:''}${V('relacionamento','reclamacoes')!=null?`<div><b>${dec(V('relacionamento','reclamacoes'),0)}</b><span>reclamações sobre o atendimento no semestre</span></div>`:''}</div>`:(sat!=null?`<div class="opk"><div class="${sat<7?'bad':''}"><b>${dec(sat,1)}</b><span>satisfação dos solicitantes, de 0 a 10</span></div></div>`:'');
  return `${rel||et?`<div class="rx-two">${rel?`<section class="block"><div class="block-h"><h3>Atendimento às unidades</h3><button class="chip" data-act="goto" data-v="relacionamento">Ver área</button></div>${rel}</section>`:''}${et?`<section class="block"><div class="block-h"><h3>Onde a demanda trava</h3><button class="chip" data-act="goto" data-v="fluxo">Editar etapas</button></div>${etapaView(et)}</section>`:''}</div>`:''}
   ${sl&&sl.med.length?`<section class="block"><div class="block-h"><h3>Prazo combinado x prazo real</h3><button class="chip" data-act="goto" data-v="demandas">Editar SLA</button></div>${slaView(sl)}</section>`:''}
   ${gp?`<section class="block"><div class="block-h"><h3>Quanto cada grupo de campanha consome</h3><button class="chip" data-act="goto" data-v="growth">Editar grupos</button></div>${grpView(gp)}</section>`:''}`;
}

/* ---------- Cruzamentos ---------- */
RULES.push(
 {id:'CRZ-57',sev:'crit',pad:'Gargalo de fluxo',areas:['fluxo','demandas'],t:'O gargalo está na entrada: briefing fraco gera retrabalho',
  test:()=>le(R('flu3'),2)&&(ge(V('fluxo','retrabalho'),30)||le(R('flu5'),2)), txt:()=>`As demandas chegam sem as informações necessárias${ge(V('fluxo','retrabalho'),30)?` e ${dec(V('fluxo','retrabalho'),0)}% das peças voltam para retrabalho`:' e o retrabalho por mudança de pedido é frequente'}. O problema não está na criação: nasce no pedido, antes de o marketing começar.`,
  rec:['Briefing padrão obrigatório por tipo de peça','Demanda incompleta volta ao solicitante antes de entrar na fila','Conversa de 15 minutos de alinhamento para peças de porte grande']},
 {id:'CRZ-58',sev:'alta',pad:'Ruptura de passagem',areas:['relacionamento','demandas'],t:'A queixa de atendimento tem causa no processo',
  test:()=>le(L('relacionamento'),2)&&(le(R('dem3'),2)||(V('relacionamento','satisf')!=null&&V('relacionamento','satisf')<7)), txt:()=>`O atendimento às unidades está no nível ${L('relacionamento')}${V('relacionamento','satisf')!=null?`, com satisfação ${dec(V('relacionamento','satisf'),1)} de 10`:''}${le(R('dem3'),2)?', e não existe prazo padrão por tipo de pedido':''}. Sem prazo combinado e sem alguém que acompanhe o pedido, o coordenador percebe abandono mesmo quando o time está trabalhando.`,
  rec:['Ponto focal do marketing para cada unidade','SLA por tipo de peça publicado aos coordenadores','Aviso ao solicitante a cada mudança de etapa']},
 {id:'CRZ-59',sev:'alta',pad:'Gargalo de capacidade',areas:['relacionamento','demandas'],t:'O marketing aceita tudo e depois atrasa',
  test:()=>le(R('rel2'),2)&&le(R('dem2'),2), txt:()=>'O marketing não negocia escopo, prazo nem prioridade com quem pede, e a fila '+(R('dem2')===1?'é decidida por quem pressiona mais':'é decidida caso a caso, sem critério escrito')+'. O "sim" para tudo vira atraso para todos e desgasta a relação com as unidades.',
  rec:['Roteiro de briefing com objetivo, prazo e formato negociados','Regra pública de priorização aprovada pela reitoria','Treinar o time a dizer "não" oferecendo alternativa']},
 {id:'CRZ-60',sev:'alta',pad:'Gargalo de fluxo',areas:()=>{const s=etapaStats();return s&&s.max[3]==='cli'?['fluxo','relacionamento']:['fluxo'];},t:'Uma etapa concentra o tempo da demanda',
  test:()=>{const s=etapaStats();return !!s&&s.completo&&s.pMax>=0.35;}, txt:()=>{const s=etapaStats();return `Uma demanda leva ${dec(s.tot,0)} dias do pedido à entrega, e ${pct(s.pMax)} desse tempo fica em ${s.max[1].toLowerCase()} (${dec(s.v[s.max[0]],0)} dias). `+(s.max[3]==='cli'?'O gargalo está com o solicitante: a peça fica pronta e espera aprovação.':'É nessa passagem de bastão que o fluxo trava.');},
  rec:['Dono e prazo para cada etapa do fluxo','Prazo de aprovação com aprovação tácita no vencimento','Medir o tempo por etapa no quadro e revisar todo mês']},
 {id:'CRZ-61',sev:'alta',pad:'Gargalo de capacidade',areas:['demandas'],t:'Tipos de demanda estouram o prazo combinado',
  test:()=>{const s=slaStats();return !!s&&s.piores.length>0;}, txt:()=>{const s=slaStats();return s.piores.slice(0,3).map(r=>`${r.nome}: ${dec(r.real,0)} dias para um prazo de ${dec(r.sla,0)}`).join('; ')+'.'+(s.pOk!=null?` No total, ${pct(s.pOk)} ${s.pOkVol?'do volume':'dos tipos de demanda'} sai dentro do prazo.`:'')+(s.grandesAtrasam?' Só os tipos de porte grande atrasam: falta capacidade reservada para projetos.':'');},
  rec:['Rever o prazo combinado dos tipos que estouram, com base no tempo real','Reservar capacidade fixa para projetos grandes','Publicar o SLA por tipo e medir todo mês']},
 {id:'CRZ-62',sev:'alta',pad:'Desalinhamento financeiro',areas:['growth'],t:'Grupo de campanha consome verba sem trazer matrícula',
  test:()=>{const s=grpStats();return !!s&&s.caros.length>0;}, txt:()=>{const s=grpStats();return s.caros.slice(0,2).map(r=>`${r.nome} consome ${pct(r.sInv)} da verba e traz ${pct(r.sMat)} das matrículas${r.cac!=null?` (CAC de ${brl(r.cac)}${s.cacM?` contra ${brl(s.cacM)} de média`:''})`:''}`).join('; ')+'.';},
  rec:['Rever a verba dos grupos com CAC acima de 1,5 vez a média','Separar em campanha própria os cursos que convertem melhor','Revisão quinzenal de CPL, CPA e CAC por grupo']},
 {id:'CRZ-63',sev:'media',pad:'Ruptura de passagem',areas:['smarketing','demandas'],t:'Pedidos do comercial furam a fila',
  test:()=>le(R('sma5'),1)||(le(R('sma5'),2)&&V('smarketing','dem_com_prazo')!=null&&V('smarketing','dem_com_prazo')<70), txt:()=>`O comercial e o call center pedem material ao marketing sem fila própria${V('smarketing','dem_com')!=null?` (${dec(V('smarketing','dem_com'),0)} pedidos no mês)`:''}${V('smarketing','dem_com_prazo')!=null?` e só ${dec(V('smarketing','dem_com_prazo'),0)}% saem no prazo`:''}. A captação disputa espaço com todo o resto, sem prioridade combinada.`,
  rec:['Fila própria para o comercial com tipos de peça e SLA','Kit comercial planejado junto com cada campanha']},
 {id:'CRZ-64',sev:'alta',pad:'Ruptura de passagem',areas:['fluxo','relacionamento'],t:'A demanda se perde entre as mãos e o solicitante não vê',
  test:()=>le(R('flu6'),2)&&le(R('dem4'),2), txt:()=>'Cada passagem de bastão depende de cobrança e o solicitante não enxerga o andamento do que pediu. É assim que um bom trabalho vira a percepção de "o marketing não me atende".',
  rec:['Quadro único com etapas e dono por etapa','Solicitante com acesso ao status do próprio pedido','Mensagem automática ao solicitante a cada mudança de etapa']}
);
BLOCOS.push(
 {id:'atendimento',t:'O marketing não atende as unidades como clientes',r:'Pedidos sem ponto focal, sem prazo combinado e sem acompanhamento. A demanda trava entre as mãos e o coordenador sente falta de um atendimento próximo.',
  rules:['CRZ-57','CRZ-58','CRZ-59','CRZ-60','CRZ-61','CRZ-63','CRZ-64'],kpi:'satisfação dos solicitantes · % do volume no prazo · dias por etapa',
  h:{c:['Ponto focal do marketing para cada unidade','Briefing obrigatório e devolução do pedido incompleto','SLA por tipo de peça publicado aos coordenadores'],m:['Quadro com etapas, dono por etapa e status visível ao solicitante','Ritual mensal com os coordenadores de cada unidade','Pesquisa curta de satisfação a cada entrega'],l:['Atendimento consultivo: o marketing participa do planejamento das unidades','SLA medido por unidade e apresentado à reitoria']}}
);
const _blReceita=BLOCOS.find(b=>b.id==='receita'); if(_blReceita) _blReceita.rules.push('CRZ-62');
