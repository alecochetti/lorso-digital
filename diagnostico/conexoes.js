/* =====================================================================
   Conexões: entrevistas e base alimentam Estratégia, Execução e Otimização
   Cada pergunta dessas fases mostra uma sugestão de nível com as provas
   que vieram das entrevistas e da Base de conhecimento. A LORSO aplica ou
   não (o sistema sugere, a pessoa decide). As respostas dessas fases agora
   disparam regras e jogadas do plano de ação.
   ===================================================================== */
const cxLv=v=>v==null?null:Math.max(1,Math.min(4,Math.round(v)));
const cxUnsCom=f=>typeof buDados==='function'?UNS.map(u=>({u,d:buDados(u.id)})).filter(x=>f(x.d)):[];
const cxPorFaixa=(n,tot)=>!tot?null:n===0?1:n<tot?2:3;

/* perguntas relacionadas nas entrevistas e fatos da base, por pergunta das fases */
const CX={
 est1:{q:['rei2','fin2'],fato:()=>{ const c=cxUnsCom(d=>d.metaMat!=null); return {n:cxPorFaixa(c.length,UNS.length),t:`Meta oficial informada em ${c.length} de ${UNS.length} UNs${c.length?` (${c.map(x=>x.u.nome).join(', ')})`:''}`,ir:['bu','geral']}; }},
 est2:{q:['crm2','gro3','sma1'],fato:()=>{ const c=cxUnsCom(d=>d.leads&&d.insc&&d.captados); return {n:cxPorFaixa(c.length,UNS.length),t:c.length?`Funil com leads, inscritos e matriculados em ${c.map(x=>`${x.u.nome} (${pct(x.d.insc/x.d.leads)} lead→inscrito, ${pct(x.d.captados/x.d.insc)} inscrito→matrícula)`).join('; ')}`:'Nenhuma UN com leads, inscritos e matriculados na base',ir:['bu','geral']}; }},
 est3:{q:['fin2','fin3','cap5'],fato:()=>{ const c=cxUnsCom(d=>d.cac!=null); if(!c.length) return {n:1,t:'Nenhuma UN com orçamento e matriculados para calcular o CAC',ir:['bu','geral']}; const v=c.map(x=>x.d.cac), r=Math.max(...v)/Math.min(...v); return {n:c.length<2?2:r>1.5?2:3,t:`CAC geral em ${c.length} UNs: ${c.map(x=>`${x.u.nome} ${brl(x.d.cac)}`).join(', ')}${c.length>1?`; o maior é ${r.toFixed(1).replace('.',',')} vezes o menor`:''}`,ir:['bu','geral']}; }},
 est4:{q:['fin4','gro2'],fato:()=>{ const c=cxUnsCom(d=>d.roi!=null); return {n:cxPorFaixa(c.length,UNS.length),t:`ROI calculável em ${c.length} de ${UNS.length} UNs (precisa de verba, captados e mensalidade)`,ir:['bu','geral']}; }},
 est5:{q:['cri2','red2'],fato:()=>{ const c=UNS.filter(u=>String(cur.campos[`base.${u.id}.diferenciais`]||'').trim()); return {n:cxPorFaixa(c.length,UNS.length),t:`Diferenciais escritos para ${c.length} de ${UNS.length} UNs na Base`,ir:['bu','geral']}; }},
 exe1:{q:['flu1','rel1','cri5'],fato:()=>{ const p=(cur.pessoas||[]).filter(x=>x.mkt); return p.length?{t:`${pl(p.length,'pessoa','pessoas')} do marketing cadastradas, ${p.filter(x=>x.cargo).length} com cargo`,ir:['view','pessoas']}:null; }},
 exe2:{q:['rel4','gro5','rei5'],fato:()=>null},
 exe3:{q:['dem3','sma6','flu6'],fato:()=>{ if(typeof SOL_AREAS==='undefined') return null; const c=SOL_AREAS.filter(a=>solV(a.id,'sla_comb')); return {t:`Prazo combinado informado por ${c.length} de ${SOL_AREAS.length} áreas administrativas`,ir:['view','solicitantes']}; }},
 exe4:{q:['man3'],fato:()=>null},
 exe5:{q:['flu4','cri5','flu2'],fato:()=>{ if(typeof SOL_AREAS==='undefined') return null; const c=SOL_AREAS.map(a=>solV(a.id,'sla_real')).filter(x=>x!=null); if(!c.length) return null; const m=c.reduce((a,b)=>a+b,0)/c.length; return {n:m>30?1:m>14?2:m>7?3:4,t:`Prazo real médio até a arte final: ${dec(m,1)} dias (${pl(c.length,'área ouvida','áreas ouvidas')})`,ir:['view','solicitantes']}; }},
 oti1:{q:['sis4','cri4'],fato:()=>null},
 oti2:{q:['plat2','sis3','crm1'],fato:()=>{ const n=(cur.sistemas||[]).filter(s=>s.nome).length; return n?{t:`${pl(n,'sistema','sistemas')} no inventário${(cur.sistemas||[]).filter(s=>/não|nao|manual/i.test(s.integra||'')).length?`, ${(cur.sistemas||[]).filter(s=>/não|nao|manual/i.test(s.integra||'')).length} sem integração`:''}`,ir:['view','sistemas']}:null; }},
 oti3:{q:['red2','crm4','crm3'],fato:()=>null},
 oti4:{q:['gro1','gro4','gro6'],fato:()=>null},
 oti5:{q:['gro5','cri4'],fato:()=>null}
};
const cxPergunta=id=>{ for(const a of AREAS){ const q=a.q.find(x=>x[0]===id); if(q) return {a,q}; } return null; };

