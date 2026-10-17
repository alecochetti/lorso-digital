/* =====================================================================
   Base de conhecimento por unidade de negócio
   Cada UN tem a sua aba: captação, verba, receita, CAC, ROI, cursos e
   contexto. A aba Geral junta tudo num comparativo.
   Os números que já existiam continuam com a mesma chave (capacidade
   base.cap.*, verba e receita da entrevista da UN), então nada muda nas
   notas e regras: é o mesmo dado, digitado uma vez, visto em dois lugares.
   ===================================================================== */
const BU_OUTROS='outros';
const buKey=(un,k)=>`base.${un}.${k}`;
const buNum=k=>num(cur.campos[k]);

/* Linha de UN: capacidade somada dos turnos, verba, receita, funil, CAC e ROI */
function buDados(un){
  const caps=capRows().filter(r=>r.un===un);
  const soma=f=>{ const v=caps.map(r=>r[f]).filter(x=>x!=null); return v.length?v.reduce((a,b)=>a+b,0):null; };
  const alunos=soma('vagas'), meta=soma('meta'), captados=soma('captados');
  let tSoma=0,tPeso=0; caps.forEach(r=>{ if(r.ticket!=null){ const w=r.captados||r.vagas||1; tSoma+=r.ticket*w; tPeso+=w; } });
  const ticket=tPeso?tSoma/tPeso:null;
  const cs=cur.cursos.filter(c=>c.un===un&&c.status!=='Descontinuado');
  const turmas=cs.reduce((a,c)=>a+(num(c.turmas)||0),0)||null;
  const verba=buNum(`${un}.orcamento`), receita=buNum(`${un}.receita`), metaRec=buNum(`${un}.meta_rec`), metaMat=buNum(`${un}.meta_mat`);
  const leads=buNum(buKey(un,'leads')), insc=buNum(buKey(un,'inscritos'));
  const meses=buNum(buKey(un,'meses_roi'))||12;
  const cac=verba&&captados?verba/captados:null, cpl=verba&&leads?verba/leads:null;
  const recCapt=captados!=null&&ticket!=null?captados*ticket*meses:null;
  const roi=verba&&recCapt!=null?(recCapt-verba)/verba:null;
  const payback=verba&&captados&&ticket?verba/(captados*ticket):null;
  return {un,caps,alunos,meta,captados,ticket,turmas,cursos:cs.length,lanc:cs.filter(c=>c.status==='Lançamento').length,verba,receita,metaRec,metaMat,leads,insc,meses,cac,cpl,roi,payback,recCapt,
    ocup:alunos&&captados!=null?captados/alunos:null, ating:meta&&captados!=null?captados/meta:null, atRec:metaRec&&receita!=null?receita/metaRec:null,
    convLI:leads&&insc!=null?insc/leads:null, convIM:insc&&captados!=null?captados/insc:null};
}
const buN=v=>v==null?'—':Math.round(v).toLocaleString('pt-BR');
const buX=v=>v==null?'—':(v*100).toFixed(0)+'%';
const buRoi=v=>v==null?'—':(v>=0?'+':'')+(v*100).toFixed(0)+'%';

function buTabs(){
  const t=ui.baseUn||'geral', semUn=cur.cursos.filter(c=>!c.un).length;
  const L=[['geral','Geral'],...UNS.map(u=>[u.id,u.nome]),...(semUn?[[BU_OUTROS,'Outros cursos']]:[])];
  return `<nav class="subtabs bu-tabs" aria-label="Unidades de negócio">${L.map(([id,nm])=>{ const n=id==='geral'?cur.cursos.length:id===BU_OUTROS?semUn:cur.cursos.filter(c=>c.un===id).length;
    return `<button class="${t===id?'on':''}" data-act="bu-tab" data-v="${id}" ${t===id?'aria-current="page"':''}>${nm}${n?` <span class="bu-n">${n}</span>`:''}</button>`; }).join('')}</nav>`;
}

