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
   <section class="block"><div class="block-h"><h3>Cursos de ${esc(u.nome)}</h3><p>${pl(d.cursos,'curso','cursos')}${d.lanc?` · ${pl(d.lanc,'lançamento','lançamentos')}`:''}</p></div>
    ${cursosTabela(cur.cursos.filter(c=>c.un===un))}</section>
   <section class="block"><div class="block-h"><h3>Contexto de ${esc(u.nome)}</h3><p>O que é desta UN. O que vale para toda a instituição fica na aba Geral.</p></div>
    <div class="fields">${fieldHtml(buKey(un,'calendario'),'Calendário de captação desta UN: vestibulares, editais, matrículas','t')}${fieldHtml(buKey(un,'concorrentes'),'Concorrentes desta UN e como se posicionam','t')}${fieldHtml(buKey(un,'diferenciais'),'Diferenciais desta UN (o que ela tem e o concorrente não)','t')}</div></section>`;
}