function cxSinais(qid){
  const c=CX[qid]; if(!c) return null; const S=[];
  c.q.forEach(id=>{ const p=cxPergunta(id); if(!p) return; const n=cur.resp[id]; if(n==null) return;
    S.push({n:n||null,t:`${p.a.nome} · ${p.q[1]}: ${n?`N${n}, "${p.q[6][n-1]}"`:'não soube responder'}${cur.evid[id]?' (comprovado)':''}${cur.notas[id]?`. Observação: ${String(cur.notas[id]).slice(0,140)}`:''}`,ir:['area',p.a.id]}); });
  let f=null; try{ f=c.fato&&c.fato(); }catch(e){ f=null; }
  if(f) S.push({n:f.n||null,t:'Base: '+f.t,ir:f.ir,base:true});
  const nums=S.map(s=>s.n).filter(Boolean);
  return {S,sug:nums.length?cxLv(nums.reduce((a,b)=>a+b,0)/nums.length):null,falta:c.q.filter(id=>cur.resp[id]==null).map(id=>cxPergunta(id)).filter(Boolean)};
}
function cxTexto(qid){ const r=cxSinais(qid); return r?'Do diagnóstico:\n'+r.S.map(s=>'- '+s.t).join('\n'):''; }

/* ---------- modo automático: o diagnóstico responde, a LORSO pode ajustar ---------- */
function cxManuais(){ try{ return new Set(JSON.parse(cur.campos['cx.manual']||'[]')); }catch(e){ return new Set(); } }
function cxSetManual(q,on){ const m=cxManuais(); on?m.add(q):m.delete(q); cur.campos['cx.manual']=m.size?JSON.stringify([...m]):''; }
let cxRodando=false;
function cxAuto(){
  if(cxRodando||!cur||(typeof me!=='undefined'&&me&&me.papel==='cliente')) return;
  cxRodando=true; let mudou=false; const man=cxManuais();
  try{ Object.keys(CX).forEach(q=>{ if(man.has(q)) return; const r=cxSinais(q); if(!r||!r.sug) return;
    if(cur.resp[q]!==r.sug){ cur.resp[q]=r.sug; mudou=true; }
    const t=cxTexto(q), n=String(cur.notas[q]||''); if((!n||n.startsWith('Do diagnóstico:'))&&n!==t){ cur.notas[q]=t; mudou=true; } }); }
  finally{ cxRodando=false; }
  if(mudou&&typeof touch==='function') touch(false);
}
if(typeof computeAll==='function'){ const _ca=computeAll; computeAll=function(){ try{ cxAuto(); }catch(e){ console.warn('cxAuto',e); } return _ca.apply(this,arguments); }; }
document.addEventListener('click',e=>{ const b=e.target.closest&&e.target.closest('[data-act="opt"]'); if(b&&cur&&CX[b.dataset.q]) cxSetManual(b.dataset.q,true); },true);