/* ---------- aba Geral: comparativo de todas as UNs ---------- */
function buGeralHtml(){
  const D=UNS.map(u=>({u,...buDados(u.id)}));
  const tot=f=>{ const v=D.map(d=>d[f]).filter(x=>x!=null); return v.length?v.reduce((a,b)=>a+b,0):null; };
  const T={alunos:tot('alunos'),meta:tot('meta'),captados:tot('captados'),verba:tot('verba'),receita:tot('receita'),metaRec:tot('metaRec'),recCapt:tot('recCapt'),turmas:tot('turmas')};
  T.cac=T.verba&&T.captados?T.verba/T.captados:null; T.roi=T.verba&&T.recCapt!=null?(T.recCapt-T.verba)/T.verba:null;
  T.ating=T.meta&&T.captados!=null?T.captados/T.meta:null; T.ocup=T.alunos&&T.captados!=null?T.captados/T.alunos:null;
  const cacMed=T.cac;
  const cell=(v,fmt,cls)=>`<td class="r num ${cls||''}">${fmt(v)}</td>`;
  const alerta=(x,lim)=>x!=null&&x<lim?'bu-bad':'';
  const linhas=D.filter(d=>d.alunos!=null||d.captados!=null||d.verba!=null||d.receita!=null||d.cursos);
  const shareV=d=>T.verba&&d.verba!=null?d.verba/T.verba:null, shareC=d=>T.captados&&d.captados!=null?d.captados/T.captados:null;
  return `<section class="block"><div class="block-h"><h3>Comparativo das unidades de negócio</h3><p>Cada UN tem a sua aba. Aqui fica a soma e a comparação.</p></div>
   ${linhas.length?`<div class="tblw"><table class="tbl bu-comp"><thead><tr><th>UN</th><th class="r">Cursos</th><th class="r">Alunos</th><th class="r">Meta</th><th class="r">Captados</th><th class="r">Da meta</th><th class="r">Ocupação</th><th class="r">Mensalidade</th><th class="r">Verba</th><th class="r">CAC</th><th class="r">ROI</th><th class="r">Receita x meta</th></tr></thead><tbody>
    ${linhas.map(d=>`<tr><td><button class="chip" data-act="bu-tab" data-v="${d.un}">${esc(d.u.nome)}</button></td>${cell(d.cursos||null,buN)}${cell(d.alunos,buN)}${cell(d.meta,buN)}${cell(d.captados,buN)}${cell(d.ating,buX,alerta(d.ating,0.8))}${cell(d.ocup,buX,alerta(d.ocup,0.7))}${cell(d.ticket,brl)}${cell(d.verba,brl)}${cell(d.cac,brl,d.cac!=null&&cacMed&&d.cac>1.5*cacMed?'bu-bad':'')}${cell(d.roi,buRoi,d.roi!=null&&d.roi<0?'bu-bad':'')}${cell(d.atRec,buX,alerta(d.atRec,0.85))}</tr>`).join('')}
    <tr class="bu-tot"><td><b>Total</b></td>${cell(cur.cursos.filter(c=>c.un).length||null,buN)}${cell(T.alunos,buN)}${cell(T.meta,buN)}${cell(T.captados,buN)}${cell(T.ating,buX)}${cell(T.ocup,buX)}<td></td>${cell(T.verba,brl)}${cell(T.cac,brl)}${cell(T.roi,buRoi)}${cell(T.metaRec&&T.receita!=null?T.receita/T.metaRec:null,buX)}</tr>
   </tbody></table></div>
   ${T.verba&&T.captados?`<div class="grpb bu-share" role="img" aria-label="Participação de cada UN na verba e nas matrículas">${D.filter(d=>shareV(d)!=null||shareC(d)!=null).map(d=>`<div class="gr"><span class="n">${esc(d.u.nome)}</span><span class="bs"><span class="b inv"><i style="width:${((shareV(d)||0)*100).toFixed(1)}%"></i></span><span class="b mat"><i style="width:${((shareC(d)||0)*100).toFixed(1)}%"></i></span></span><b>${buX(shareV(d))} · ${buX(shareC(d))}</b></div>`).join('')}
     <div class="legend"><span class="lg"><i style="background:var(--n3)"></i>% da verba</span><span class="lg"><i style="background:var(--n4)"></i>% das matrículas</span></div></div>`:''}
   <p class="muted" style="font-size:12.5px;margin:0">CAC: verba de marketing dividida pelos captados. ROI: mensalidade média x captados x meses considerados, menos a verba, dividido pela verba. Em vermelho: abaixo de 80% da meta, ocupação abaixo de 70%, CAC acima de 1,5 vez a média ou ROI negativo.</p>`
   :'<p class="empty">Abra a aba de cada UN e preencha alunos, meta, captados e verba. O comparativo aparece aqui.</p>'}
  </section>`;
}