function sugestaoHtml(qid){
  if(!cur||!CX[qid]) return '';
  const r=cxSinais(qid), atual=cur.resp[qid], manual=cxManuais().has(qid);
  if(!r.S.length) return `<div class="cx vazio"><b>Ainda sem provas do diagnóstico.</b> <span>Esta pergunta se apoia em: ${CX[qid].q.map(id=>{ const p=cxPergunta(id); return p?`<button class="chip" data-act="goto" data-v="${p.a.id}">${esc(p.a.nome)} · ${esc(p.q[1])}</button>`:''; }).join(' ')}</span></div>`;
  const titulo=!r.sug?'Provas do diagnóstico':manual?`Ajustado por você para ${atual?`N${atual}`:'sem nível'}. O diagnóstico indica N${r.sug} · ${LVL[r.sug]}`:`Preenchido pelo diagnóstico: N${r.sug} · ${LVL[r.sug]}`;
  return `<div class="cx ${manual?'manual':'auto'}"><div class="cx-h"><b>${titulo}</b>
    <span class="cx-acts">${manual&&r.sug?`<button class="btn sm" data-act="cx-auto" data-q="${qid}">Voltar ao automático</button>`:''}${!r.sug?'':manual?'':`<span class="tag ok">automático</span>`}</span></div>
   <ul>${r.S.map(s=>`<li class="${s.base?'base':''}">${esc(s.t)} <button class="cx-ir" data-act="${s.ir[0]==='area'?'goto':s.ir[0]==='bu'?'bu-tab':'view'}" data-v="${s.ir[1]}">ver</button></li>`).join('')}</ul>
   ${r.falta.length?`<small>Falta responder nas entrevistas: ${r.falta.map(p=>`${esc(p.a.nome)} · ${esc(p.q[1])}`).join('; ')}</small>`:''}</div>`;
}

function cxNotaAuto(qid){ const n=String(cur.notas[qid]||''); return !!n&&n.startsWith('Do diagnóstico:')&&n===cxTexto(qid); }
function cxAnotar(qid){ const t=cxTexto(qid); if(!t) return; const atual=String(cur.notas[qid]||''); const sem=atual.replace(/Do diagnóstico:\n(- .*\n?)*/,'').trim(); cur.notas[qid]=(sem?sem+'\n\n':'')+t; ui.notesOpen[qid]=true; }
function conexoesClick(act,d){
  if(act==='cx-aplicar'){ cur.resp[d.q]=+d.n; cxAnotar(d.q); touch(true); toast(`N${d.n} aplicado e provas anotadas`); return true; }
  if(act==='cx-anotar'){ cxAnotar(d.q); touch(true); toast('Provas copiadas para a observação'); return true; }
  if(act==='cx-meta-auto'){ delete cur.campos['meta.'+d.v]; touch(true); toast('Meta da área voltou para o automático'); return true; }
  if(act==='cx-auto'){ cxSetManual(d.q,false); const n=String(cur.notas[d.q]||''); if(!n.trim()) cur.notas[d.q]=''; touch(true); toast('Voltou para o automático'); return true; }
  if(act==='cx-preencher'){ cxPreencher(d.v); return true; }
  return false;
}