/* ---------- aba de uma UN ---------- */
function buLigado(key,label,tipo,ligado){
  const v=cur.campos[key]??''; const pre=tipo==='R$';
  return `<div class="field"><label for="c-${esc(key)}">${esc(label)}${ligado?` <span class="tag area" title="O mesmo campo aparece em ${esc(ligado)}. Preencha uma vez.">ligado a ${esc(ligado)}</span>`:''}</label><div class="inu ${pre?'pre':''}"><input id="c-${esc(key)}" data-campo="${esc(key)}" inputmode="decimal" value="${esc(v)}" placeholder="${tipo==='m'?'12':'0'}">${pre?'<span class="u">R$</span>':tipo==='m'?'<span class="u">meses</span>':''}</div></div>`;
}
function buUnHtml(un,cursosTabela,pctCell){
  const u=UNS.find(x=>x.id===un), d=buDados(un), ent='Entrevistas · '+u.nome;
  const kp=(v,l,s,cls)=>`<div class="stat ${cls||''}"><b>${v}</b><span>${l}</span>${s?`<small>${s}</small>`:''}</div>`;
  const metaDif=d.metaMat!=null&&d.meta!=null&&Math.round(d.metaMat)!==Math.round(d.meta);
  return `
   <div class="stats bu-k">
    ${kp(buN(d.captados),'captados no ciclo',d.meta!=null?`meta ${buN(d.meta)} · ${buX(d.ating)}`:'',d.ating!=null&&d.ating<0.8?'bad':'')}
    ${kp(buN(d.alunos),'alunos de capacidade',d.turmas?`${buN(d.turmas)} turmas · ocupação ${buX(d.ocup)}`:d.ocup!=null?`ocupação ${buX(d.ocup)}`:'',d.ocup!=null&&d.ocup<0.7?'warn':'')}
    ${kp(d.verba!=null?brl(d.verba):'—','verba de marketing',d.cpl!=null?`CPL ${brl(d.cpl)}`:'')}
    ${kp(d.cac!=null?brl(d.cac):'—','CAC por matrícula',d.ticket!=null?`mensalidade média ${brl(d.ticket)}`:'')}
    ${kp(buRoi(d.roi),'ROI da captação',d.roi!=null?`${d.meses} meses de mensalidade${d.payback!=null?` · se paga em ${d.payback.toFixed(1).replace('.',',')} meses`:''}`:'',d.roi!=null&&d.roi<0?'bad':'')}
   </div>
   <section class="block"><div class="block-h"><h3>Captação e capacidade</h3><p>Alunos, meta e captados por turno ou modalidade.</p></div>
    <div class="tblw"><table class="tbl cap"><thead><tr><th>Turno ou modalidade</th><th class="r">Alunos</th><th class="r">Meta de captação</th><th class="r">Captados</th><th class="r">Mensalidade média</th><th class="r">Ocupação</th><th class="r">Da meta</th></tr></thead><tbody>
     ${d.caps.map(r=>`<tr><td>${r.mod}</td><td>${cap$(r.k,'vagas')}</td><td>${cap$(r.k,'meta')}</td><td>${cap$(r.k,'captados')}</td><td>${cap$(r.k,'ticket','R$')}</td>${pctCell(r.ocup,0.7)}${pctCell(r.ating,0.8)}</tr>`).join('')}
     ${d.caps.length>1?`<tr><td><b>Total</b></td><td class="r"><b>${buN(d.alunos)}</b></td><td class="r"><b>${buN(d.meta)}</b></td><td class="r"><b>${buN(d.captados)}</b></td><td class="r">${d.ticket!=null?brl(d.ticket):''}</td>${pctCell(d.ocup,0.7)}${pctCell(d.ating,0.8)}</tr>`:''}
    </tbody></table></div>${typeof capCursosHtml==='function'?capCursosHtml(un):''}
    ${metaDif?`<p class="pz-aviso"><span class="i">!</span><span>Na entrevista da UN a meta de matrículas informada é ${buN(d.metaMat)}, e a soma das metas aqui é ${buN(d.meta)}. Vale confirmar qual vale.</span></p>`:''}</section>
   <section class="block"><div class="block-h"><h3>Verba, funil e retorno</h3><p>Base do CAC e do ROI desta UN.</p></div>
    <div class="fields bu-f">
     ${buLigado(`${un}.orcamento`,'Verba de marketing no ciclo','R$',ent)}
     ${buLigado(`${un}.meta_rec`,'Meta de receita','R$',ent)}
     ${buLigado(`${un}.receita`,'Receita realizada ou projetada','R$',ent)}
     ${buLigado(buKey(un,'leads'),'Leads no ciclo','n')}
     ${buLigado(buKey(un,'inscritos'),'Inscritos no ciclo','n')}
     ${buLigado(buKey(un,'meses_roi'),'Meses de mensalidade por aluno (para o ROI)','m')}
    </div>
    ${d.leads||d.insc?`<div class="bu-funil">${[['Leads',d.leads],['Inscritos',d.insc],['Captados',d.captados]].map(([l,v],i,a)=>`<div><b>${buN(v)}</b><span>${l}</span>${i<a.length-1&&v&&a[i+1][1]!=null?`<small>${buX(a[i+1][1]/v)} seguem</small>`:''}</div>`).join('')}</div>`:''}
   </section>
   ${ciclosUnHtml(un)}
   <section class="block"><div class="block-h"><h3>Cursos de ${esc(u.nome)}</h3><p>${pl(d.cursos,'curso','cursos')}${d.lanc?` · ${pl(d.lanc,'lançamento','lançamentos')}`:''}</p></div>
    ${cursosTabela(cur.cursos.filter(c=>c.un===un))}</section>
   <section class="block"><div class="block-h"><h3>Contexto de ${esc(u.nome)}</h3><p>O que é desta UN. O que vale para toda a instituição fica na aba Geral.</p></div>
    <div class="fields">${fieldHtml(buKey(un,'calendario'),'Observações do calendário desta UN (editais, regras, exceções)','t')}${fieldHtml(buKey(un,'concorrentes'),'Concorrentes desta UN e como se posicionam','t')}${fieldHtml(buKey(un,'diferenciais'),'Diferenciais desta UN (o que ela tem e o concorrente não)','t')}</div></section>`;
}