/* campos abertos das fases: preencher com o que o diagnóstico já tem (só os vazios) */
function cxValores(st){
  const v={}; const D=typeof buDados==='function'?UNS.map(u=>({u,d:buDados(u.id)})):[];
  if(st==='estrategia'){
    const m=D.filter(x=>x.d.meta!=null); if(m.length) v.metas_un=m.map(x=>`${x.u.nome}: ${buN(x.d.meta)} matrículas${x.d.cicloRef?` no ciclo ${x.d.cicloRef}`:''}`).join('\n');
    const vb=D.reduce((a,x)=>a+(x.d.verba||0),0); if(vb) v.verba_total=String(Math.round(vb));
    const f=D.filter(x=>x.d.leads&&x.d.insc&&x.d.captados); if(f.length) v.funil_alvo=f.map(x=>`${x.u.nome}: ${buN(x.d.leads)} leads → ${buN(x.d.insc)} inscritos (${pct(x.d.insc/x.d.leads)}) → ${buN(x.d.captados)} matrículas (${pct(x.d.captados/x.d.insc)}). Hoje; defina a taxa-alvo de cada etapa.`).join('\n');
    const I=typeof runEngine==='function'?runEngine().filter(i=>i.sev==='crit'||i.sev==='alta').slice(0,5):[]; if(I.length) v.riscos=I.map(i=>`${i.t}`).join('\n');
  }
  if(st==='execucao'){ const p=(cur.pessoas||[]).filter(x=>x.mkt); if(p.length) v.time=String(p.length); }
  if(st==='otimizacao'){ const s=(cur.sistemas||[]).filter(x=>x.nome); if(s.length) v.base_dados=s.map(x=>`${x.nome}${x.uso?`: ${x.uso}`:''}`).join('\n'); }
  return v;
}
function cxPreencherHtml(st){ const v=cxValores(st), vaz=Object.keys(v).filter(k=>!String(cur.campos[st+'.'+k]||'').trim()); if(!Object.keys(v).length) return ''; return `<div class="cx cx-fill"><div class="cx-h"><b>${vaz.length?`${pl(vaz.length,'campo pode','campos podem')} ser preenchido${vaz.length>1?'s':''} com o que o diagnóstico já tem`:'Campos abertos já preenchidos'}</b>${vaz.length?`<button class="btn sm primary" data-act="cx-preencher" data-v="${st}">Preencher os vazios</button>`:''}</div><small>Metas, verba e funil vêm da Base de conhecimento; riscos, das incongruências críticas e altas. Campos já escritos não mudam.</small></div>`; }
function cxPreencher(st){ const v=cxValores(st); let n=0; Object.entries(v).forEach(([k,val])=>{ const key=st+'.'+k; if(!String(cur.campos[key]||'').trim()){ cur.campos[key]=val; n++; } }); touch(true); toast(n?`${pl(n,'campo preenchido','campos preenchidos')}`:'Nada a preencher'); }

/* ---------- regras novas: respostas das fases geram causas e jogadas ---------- */
if(typeof RULES!=='undefined'){
  const sinal=q=>{ try{ return cxSinais(q); }catch(e){ return null; } };
  RULES.push(
   {id:'CRZ-68',sev:'alta',pad:'Estratégia sem número',areas:()=>['reitoria','financeiro'],t:'Metas não são desdobradas por UN e por trimestre',
    test:()=>le(R('est1'),2), txt:()=>`Estratégia em N${R('est1')} nas metas. ${(sinal('est1')||{S:[]}).S.filter(s=>s.base).map(s=>s.t.replace('Base: ','')).join('. ')}. Sem meta por UN e por trimestre, o marketing não sabe onde colocar o esforço nem quando corrigir a rota.`,
    rec:['Meta por UN e por trimestre, aprovada pela reitoria','Meta desdobrada em leads, inscritos e matrículas','Revisão mensal com a coordenação de cada UN']},
   {id:'CRZ-69',sev:'alta',pad:'Funil sem taxa',areas:()=>['crm','growth'],t:'O funil de cada UN não tem taxa de conversão por etapa',
    test:()=>le(R('est2'),2), txt:()=>`Estratégia em N${R('est2')} no desenho do funil. ${(sinal('est2')||{S:[]}).S.filter(s=>s.base).map(s=>s.t.replace('Base: ','')).join('. ')}. Sem taxa por etapa, ninguém vê se o problema está em gerar lead, converter inscrito ou fechar a matrícula.`,
    rec:['Funil por UN com taxa atual e taxa-alvo em cada etapa','Gargalo da semana apontado no painel','Meta de matrícula convertida em meta de leads e inscritos']},
   {id:'CRZ-70',sev:'alta',pad:'Verba sem critério',areas:()=>['financeiro','captacao'],t:'A verba é dividida sem olhar CAC e retorno',
    test:()=>le(R('est3'),2), txt:()=>`Estratégia em N${R('est3')} na alocação da verba. ${(sinal('est3')||{S:[]}).S.filter(s=>s.base).map(s=>s.t.replace('Base: ','')).join('. ')}. Verba repetida do ano anterior paga caro onde a matrícula custa mais.`,
    rec:['Alocação por UN a partir de meta e CAC-alvo','Reserva de 10% a 15% para testes','Revisão mensal: mover verba para onde a matrícula custa menos']},
   {id:'CRZ-71',sev:'media',pad:'Retorno invisível',areas:()=>['financeiro'],t:'Não há projeção de retorno do investimento em marketing',
    test:()=>le(R('est4'),2), txt:()=>`Estratégia em N${R('est4')} na projeção de retorno. ${(sinal('est4')||{S:[]}).S.filter(s=>s.base).map(s=>s.t.replace('Base: ','')).join('. ')}. Sem projeção, a verba é discutida como custo, não como investimento.`,
    rec:['Projeção por UN: matrículas, receita e ROI por campanha','LTV/CAC por UN com evasão descontada','Cenários conservador, base e otimista para a reitoria']},
   {id:'CRZ-72',sev:'media',pad:'Mensagem genérica',areas:()=>['criacao','redes'],t:'As UNs não têm proposta de valor própria',
    test:()=>le(R('est5'),2), txt:()=>`Estratégia em N${R('est5')} no posicionamento. ${(sinal('est5')||{S:[]}).S.filter(s=>s.base).map(s=>s.t.replace('Base: ','')).join('. ')}. Com a mesma mensagem para todas as UNs, cada público recebe o que não é para ele.`,
    rec:['Proposta de valor por UN, com diferenciais e provas','Mensagem por público (aluno, família, empresa)','Validar com pesquisa e com a concorrência']}
  );
  const bl=id=>typeof BLOCOS!=='undefined'&&BLOCOS.find(b=>b.id===id);
  [['receita',['CRZ-68','CRZ-70','CRZ-71']],['funil',['CRZ-69','CRZ-72']]].forEach(([b,L])=>{ const x=bl(b); if(x) L.forEach(r=>{ if(!x.rules.includes(r)) x.rules.push(r); }); });
}
if(typeof JOGADAS!=='undefined'){
  const add=(id,r)=>{ const j=JOGADAS.find(x=>x.id===id); if(j&&!j.regras.includes(r)) j.regras.push(r); };
  add('adm','CRZ-67'); add('calendario','CRZ-66'); add('painel','CRZ-69'); add('verba_grupos','CRZ-70');
  if(typeof PA_KPI!=='undefined'){
    PA_KPI.metas_un=['UNs com meta oficial por ciclo','n',()=>typeof buDados==='function'?UNS.filter(u=>buDados(u.id).metaMat!=null).length:null,'maior'];
    PA_KPI.cac_geral=['CAC geral médio das UNs','R$',()=>{ if(typeof buDados!=='function') return null; const v=UNS.map(u=>buDados(u.id).cac).filter(x=>x!=null); return v.length?Math.round(v.reduce((a,b)=>a+b,0)/v.length):null; },'menor'];
    PA_KPI.roi_uns=['UNs com ROI calculado','n',()=>typeof buDados==='function'?UNS.filter(u=>buDados(u.id).roi!=null).length:null,'maior'];
    PA_KPI.prazo_adm=['Prazo real até a arte final (áreas administrativas)','d',()=>{ if(typeof SOL_AREAS==='undefined') return null; const c=SOL_AREAS.map(a=>solV(a.id,'sla_real')).filter(x=>x!=null); return c.length?Math.round(c.reduce((a,b)=>a+b,0)/c.length*10)/10:null; },'menor'];
  }
  JOGADAS.push(
   {id:'metas_un',t:'Metas por UN e trimestre, desdobradas no funil',o:'Cada UN sabe quantos leads, inscritos e matrículas precisa em cada trimestre.',passos:['Meta oficial por UN e ciclo aprovada pela reitoria','Desdobrar em leads e inscritos com as taxas atuais','Revisão mensal com cada coordenação'],bloco:'receita',regras:['CRZ-68'],kpi:'metas_un',h:'c',esf:1,imp:3,tipo:'destravar',area:'reitoria',ref:'LORSO'},
   {id:'funil_alvo',t:'Funil-alvo por UN com taxa por etapa',o:'Mostrar onde a captação perde gente e qual etapa atacar primeiro.',passos:['Taxa atual de cada etapa por UN','Taxa-alvo por etapa, com prazo','Gargalo da semana no painel executivo'],bloco:'funil',regras:['CRZ-69'],kpi:'conv_insc',h:'c',esf:2,imp:3,tipo:'destravar',area:'crm',ref:'LORSO'},
   {id:'verba_roi',t:'Alocação da verba por UN pelo CAC e pelo ROI',o:'Colocar o dinheiro onde a matrícula custa menos e retorna mais.',passos:['CAC geral e do growth por UN','Regra de alocação por meta e CAC-alvo, com reserva para testes','Revisão mensal da divisão da verba'],bloco:'receita',regras:['CRZ-70'],kpi:'cac_geral',h:'m',esf:2,imp:3,tipo:'acelerar',pre:['metas_un'],area:'financeiro',ref:'LORSO'},
   {id:'projecao',t:'Projeção de retorno por UN e por campanha',o:'Levar à reitoria a verba como investimento, com retorno previsto e medido.',passos:['ROI por campanha a cada ciclo','LTV/CAC por UN com evasão descontada','Cenários para a decisão de verba do ano'],bloco:'receita',regras:['CRZ-71'],kpi:'roi_uns',h:'m',esf:2,imp:2,tipo:'acelerar',pre:['verba_roi'],area:'financeiro',ref:'LORSO'},
   {id:'proposta_valor',t:'Proposta de valor e mensagem por UN',o:'Cada público recebe a mensagem que faz sentido para ele.',passos:['Diferenciais e provas por UN','Mensagem por público e por etapa do funil','Validar com pesquisa rápida e concorrência'],bloco:'funil',regras:['CRZ-72'],kpi:'conv_insc',h:'m',esf:2,imp:2,tipo:'acelerar',area:'criacao',ref:'LORSO'},
   {id:'fila_adm',t:'Fila e catálogo de prazos para os pedidos administrativos',o:'Proteger a captação da fila administrativa, com prazo conhecido por tipo de pedido.',passos:['Catálogo de pedidos com prazo padrão por tipo','Fila separada e limite mensal por área','Pedido só entra com briefing completo'],bloco:'capacidade',regras:['CRZ-67'],kpi:'prazo_adm',h:'c',esf:1,imp:3,tipo:'destravar',area:'demandas',ref:'LORSO'}
  );
  if(typeof JOG!=='undefined') JOGADAS.forEach(j=>{ JOG[j.id]=j; });
}