/* ---------- Calendário de captação: ciclos por UN e datas dos cursos ---------- */
const CICLO_ETAPAS=[['camp_ini','Campanha começa'],['insc_ini','Inscrições abrem'],['mat_ini','Matrículas abrem'],['camp_fim','Campanha encerra'],['aulas','Aulas começam']];
const CICLO_SUG={colegio:['Matrículas do ano letivo','Rematrícula'],graduacao:['Vestibular 1º semestre','Vestibular 2º semestre','Transferência e segunda graduação'],pos:['Turma do 1º semestre','Turma do 2º semestre'],mestrado:['Processo seletivo']};
function ciclosTodos(){ try{ const L=JSON.parse(cur.campos['base.ciclos']||'[]'); return Array.isArray(L)?L:[]; }catch(e){ return []; } }
function ciclosSalvar(L){ cur.campos['base.ciclos']=L.length?JSON.stringify(L):''; touch(false); }
const cDt=s=>{ if(!s) return null; const [y,m,d]=String(s).split('-').map(Number); return y?new Date(y,m-1,d):null; };
const cFmt=s=>{ const d=cDt(s); return d?d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'}):'—'; };
const cHoje=()=>{ const t=new Date(); return new Date(t.getFullYear(),t.getMonth(),t.getDate()); };
function cicloSituacao(c){
  const h=cHoje(), ini=cDt(c.camp_ini)||cDt(c.insc_ini), fim=cDt(c.camp_fim), aulas=cDt(c.aulas), dias=(a,b)=>Math.round((b-a)/864e5);
  if(ini&&h<ini) return {k:'futuro',t:`começa em ${dias(h,ini)} dias`};
  if(fim&&h>fim) return aulas&&h<aulas?{k:'fim',t:`campanha encerrada · aulas em ${dias(h,aulas)} dias`}:{k:'fim',t:'encerrado'};
  if(ini||fim){ const mat=cDt(c.mat_ini); return {k:'agora',t:fim?`em captação · faltam ${dias(h,fim)} dias${mat&&h>=mat?' · matrículas abertas':''}`:'em captação'}; }
  return {k:'',t:'sem datas'};
}
/* Linha do tempo simples: barras por item, com marcos e o dia de hoje */
function cicloTimeline(itens){
  const datas=itens.flatMap(i=>[i.ini,i.fim,...(i.marcos||[]).map(m=>m.d)]).map(cDt).filter(Boolean);
  if(!datas.length) return '';
  let a=new Date(Math.min(...datas,cHoje())), b=new Date(Math.max(...datas,cHoje()));
  a=new Date(a.getFullYear(),a.getMonth(),1); b=new Date(b.getFullYear(),b.getMonth()+1,1);
  const span=b-a||1, x=s=>{ const d=cDt(s); return d?((d-a)/span*100):null; };
  const meses=[]; for(let d=new Date(a);d<b;d=new Date(d.getFullYear(),d.getMonth()+1,1)) meses.push(d);
  const hx=((cHoje()-a)/span*100).toFixed(2);
  return `<div class="ctl" role="img" aria-label="Linha do tempo da captação">
    <div class="ctl-m"><span></span><div>${meses.map(m=>`<i style="left:${((m-a)/span*100).toFixed(2)}%">${(t=>t.charAt(0).toUpperCase()+t.slice(1))(m.toLocaleDateString('pt-BR',{month:'short'}).replace('.',''))}${m.getMonth()===0?' '+String(m.getFullYear()).slice(2):''}</i>`).join('')}</div></div>
    ${itens.map(i=>{ const l=x(i.ini), r=x(i.fim); return `<div class="ctl-r"><span class="ctl-n" title="${esc(i.label)}">${esc(i.label)}${i.sub?`<small>${esc(i.sub)}</small>`:''}</span><div class="ctl-t">
      ${l!=null&&r!=null?`<b class="ctl-b ${i.cls||''}" style="left:${l.toFixed(2)}%;width:${Math.max(0.6,r-l).toFixed(2)}%"></b>`:''}
      ${l!=null&&i.forte!=null&&r!=null&&x(i.forte)!=null?`<b class="ctl-b forte" style="left:${x(i.forte).toFixed(2)}%;width:${Math.max(0.6,r-x(i.forte)).toFixed(2)}%" title="Matrículas abertas"></b>`:''}
      ${(i.marcos||[]).filter(m=>x(m.d)!=null).map(m=>`<em class="ctl-k" style="left:${x(m.d).toFixed(2)}%" title="${esc(m.l)}: ${cFmt(m.d)}"></em>`).join('')}
      <u class="ctl-h" style="left:${hx}%"></u></div></div>`; }).join('')}
    <div class="legend"><span class="lg"><i style="background:color-mix(in srgb,var(--l-ciano) 45%,transparent)"></i>Campanha</span><span class="lg"><i style="background:var(--l-verde-escuro)"></i>Matrículas abertas</span><span class="lg"><i class="ctl-lk"></i>Inscrições e início das aulas</span><span class="lg"><i style="background:var(--st-alerta);width:2px"></i>Hoje</span></div></div>`;
}
const cicloItem=c=>({label:c.nome||'Ciclo sem nome',sub:(UNS.find(u=>u.id===c.un)||{}).nome,ini:c.camp_ini||c.insc_ini,fim:c.camp_fim||c.aulas,forte:c.mat_ini,marcos:[{d:c.insc_ini,l:'Inscrições abrem'},{d:c.aulas,l:'Aulas começam'}]});
const cursoItem=c=>({label:c.nome,sub:c.obs||'',ini:c.abertura,fim:c.encerramento,cls:'curso'});

function ciclosUnHtml(un){
  const L=ciclosTodos().filter(c=>c.un===un), sug=(CICLO_SUG[un]||[]).filter(n=>!L.some(c=>c.nome===n));
  const cs=cur.cursos.filter(c=>c.un===un&&c.abertura&&c.encerramento);
  return `<section class="block"><div class="block-h"><h3>Calendário de captação</h3><p>Campanha, inscrições, matrículas e início das aulas de cada ciclo.</p></div>
   ${L.length?`<div class="tblw"><table class="tbl tciclos"><thead><tr><th style="min-width:200px">Ciclo</th>${CICLO_ETAPAS.map(([,l])=>`<th>${l}</th>`).join('')}<th>Situação</th><th></th></tr></thead><tbody>
    ${L.map(c=>{ const st=cicloSituacao(c); return `<tr><td><input data-ciclo="${c.id}" data-f="nome" value="${esc(c.nome||'')}" placeholder="Ex.: Vestibular 2027.1" aria-label="Nome do ciclo"></td>${CICLO_ETAPAS.map(([k,l])=>`<td><input type="date" class="dt" data-ciclo="${c.id}" data-f="${k}" value="${esc(c[k]||'')}" aria-label="${l}"></td>`).join('')}<td><span class="csit ${st.k}">${st.t}</span></td><td class="x"><button class="xbtn" data-act="ciclo-del" data-id="${c.id}" aria-label="Remover ciclo">×</button></td></tr>`; }).join('')}
   </tbody></table></div>`:'<p class="muted" style="margin:0">Nenhum ciclo ainda. Crie um para cada campanha de captação desta UN.</p>'}
   <div class="bu-cnt"><button class="btn sm" data-act="ciclo-add" data-v="">+ Ciclo de captação</button>${sug.map(n=>`<button class="chip" data-act="ciclo-add" data-v="${esc(n)}">+ ${esc(n)}</button>`).join('')}</div>
   ${cicloTimeline([...L.map(cicloItem),...cs.slice(0,20).map(cursoItem)])}
  </section>`;
}
function ciclosGeralHtml(){
  const L=ciclosTodos().filter(c=>c.camp_ini||c.insc_ini||c.camp_fim);
  const cs=cur.cursos.filter(c=>c.abertura&&c.encerramento&&!c.un);
  if(!L.length&&!cs.length) return `<section class="block"><div class="block-h"><h3>Calendário de captação</h3><p>Todas as UNs na mesma linha do tempo.</p></div><p class="empty">Cadastre os ciclos de captação na aba de cada UN (campanha, inscrições, matrículas e aulas) e as datas de abertura e encerramento dos cursos. A linha do tempo de todas as UNs aparece aqui.</p></section>`;
  const ag=L.filter(c=>cicloSituacao(c).k==='agora');
  return `<section class="block"><div class="block-h"><h3>Calendário de captação</h3><p>${ag.length?`${pl(ag.length,'ciclo em captação agora','ciclos em captação agora')}. `:''}Todas as UNs na mesma linha do tempo.</p></div>
   ${cicloTimeline([...L.sort((a,b)=>String(a.camp_ini||a.insc_ini).localeCompare(String(b.camp_ini||b.insc_ini))).map(cicloItem),...cs.slice(0,25).map(cursoItem)])}
   ${cs.length>25?`<p class="muted" style="font-size:12.5px;margin:0">Mostrando 25 de ${cs.length} cursos com datas. Todos estão na aba Outros cursos.</p>`:''}</section>`;
}
function ciclosAgoraHtml(){ // para a Visão geral do diagnóstico
  const h=cHoje(), L=ciclosTodos().filter(c=>{ const st=cicloSituacao(c); if(st.k==='agora') return true; const ini=cDt(c.camp_ini||c.insc_ini); return st.k==='futuro'&&ini&&(ini-h)/864e5<=60; });
  if(!L.length) return '';
  return `<section class="block"><div class="block-h"><h3>Captação agora e nos próximos 60 dias</h3><button class="btn sm" data-act="bu-tab" data-v="geral">Ver calendário</button></div>
   <div class="xlist">${L.map(c=>{ const st=cicloSituacao(c); return `<div class="xitem ${st.k==='agora'?'alta':'media'}"><span class="t">${esc(c.nome||'Ciclo')} · ${esc((UNS.find(u=>u.id===c.un)||{}).nome||'')}<small>${st.t}${c.mat_ini?` · matrículas a partir de ${cFmt(c.mat_ini)}`:''}${c.aulas?` · aulas em ${cFmt(c.aulas)}`:''}</small></span></div>`; }).join('')}</div></section>`;
}
function cicloClick(act,d){
  if(act==='ciclo-add'){ const un=ui.baseUn; if(!UNS.some(u=>u.id===un)) return true; const L=ciclosTodos(); L.push({id:uid(),un,nome:d.v||'',camp_ini:'',insc_ini:'',mat_ini:'',camp_fim:'',aulas:''}); ciclosSalvar(L); render(); return true; }
  if(act==='ciclo-del'){ ciclosSalvar(ciclosTodos().filter(c=>c.id!==d.id)); render(); return true; }
  return false;
}
['change'].forEach(ev=>document.addEventListener(ev,e=>{ const t=e.target; if(!t||!t.dataset||t.dataset.ciclo==null) return; const L=ciclosTodos(), c=L.find(x=>x.id===t.dataset.ciclo); if(!c) return; c[t.dataset.f]=t.value; ciclosSalvar(L); render(); }));

/* ---------- Regra: campanha começando com a UN despreparada ---------- */
function cicloRisco(){
  const h=cHoje(); return ciclosTodos().map(c=>{ const ini=cDt(c.camp_ini||c.insc_ini); if(!ini||!UNS.some(u=>u.id===c.un)) return null; const dias=Math.round((ini-h)/864e5); if(dias<0||dias>30) return null;
    const lv=L(c.un), atr=num(cur.campos[`${c.un}.dem_atraso`]); const motivos=[le(lv,2)?`a UN está no nível N${lv}`:null, atr>0?`há ${atr} ${atr===1?'demanda atrasada':'demandas atrasadas'} pelo marketing`:null].filter(Boolean);
    return motivos.length?{c,dias,motivos}:null; }).filter(Boolean);
}
if(typeof RULES!=='undefined'){
  RULES.push({id:'CRZ-66',sev:'alta',pad:'Campanha sem estrutura',areas:()=>[...new Set(cicloRisco().map(x=>x.c.un))],t:'Campanha de captação começa em menos de 30 dias com a UN despreparada',
    test:()=>cicloRisco().length>0,
    txt:()=>cicloRisco().map(x=>`${(UNS.find(u=>u.id===x.c.un)||{}).nome}: "${x.c.nome||'ciclo'}" começa ${x.dias===0?'hoje':`em ${x.dias} ${x.dias===1?'dia':'dias'}`} e ${x.motivos.join(' e ')}`).join('. ')+'. Campanha que começa sem processo pronto gasta verba atraindo gente que a operação não consegue converter.',
    rec:['Antes de abrir a campanha: briefing, peças e página de inscrição prontas e aprovadas','Fila do marketing reservada para a campanha nas próximas 4 semanas','Ponto de controle semanal com a coordenação da UN até o fim da captação']});
  const _blCap=typeof BLOCOS!=='undefined'&&BLOCOS.find(b=>b.id==='capacidade'); if(_blCap) _blCap.rules.push('CRZ-66');
}
