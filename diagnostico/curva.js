/* =====================================================================
   Curva de captação · inscritos, aprovados e matriculados por data
   Cada ciclo de captação (Calendário de captação da UN) guarda uma série
   de registros acumulados: c.serie=[{d,i,a,m,v}] (data, inscritos,
   aprovados, matriculados, investido até a data). Vem do CRM (planilha
   diária ou semanal) ou é digitada. Mostra a curva contra o ciclo
   anterior, a projeção de fechamento e o CAC real.
   Carregado depois de base-un.js.
   ===================================================================== */
if(typeof CICLO_NUM!=='undefined'&&!CICLO_NUM.some(x=>x[0]==='aprovados')) CICLO_NUM.splice(2,0,['aprovados','Aprovados','']);
if(typeof CICLO_NUM!=='undefined'&&!CICLO_NUM.some(x=>x[0]==='meta')) CICLO_NUM.splice(1,0,['meta','Meta de matrículas do ciclo','']);

const CV_S=[['i','Inscritos','var(--cv-i)'],['a','Aprovados','var(--cv-a)'],['m','Matriculados','var(--cv-m)']];
const cvN=v=>v==null?'—':Math.round(v).toLocaleString('pt-BR');
const cvP=v=>v==null||!isFinite(v)?'—':(v*100).toFixed(0)+'%';
const cvDia=s=>{ const d=cDt(s); return d?d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'}):'—'; };
const cvHojeISO=()=>{ const t=new Date(); return `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`; };

function cvSerie(c){ return (Array.isArray(c&&c.serie)?c.serie:[]).filter(p=>p&&p.d).sort((a,b)=>a.d.localeCompare(b.d)); }
function cvZero(c){ const s=cvSerie(c); return cDt(c.insc_ini)||cDt(c.camp_ini)||(s[0]&&cDt(s[0].d)); }
const cvOff=(c,d)=>{ const z=cvZero(c), x=cDt(d); return z&&x?Math.round((x-z)/864e5):null; };
/* valor acumulado do ciclo no dia t (desde a abertura), interpolando entre registros */
function cvEm(c,k,t){ const s=cvSerie(c).map(p=>[cvOff(c,p.d),num(p[k])]).filter(x=>x[0]!=null&&x[1]!=null); if(!s.length||t<s[0][0]) return null;
  for(let j=s.length-1;j>=0;j--){ if(s[j][0]<=t){ const n=s[j+1]; if(!n) return t-s[j][0]<=3?s[j][1]:null; return s[j][1]+(n[1]-s[j][1])*(t-s[j][0])/(n[0]-s[j][0]); } } return null; }
const cvUlt=(c,k)=>{ const s=cvSerie(c); for(let j=s.length-1;j>=0;j--){ const v=num(s[j][k]); if(v!=null) return v; } return null; };

/* ciclo anterior da mesma UN que tem curva, para comparar no mesmo ponto */
function cvAnterior(c){ const z=cvZero(c); return ciclosTodos().filter(x=>x.id!==c.id&&x.un===c.un&&cvSerie(x).length>1&&cvZero(x)&&(!z||cvZero(x)<z)).sort((a,b)=>cvZero(b)-cvZero(a))[0]||null; }

function cvAnalise(c){
  const s=cvSerie(c), last=s[s.length-1]||null, d=buDados(c.un);
  const i=cvUlt(c,'i'), a=cvUlt(c,'a'), m=cvUlt(c,'m'), l=cvUlt(c,'l');
  const t=last?cvOff(c,last.d):null, fim=c.camp_fim?cvOff(c,c.camp_fim):null;
  const inv=cvUlt(c,'v'), verba=num(c.verba)||cvVerbaCiclo(c); /* investido = o que o CRM ou a mídia informam até a data; a verba do ciclo é o planejado */
  const ant=cvAnterior(c); let proj=null, comp=null, como='';
  if(m!=null&&t!=null){
    if(ant){ const pm=cvEm(ant,'m',t), pf=cvUlt(ant,'m'); if(pm) { comp={m:pm,i:cvEm(ant,'i',t),nome:ant.nome}; if(pf!=null&&fim!=null&&t<fim&&pm>=10&&m>=5){ proj=m/pm*pf; como=`no ritmo de "${ant.nome}"`; } } }
    if(proj==null&&fim!=null&&t<fim&&s.length>1){ const ref=s.filter(p=>cvOff(c,p.d)>=t-14&&num(p.m)!=null); if(ref.length>1&&m>=10){ const p0=ref[0], dt=t-cvOff(c,p0.d); if(dt>=7){ proj=m+(m-num(p0.m))/dt*(fim-t); como='no ritmo dos últimos 14 dias'; } } }
  }
  const prev=s.length>1?s[s.length-2]:null, dlt=k=>prev&&num(last[k])!=null&&num(prev[k])!=null?num(last[k])-num(prev[k]):null;
  const metaC=num(c.meta);
  return {s,last,prev,i,a,m,l,t,fim,inv,verba,ant,comp,proj,como,meta:metaC||d.meta,metaDe:metaC?'ciclo':'UN',vagas:d.alunos,
    ia:i&&a!=null?a/i:null, am:a&&m!=null?m/a:null, im:i&&m!=null?m/i:null,
    cac:inv&&m?inv/m:null, cpi:inv&&i?inv/i:null, cpa:inv&&a?inv/a:null, cpl:inv&&l?inv/l:null, li:l&&i!=null?i/l:null, cacProj:verba&&proj?verba/proj:null,
    di:dlt('i'),da:dlt('a'),dm:dlt('m')};
}

/* ---------- verba: orçamento anual fechado, distribuído mês a mês conforme a captação ---------- */
const CV_MESES=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
function cvPlano(un){ try{ const o=JSON.parse(cur.campos[`base.${un}.plano_verba`]||'{}'); return o&&typeof o==='object'?o:{}; }catch(e){ return {}; } }
function cvPlanoSalvar(un,o){ const k=`base.${un}.plano_verba`; const L=Object.entries(o).filter(([,v])=>v!=null&&v!==''); if(L.length) cur.campos[k]=JSON.stringify(Object.fromEntries(L)); else delete cur.campos[k]; touch(false); }
/* verba planejada para o ciclo: soma dos meses do plano dentro da janela da campanha, proporcional aos dias */
function cvVerbaCiclo(c){ const P=cvPlano(c.un); if(!Object.keys(P).length) return null; const a=cDt(c.camp_ini||c.insc_ini), b=cDt(c.camp_fim); if(!a||!b||b<a) return null;
  let tot=0, d=new Date(a.getFullYear(),a.getMonth(),1);
  while(d<=b){ const ym=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`, v=num(P[ym]); if(v){ const fimM=new Date(d.getFullYear(),d.getMonth()+1,0), ini=a>d?a:d, fim=b<fimM?b:fimM; const dias=Math.round((fim-ini)/864e5)+1; tot+=v*dias/fimM.getDate(); } d=new Date(d.getFullYear(),d.getMonth()+1,1); }
  return tot||null; }
/* matriculados da UN: quem manda é o CRM (matrícula paga). Usa o ciclo de referência; sem ele, o ciclo escolhido na Captação */
function cvCrmUn(un){ const ref=String(cur.campos[`${un}.ciclo_ref`]||'').trim(); const L=ciclosTodos().filter(c=>c.un===un&&cvSerie(c).some(p=>num(p.m)!=null));
  if(!L.length) return null; const c=(ref&&L.find(x=>String(x.nome||'').includes(ref)))||(typeof cvEscolhido==='function'&&L.find(x=>x.id===(cvEscolhido(un)||{}).id))||L[L.length-1];
  return {c,m:cvUlt(c,'m'),i:cvUlt(c,'i'),l:cvUlt(c,'l'),inv:cvUlt(c,'v'),verba:num(c.verba)||cvVerbaCiclo(c)}; }

/* ---------- gráfico ---------- */
function cvGrafico(c,A,o){
  o=o||{keys:['i','a','m'],ant:['i','m'],refs:1,proj:1};
  const W=760,H=o.h||300,ml=52,mr=150,mt=16,mb=34, pw=W-ml-mr, ph=H-mt-mb;
  const pts=k=>A.s.map(p=>[cvOff(c,p.d),num(p[k])]).filter(x=>x[0]!=null&&x[1]!=null);
  const ant=A.ant, ap=k=>ant?cvSerie(ant).map(p=>[cvOff(ant,p.d),num(p[k])]).filter(x=>x[0]!=null&&x[1]!=null):[];
  const series=CV_S.filter(x=>o.keys.includes(x[0])).map(([k,l,cor])=>({k,l,cor,p:pts(k)})).filter(x=>x.p.length);
  const antS=[['i','Inscritos'],['a','Aprovados'],['m','Matriculados']].filter(x=>o.ant.includes(x[0])).map(([k,l])=>({k,l,cor:CV_S.find(x=>x[0]===k)[2],p:ap(k)})).filter(x=>x.p.length);
  const xs=[...series,...antS].flatMap(x=>x.p.map(p=>p[0])); if(A.fim!=null) xs.push(A.fim); cvProvas(c).forEach(v=>{ const t=cvOff(c,v.d); if(t!=null) xs.push(t); });
  const x0=Math.min(0,...xs), x1=Math.max(x0+7,...xs);
  const ys=[...series,...antS].flatMap(x=>x.p.map(p=>p[1])); (o.refs?[A.meta,A.vagas]:[]).concat(o.proj?[A.proj]:[]).forEach(v=>v&&ys.push(v));
  const yMx=Math.max(4,...ys)*1.04, st0=yMx/4, pw10=Math.pow(10,Math.floor(Math.log10(st0))), stp=[1,2,2.5,5,10].map(f=>f*pw10).find(f=>f>=st0), yTop=stp*4;
  const X=t=>ml+(t-x0)/(x1-x0)*pw, Y=v=>mt+ph-(v/yTop)*ph;
  const path=p=>p.map((q,j)=>`${j?'L':'M'}${X(q[0]).toFixed(1)},${Y(q[1]).toFixed(1)}`).join('');
  const ticks=[0,.25,.5,.75,1].map(f=>f*yTop);
  const z=cvZero(c), dLab=t=>{ if(!z) return `dia ${t}`; const d=new Date(z.getTime()+t*864e5); return d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'}); };
  const xt=[]; const passo=Math.max(7,Math.ceil((x1-x0)/6/7)*7); for(let t=Math.ceil(x0/passo)*passo;t<=x1;t+=passo) xt.push(t);
  /* rótulos diretos à direita, sem sobrepor */
  const labs=[]; series.forEach(x=>{ const q=x.p[x.p.length-1]; labs.push({y:Y(q[1]),t:`${x.l} ${cvN(q[1])}`,cor:x.cor,x:X(q[0])}); });
  if(o.refs&&A.meta) labs.push({y:Y(A.meta),t:`Meta ${cvN(A.meta)}`,cor:'var(--muted)',ref:1}); if(o.refs&&A.vagas) labs.push({y:Y(A.vagas),t:`Vagas ${cvN(A.vagas)}`,cor:'var(--muted)',ref:1});
  labs.sort((p,q)=>p.y-q.y); for(let j=1;j<labs.length;j++) if(labs[j].y-labs[j-1].y<14) labs[j].y=labs[j-1].y+14;
  const mProj=o.proj&&A.proj!=null&&A.t!=null&&A.fim!=null&&A.m!=null;
  const dias=[...new Set(series.flatMap(x=>x.p.map(p=>p[0])))].sort((p,q)=>p-q);
  return `<div class="cv-graf" data-cv-graf="${c.id}">${o.tit?`<b class="cv-gt">${o.tit}</b>`:''}
   <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Curva de captação de ${esc(c.nome||'ciclo')}: inscritos, aprovados e matriculados acumulados por data">
    ${ticks.map(v=>`<line x1="${ml}" x2="${ml+pw}" y1="${Y(v)}" y2="${Y(v)}" class="cv-grid"/><text x="${ml-8}" y="${Y(v)+4}" class="cv-ax" text-anchor="end">${cvN(v)}</text>`).join('')}
    ${xt.map(t=>`<text x="${X(t)}" y="${H-12}" class="cv-ax" text-anchor="middle">${dLab(t)}</text>`).join('')}
    ${o.refs&&A.meta?`<line x1="${ml}" x2="${ml+pw}" y1="${Y(A.meta)}" y2="${Y(A.meta)}" class="cv-ref"/>`:''}
    ${o.refs&&A.vagas?`<line x1="${ml}" x2="${ml+pw}" y1="${Y(A.vagas)}" y2="${Y(A.vagas)}" class="cv-ref cv-ref2"/>`:''}
    ${cvProvas(c).map((v,j)=>{ const t=cvOff(c,v.d); if(t==null||t<x0||t>x1) return ''; return `<line x1="${X(t)}" x2="${X(t)}" y1="${mt}" y2="${mt+ph}" class="cv-prova"/><text x="${X(t)+4}" y="${mt+11}" class="cv-ax cv-provat">${esc(v.nome||'Vestibular '+(j+1))}</text>`; }).join('')}
    ${A.fim!=null?`<line x1="${X(A.fim)}" x2="${X(A.fim)}" y1="${mt}" y2="${mt+ph}" class="cv-fim"/><text x="${X(A.fim)-4}" y="${mt+10}" class="cv-ax" text-anchor="end">fim da campanha</text>`:''}
    ${antS.map(x=>`<path d="${path(x.p)}" class="cv-ant" style="stroke:${x.cor}"/>`).join('')}
    ${series.map(x=>`<path d="${path(x.p)}" class="cv-lin" style="stroke:${x.cor}"/>${(x.p.length<=12?x.p:x.p.slice(-1)).map(q=>`<circle cx="${X(q[0])}" cy="${Y(q[1])}" r="3.2" class="cv-pt" style="fill:${x.cor}"/>`).join('')}`).join('')}
    ${mProj?`<path d="M${X(A.t)},${Y(A.m)}L${X(A.fim)},${Y(A.proj)}" class="cv-proj"/><circle cx="${X(A.fim)}" cy="${Y(A.proj)}" r="4" class="cv-projpt"/>`:''}
    ${labs.map(l=>`<text x="${ml+pw+8}" y="${l.y+4}" class="cv-lab${l.ref?' ref':''}" style="fill:${l.ref?'var(--muted)':'var(--fg)'}">${l.ref?'':`<tspan style="fill:${l.cor}">●</tspan> `}${esc(l.t)}</text>`).join('')}
    <line class="cv-cross" x1="0" x2="0" y1="${mt}" y2="${mt+ph}" style="display:none"/>
    ${dias.map((t,j)=>{ const a=j?(X(dias[j-1])+X(t))/2:ml, b=j<dias.length-1?(X(t)+X(dias[j+1]))/2:ml+pw; return `<rect class="cv-hit" x="${a}" y="${mt}" width="${Math.max(1,b-a)}" height="${ph}" data-t="${t}" data-x="${X(t)}"/>`; }).join('')}
   </svg>
   <div class="cv-tip" hidden></div>
   <div class="cv-leg">${series.map(x=>`<span><i style="background:${x.cor}"></i>${x.l}</span>`).join('')}${antS.length?`<span><i class="tr"></i>${esc(ant.nome||'ciclo anterior')} (tracejado)</span>`:''}${mProj?`<span><i class="pj"></i>projeção de matriculados</span>`:''}</div>
  </div>`;
}
function cvTip(c,t){ const ant=cvAnterior(c), z=cvZero(c); const d=z?new Date(z.getTime()+t*864e5).toLocaleDateString('pt-BR'):`dia ${t}`;
  const v=k=>{ const p=cvSerie(c).find(p=>cvOff(c,p.d)===t); return p?num(p[k]):null; };
  return `<b>${d}</b>${CV_S.map(([k,l,cor])=>v(k)!=null?`<span><i style="background:${cor}"></i>${l}<b>${cvN(v(k))}</b></span>`:'').join('')}${ant&&cvEm(ant,'m',t)!=null?`<small>${esc(ant.nome)} no mesmo ponto: ${cvN(cvEm(ant,'i',t))} inscritos, ${cvN(cvEm(ant,'m',t))} matriculados</small>`:''}`; }
document.addEventListener('mousemove',e=>{ const r=e.target; const g=r&&r.closest&&r.closest('.cv-graf'); if(!g) return;
  const tip=g.querySelector('.cv-tip'), cr=g.querySelector('.cv-cross');
  if(!r.classList.contains('cv-hit')){ if(!r.closest('svg')){ tip.hidden=true; cr.style.display='none'; } return; }
  const c=ciclosTodos().find(x=>x.id===g.dataset.cvGraf); if(!c) return;
  cr.setAttribute('x1',r.dataset.x); cr.setAttribute('x2',r.dataset.x); cr.style.display='';
  tip.innerHTML=cvTip(c,+r.dataset.t); tip.hidden=false; const b=g.getBoundingClientRect(); const x=e.clientX-b.left;
  tip.style.left=Math.min(b.width-tip.offsetWidth-4,Math.max(4,x+14))+'px'; tip.style.top='8px'; });
document.addEventListener('mouseleave',e=>{ const g=e.target&&e.target.classList&&e.target.classList.contains('cv-graf')?e.target:null; if(!g) return; g.querySelector('.cv-tip').hidden=true; g.querySelector('.cv-cross').style.display='none'; },true);

/* barras do que entrou entre um registro e outro */
function cvDiario(c,A){ const s=A.s; if(s.length<2) return '<p class="muted" style="margin:0">Com dois registros ou mais aparece aqui quanto entrou em cada dia ou semana.</p>';
  const rows=s.slice(1).map((p,j)=>({d:p.d,i:num(p.i)!=null&&num(s[j].i)!=null?num(p.i)-num(s[j].i):null,m:num(p.m)!=null&&num(s[j].m)!=null?num(p.m)-num(s[j].m):null})).slice(-21);
  const mx=Math.max(1,...rows.flatMap(r=>[r.i||0,r.m||0]));
  return `<div class="cv-bars" role="table" aria-label="Entradas por registro">${rows.map(r=>`<div class="cv-bar" role="row"><span class="d" role="cell">${cvDia(r.d)}</span>
    <span class="tr" role="cell"><i style="width:${(Math.max(0,r.i||0)/mx*100).toFixed(1)}%;background:var(--cv-i)"></i><em>${r.i!=null?'+'+cvN(r.i):'—'} inscritos</em></span>
    <span class="tr" role="cell"><i style="width:${(Math.max(0,r.m||0)/mx*100).toFixed(1)}%;background:var(--cv-m)"></i><em>${r.m!=null?'+'+cvN(r.m):'—'} matriculados</em></span></div>`).join('')}</div>`; }

/* ---------- período: vale para todos os números do CRM ---------- */
const CV_PER=[['ciclo','Ciclo todo'],['dia','Último dia'],['7','Últimos 7 dias'],['30','Últimos 30 dias'],['mes','Mês atual'],['mesant','Mês anterior']];
const cvISO=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const cvSoma=(iso,n)=>{ const d=cDt(iso); d.setDate(d.getDate()+n); return cvISO(d); };
/* a data de referência dos atalhos é a mesma para todas as áreas: o dado mais recente de qualquer ciclo */
function cvRefGlobal(){ let m=''; ciclosTodos().forEach(c=>{ const s=cvSerie(c); if(s.length&&s[s.length-1].d>m) m=s[s.length-1].d; }); return m||cvHojeISO(); }
function cvPer(c){ const s=cvSerie(c), lastC=s.length?s[s.length-1].d:cvHojeISO(), z=cvZero(c), ini=z?cvISO(z):(s[0]&&s[0].d)||lastC;
  const k=ui.cvPer||'ciclo', last=k==='ciclo'?lastC:cvRefGlobal(); let de=ini, ate=last;
  if(k==='dia') de=last; else if(k==='7') de=cvSoma(last,-6); else if(k==='30') de=cvSoma(last,-29);
  else if(k==='mes') de=last.slice(0,8)+'01'; else if(k==='mesant'){ const d=cDt(last.slice(0,8)+'01'); d.setDate(0); ate=cvISO(d); de=ate.slice(0,8)+'01'; }
  else if(k==='livre'){ de=ui.cvDe||ini; ate=ui.cvAte||last; }
  if(de<ini) de=ini; if(ate<de) ate=de; return {k,de,ate,ini,last}; }
/* valor acumulado no fim do dia (degrau: o último registro até a data) */
function cvAte(c,k,iso,dim,nome){ const s=cvSerie(c); let v=null, achou=false;
  for(const p of s){ if(p.d>iso) break; const src=dim?(p[dim]&&p[dim][nome]):p; if(dim&&!p[dim]) continue; achou=true; v=src?num(src[k]):0; }
  return achou?v:null; }
function cvJan(c,k,de,ate,dim,nome){ const fim=cvAte(c,k,ate,dim,nome); if(fim==null) return null; const ini=cvAte(c,k,cvSoma(de,-1),dim,nome);
  if(ini==null){ const z=cvZero(c); const s=cvSerie(c).filter(p=>!dim||p[dim]); if(s.length&&s[0].d>=de) return fim; if(z&&cvISO(z)>=de) return fim; return dim?null:fim; }
  return fim-(ini||0); }
/* comparação: período anterior do mesmo tamanho, ou o mesmo trecho do ciclo anterior */
function cvComp(c,P){ const n=Math.round((cDt(P.ate)-cDt(P.de))/864e5)+1, de2=cvSoma(P.de,-n), ate2=cvSoma(P.de,-1);
  if(de2>=P.ini) return {c,de:de2,ate:ate2,lab:`${cvDia(de2)} a ${cvDia(ate2)}`};
  const ant=cvAnterior(c); if(!ant) return null; const z=cvZero(c), za=cvZero(ant); if(!z||!za) return null;
  const off=iso=>Math.round((cDt(iso)-z)/864e5), em=o=>cvISO(new Date(za.getTime()+o*864e5));
  return {c:ant,de:em(off(P.de)),ate:em(off(P.ate)),lab:`o mesmo trecho de ${ant.nome||'ciclo anterior'}`}; }
function cvDelta(v,ant,lab,inv,pp){ if(v==null||ant==null) return ''; if(pp){ const d=(v-ant)*100; return `<em class="${(inv?-d:d)>=0?'up':'dn'}">${d>=0?'▲':'▼'} ${d>=0?'+':''}${d.toFixed(1).replace('.',',')} p.p.</em> vs ${lab}`; }
  if(!ant) return v?`<em class="up">▲ novo</em> vs ${lab} (0)`:''; const d=v/ant-1; return `<em class="${(inv?-d:d)>=0?'up':'dn'}">${d>=0?'▲':'▼'} ${d>=0?'+':''}${(d*100).toFixed(1).replace('.',',')}%</em> vs ${lab} (${cvN(ant)})`; }
function cvPerHtml(){ const k=ui.cvPer||'ciclo'; const c0=UNS.map(u=>cvEscolhido(u.id)).find(c=>c&&cvSerie(c).length); const P=c0?cvPer(c0):null;
  return `<div class="cv-per"><div class="cv-per-d"><label>De<input type="date" data-cv-per="de" value="${P?P.de:''}"></label><label>Até<input type="date" data-cv-per="ate" value="${P?P.ate:''}"></label></div>
   <div class="cv-per-b">${CV_PER.map(([v,l])=>`<button class="chip${k===v?' on':''}" data-act="ciclo-cv-per" data-v="${v}" aria-pressed="${k===v}">${l}</button>`).join('')}</div>
   <p class="muted">${P?(k==='ciclo'?'Ciclo todo: cada área conta desde o início do próprio ciclo até o último registro.':`Período: ${cvDia(P.de)} a ${cvDia(P.ate)}, igual para todas as áreas (o fim é o dado mais recente importado).`)+' A meta e a projeção são sempre do ciclo inteiro.':'Importe os números do CRM para escolher o período.'}</p></div>`; }

/* ---------- funil vertical, com a maior perda em destaque ---------- */
function cvFunil(x,inv){ const E=[['l','Leads','CPL'],['i','Inscritos','por inscrito'],['a','Aprovados','por aprovado'],['m','Matriculados','CAC']].filter(([k])=>x[k]!=null);
  if(!E.length) return '<p class="muted">Sem números neste período.</p>'; const top=Math.max(1,...E.map(([k])=>x[k]||0));
  const taxas=E.slice(1).map(([k],j)=>{ const a=x[E[j][0]]; return a?(x[k]||0)/a:null; }); const pior=taxas.reduce((b,t,j)=>t!=null&&(b<0||t<taxas[b])?j:b,-1);
  return `<div class="cv-vf">${E.map(([k,l,cl],j)=>`${j?`<p class="cv-pass${j-1===pior?' pior':''}">↓ ${taxas[j-1]!=null?(taxas[j-1]*100).toFixed(1).replace('.',',')+'%':'—'} passam</p>`:''}
    <div class="cv-vf-r"><span>${l}</span><b>${cvN(x[k])}</b></div><div class="cv-vf-b"><i style="width:${Math.max(1.5,(x[k]||0)/top*100).toFixed(1)}%"></i></div>${inv&&x[k]?`<small class="cv-vf-c">${cl} ${brl(inv/x[k])}</small>`:''}`).join('')}</div>`; }

function cvTempoHtml(c){ const s=cvSerie(c); let t=null; for(let j=s.length-1;j>=0;j--) if(s[j].t){ t=s[j].t; break; }
  if(!t) return `<p class="muted">Aparece quando a planilha do CRM traz a data de inscrição e a data de matrícula de cada aluno.</p>`; const mx=Math.max(1,...t.b);
  return `<p class="muted cv-sub">Matrículas por dias entre a inscrição e a matrícula. Mediana: ${String(t.med).replace('.',',')} dias, em ${cvN(t.n)} matrículas.</p>
   <div class="cv-tm">${CV_FX.map(([a,b,l],j)=>`<span>${l}</span><div><i class="${a>30?'tarde':''}" style="width:${(t.b[j]/mx*100).toFixed(1)}%"></i></div><b>${t.b[j]}</b>`).join('')}</div>`; }

/* quebra por curso ou origem, no período quando há dados nas duas pontas */
function cvQuebra(c,dim,P){ const s=cvSerie(c).filter(p=>p[dim]); if(!s.length) return null; const nomes=[...new Set(s.flatMap(p=>Object.keys(p[dim])))];
  let acum=false; const rows=nomes.map(nm=>{ const o={nome:nm}; ['l','i','a','m','v'].forEach(k=>{ let v=cvJan(c,k,P.de,P.ate,dim,nm); if(v==null){ v=cvAte(c,k,P.ate,dim,nm); if(v!=null) acum=true; } o[k]=v; }); return o; })
    .filter(r=>['l','i','a','m'].some(k=>r[k])).sort((a,b)=>(b.m||0)-(a.m||0)||(b.i||0)-(a.i||0));
  const ult=s.filter(p=>p.d<=P.ate).slice(-1)[0]||s[s.length-1]; return {rows,acum,d:ult.d}; }
const cvNb=x=>cvNorm(x).replace(/[^a-z0-9 ]+/g,' ').replace(/\s+/g,' ').trim();
const CV_SUF=/^(noturno|matutino|vespertino|diurno|integral|ead|presencial|hibrido|online|semipresencial|flexivel|live|manha|tarde|noite)( (noturno|matutino|vespertino|diurno|integral|ead|presencial|hibrido|online|semipresencial|flexivel|live|manha|tarde|noite))*$/;
function cvBaseCurso(un,nome){ const n=cvNb(nome); const bs=cur.cursos.filter(b=>b.un===un&&b.status!=='Descontinuado'&&(k=>k&&(k===n||(n.startsWith(k+' ')&&CV_SUF.test(n.slice(k.length+1)))))(cvNb(b.nome)));
  return {vagas:bs.reduce((a,b)=>a+(num(b.vagas)||0),0)||null,meta:bs.reduce((a,b)=>a+(num(b.meta)||0),0)||null}; }

function cvKpi(v,l,delta,sub,cls){ return `<div class="cv-kc ${cls||''}"><span>${l}</span><b>${v}</b>${delta?`<small class="dl">${delta}</small>`:''}${sub?`<small>${sub}</small>`:''}</div>`; }

/* ---------- bloco da UN ---------- */
function cvEscolhido(un){ const L=ciclosTodos().filter(c=>c.un===un); if(!L.length) return null; ui.cvCiclo=ui.cvCiclo||{};
  const e=L.find(c=>c.id===ui.cvCiclo[un]); if(e) return e;
  return L.find(c=>cicloSituacao(c).k==='agora')||L.filter(c=>cvSerie(c).length).sort((a,b)=>String(cvSerie(b).slice(-1)[0].d).localeCompare(cvSerie(a).slice(-1)[0].d))[0]||L[L.length-1]; }

const CV_SUB=[['funil','Funil e matrículas'],['cursos','Cursos'],['origens','Origens e campanhas'],['atend','Call center e comercial'],['verba','Verba e retorno'],['registros','Registros e importação']];
function curvaHtml(un){
  const L=ciclosTodos().filter(c=>c.un===un); const c=cvEscolhido(un);
  if(!c) return `<section class="block"><div class="block-h"><h3>Captação</h3></div>${cvEditaisHtml(un)}<p class="empty">Ou crie o ciclo à mão no Calendário de captação, abaixo (por exemplo, Vestibular 2027.1), e depois importe os números do CRM.</p></section>`;
  const A=cvAnalise(c), sub=CV_SUB.some(x=>x[0]===ui.cvSub)?ui.cvSub:'funil';
  const em=c.cvEm?new Date(c.cvEm):null;
  const topo=`${L.length>1?`<div class="bu-cnt cv-ciclos">${L.map(x=>`<button class="chip${x.id===c.id?' on':''}" data-act="ciclo-cv-ver" data-id="${x.id}" aria-pressed="${x.id===c.id}">${esc(x.nome||'Ciclo sem nome')}${cvSerie(x).length?` · ${cvSerie(x).length}`:''}</button>`).join('')}</div>`:''}
   ${(()=>{ const h=cvHojeISO(), pr=cvProvas(c).find(v=>v.d>=h); return pr?`<p class="cv-atual">Próximo vestibular: <b>${esc(pr.nome||'vestibular')}</b> ${pr.d===h?'hoje':`em ${Math.round((cDt(pr.d)-cDt(h))/864e5)} dias`}, ${cvDia(pr.d)}.</p>`:''; })()}
   <p class="cv-atual">${A.last?`${em?`Atualizado em <b>${em.toLocaleDateString('pt-BR')} às ${em.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</b> · `:''}dados até <b>${cDt(A.last.d).toLocaleDateString('pt-BR')}</b>${c.cvFonte?` · da planilha "${esc(c.cvFonte)}"`:''}`:'Sem registros ainda.'}</p>
   <nav class="cv-sub-t" aria-label="Partes da captação">${CV_SUB.map(([k,l])=>`<button class="${sub===k?'on':''}" data-act="ciclo-cv-sub" data-v="${k}" ${sub===k?'aria-current="page"':''}>${l}</button>`).join('')}</nav>`;
  let corpo='';
  if(!A.last&&sub!=='registros'&&sub!=='verba') corpo=`<p class="empty">${esc(c.nome||'Este ciclo')} ainda não tem registros. Em <button class="lnk" data-act="ciclo-cv-sub" data-v="registros">Registros e importação</button>, importe a planilha do CRM ou registre os números de hoje.</p>`;
  else if(sub==='funil') corpo=cvSubFunil(c,A);
  else if(sub==='cursos') corpo=cvSubQuebra(c,A,'c');
  else if(sub==='origens') corpo=cvSubQuebra(c,A,'o');
  else if(sub==='atend') corpo=cvSubAtend(c);
  else if(sub==='verba') corpo=cvSubVerba(c);
  else corpo=cvSubRegistros(c,A);
  const pend=cvEditais(un).filter(x=>x.ci);
  return `<section class="block cv"><div class="block-h"><h3>${esc(c.nome||'Ciclo')}</h3><p>${cicloSituacao(c).t}</p></div>${pend.length?`<div class="cv-eds">${pend.map(({f,ci})=>`<div class="cv-ed"><span><b>Edital ainda sem ciclo: ${esc(f.titulo||'edital')}</b><small>${esc(ci.nome)}: inscrições de ${edFmt(ci.ini)} a ${edFmt(ci.fim)}</small></span><button class="btn sm primary" data-act="ciclo-cv-edital" data-id="${f.id}">Criar o ciclo</button></div>`).join('')}</div>`:''}${topo}${corpo}</section>`;
}

function cvSubFunil(c,A){
  const P=cvPer(c), C=cvComp(c,P), J=k=>cvJan(c,k,P.de,P.ate), JC=k=>C?cvJan(C.c,k,C.de,C.ate):null;
  const x={l:J('l'),i:J('i'),a:J('a'),m:J('m')}, inv=J('v')!=null&&J('v')>0?J('v'):null, xc={l:JC('l'),i:JC('i'),a:JC('a'),m:JC('m')}, invC=JC('v');
  const lab=C?C.lab:'', base=x.l!=null?'l':'i', conv=x[base]&&x.m!=null?x.m/x[base]:null, convC=xc[base]&&xc.m!=null?xc.m/xc[base]:null;
  const vsAnt=A.comp&&A.m!=null?A.m/A.comp.m-1:null, modo=ui.cvModo||'acum';
  return `<h4 class="cv-h">Ciclo até agora</h4>
   <div class="cv-ks">
    ${cvKpi(cvN(A.m),'Matriculados',A.meta?`<em class="${A.m/A.meta>=0.5?'up':''}">${cvP(A.m/A.meta)} da meta</em> de ${cvN(A.meta)}${A.metaDe==='UN'?' (meta da UN; defina a meta do ciclo no Calendário)':''}`:'',A.am!=null?`${cvP(A.am)} dos aprovados · ${cvP(A.im)} dos inscritos`:'')}
    ${cvKpi(A.proj!=null?cvN(A.proj):'—','Projeção de fechamento',A.proj!=null&&A.meta?`<em class="${A.proj>=A.meta*0.95?'up':'dn'}">${cvP(A.proj/A.meta)} da meta</em>`:'',A.proj!=null?A.como:A.fim==null?'informe quando a campanha encerra':'poucos dados para projetar (precisa de 10 matriculados e 7 dias de registros)')}
    ${cvKpi(cvN(A.i),'Inscritos',A.comp&&A.comp.i?cvDelta(A.i,A.comp.i,`${esc(A.comp.nome)} no mesmo ponto`):'',A.ia!=null?`${cvP(A.ia)} viram aprovados`:'')}
    ${cvKpi(A.cac!=null?brl(A.cac):'—','CAC real',A.cacProj!=null?`projetado ${brl(A.cacProj)}`:'',A.inv?`${brl(A.inv)} investidos${A.cpl!=null?` · CPL ${brl(A.cpl)}`:''}`:'informe o investido em Registros')}
   </div>
   ${vsAnt!=null?`<p class="pz-aviso${vsAnt<0?'':' ok'}"><span class="i">${vsAnt<0?'!':'✓'}</span><span>No mesmo ponto de "${esc(A.comp.nome)}" eram ${cvN(A.comp.m)} matriculados. Hoje são ${cvN(A.m)}, ${vsAnt<0?`${cvP(-vsAnt)} abaixo`:`${cvP(vsAnt)} acima`}.</span></p>`:''}
   ${A.am!=null&&A.a>=10&&A.am<0.5&&(A.m>0||(c.mat_ini&&A.last&&A.last.d>=c.mat_ini))?`<p class="pz-aviso"><span class="i">!</span><span>${cvN(A.a-A.m)} aprovados ainda não se matricularam (${cvP(1-A.am)}). É dinheiro na mesa: vale uma ação dedicada a eles antes de investir em mais inscritos.</span></p>`:''}
   <h4 class="cv-h">No período</h4><p class="muted cv-sub">${cvDia(P.de)} a ${cvDia(P.ate)}, pela data de cada registro do CRM.${C?` Abaixo de cada número, a comparação com ${esc(lab)}.`:''}</p>
   <div class="cv-ks">
    ${x.l!=null?cvKpi(cvN(x.l),'Leads',cvDelta(x.l,xc.l,esc(lab)),inv&&x.l?`CPL ${brl(inv/x.l)}`:''):''}
    ${cvKpi(cvN(x.i),'Inscritos',cvDelta(x.i,xc.i,esc(lab)),x.l?`${cvP(x.i/x.l)} dos leads`:'')}
    ${x.a!=null?cvKpi(cvN(x.a),'Aprovados',cvDelta(x.a,xc.a,esc(lab)),x.i?`${cvP(x.a/x.i)} dos inscritos`:''):''}
    ${cvKpi(cvN(x.m),'Matriculados',cvDelta(x.m,xc.m,esc(lab)),inv&&x.m?`CAC ${brl(inv/x.m)}`:'')}
    ${cvKpi(conv!=null?(conv*100).toFixed(1).replace('.',',')+'%':'—',`${base==='l'?'Lead':'Inscrito'} → matrícula`,cvDelta(conv,convC,esc(lab),0,1),'matriculados ÷ '+(base==='l'?'leads':'inscritos'))}
    ${inv?cvKpi(brl(inv),'Investido',cvDelta(inv,invC,esc(lab),1),'verba de mídia no período'):''}
   </div>
   <div class="cv-dois">
    <div class="block cv-in"><h4>Funil do período</h4><p class="muted cv-sub">Em vermelho, a passagem com a maior perda.</p>${cvFunil(x,inv)}</div>
    <div class="block cv-in"><h4>Tempo da inscrição até a matrícula</h4>${cvTempoHtml(c)}</div>
   </div>
   <div class="cv-modo"><h4 class="cv-h" style="margin:0">Curva do ciclo</h4><div class="seg" role="group"><button class="${modo==='acum'?'on':''}" data-act="ciclo-cv-modo" data-v="acum" aria-pressed="${modo==='acum'}">Acumulado</button><button class="${modo==='dia'?'on':''}" data-act="ciclo-cv-modo" data-v="dia" aria-pressed="${modo==='dia'}">Por registro</button></div></div>
   ${modo==='dia'?cvDiario(c,A):`<div class="cv-gs">${cvGrafico(c,A,{keys:['a','m'],ant:['m'],refs:1,proj:1,tit:'Aprovados e matriculados, contra a meta e as vagas'})}${cvGrafico(c,A,{keys:['i'],ant:['i'],h:240,tit:'Inscritos'})}</div>`}`; }

function cvSubQuebra(c,A,dim){
  const P=cvPer(c), Q=cvQuebra(c,dim,P), cursos=dim==='c', nomeD=cursos?'curso':'origem';
  if(!Q) return `<p class="empty">Para ver ${cursos?'o funil de cada curso':'leads, matrículas e custo por origem'}, a planilha do CRM precisa de uma coluna ${cursos?'Curso':'Origem (ou Canal, Fonte, UTM)'}.</p>`;
  ui.cvSel=ui.cvSel||{}; const key=c.id+dim, sel=Q.rows.find(r=>r.nome===ui.cvSel[key])||Q.rows[0];
  const mxM=Math.max(1,...Q.rows.map(r=>r.m||0)), totM=Q.rows.reduce((a,r)=>a+(r.m||0),0);
  return `<p class="muted cv-sub">${Q.acum?`Números acumulados até ${cvDia(Q.d)}: a planilha trouxe ${nomeD} só no último retrato, então o período não se aplica aqui.`:`${cvDia(P.de)} a ${cvDia(P.ate)}.`} Clique num${cursos?'':'a'} ${nomeD} para ver o funil.</p>
   <div class="cv-dois">
    <div class="block cv-in"><h4>Funil de ${esc(sel.nome)}</h4>${cvFunil(sel,sel.v)}</div>
    <div class="block cv-in"><h4>Matriculados por ${nomeD}</h4><div class="cv-tm cv-q">${Q.rows.slice(0,12).map(r=>`<span title="${esc(r.nome)}">${esc(r.nome)}</span><div><i style="width:${((r.m||0)/mxM*100).toFixed(1)}%;background:var(--cv-m)"></i></div><b>${cvN(r.m)}${totM?` <small>${cvP((r.m||0)/totM)}</small>`:''}</b>`).join('')}</div></div>
   </div>
   <div class="tblw"><table class="tbl cv-ct"><thead><tr><th>${cursos?'Curso':'Origem'}</th><th class="r">Leads</th><th class="r">Inscritos</th><th class="r">Aprovados</th><th class="r">Matriculados</th><th class="r">Aprovado → matrícula</th><th class="r">${Q.rows.some(r=>r.l)?'Lead':'Inscrito'} → matrícula</th>${cursos?'<th class="r">Vagas</th><th class="r">Ocupação</th><th class="r">Meta</th><th class="r">Da meta</th>':''}<th class="r">Investido</th><th class="r">CPL</th><th class="r">CAC</th></tr></thead><tbody>
    ${Q.rows.map(r=>{ const b=cursos?cvBaseCurso(c.un,r.nome):{}; const bs=Q.rows.some(x=>x.l)?r.l:r.i; return `<tr class="${sel.nome===r.nome?'on':''}"><td><button class="lnk" data-act="ciclo-cv-sel" data-id="${key}" data-v="${esc(r.nome)}">${esc(r.nome)}</button></td><td class="num">${cvN(r.l)}</td><td class="num">${cvN(r.i)}</td><td class="num">${cvN(r.a)}</td><td class="num">${cvN(r.m)}</td><td class="num">${r.a?cvP(r.m/r.a):'—'}</td><td class="num">${bs?cvP((r.m||0)/bs):'—'}</td>${cursos?`<td class="num">${cvN(b.vagas)}</td><td class="num${b.vagas&&r.m!=null&&r.m/b.vagas<0.5?' cv-baixo':''}">${b.vagas&&r.m!=null?cvP(r.m/b.vagas):'—'}</td><td class="num">${cvN(b.meta)}</td><td class="num">${b.meta&&r.m!=null?cvP(r.m/b.meta):'—'}</td>`:''}<td class="num">${r.v?brl(r.v):'—'}</td><td class="num">${r.v&&r.l?brl(r.v/r.l):'—'}</td><td class="num">${r.v&&r.m?brl(r.v/r.m):'—'}</td></tr>`; }).join('')}
   </tbody></table></div>${cursos?'<p class="muted cv-nota">Vagas e meta vêm da tabela de cursos da área. A ocupação em vermelho está abaixo de 50%.</p>':''}`; }

/* editais lidos na Base que ainda podem virar ciclo desta área */
function cvEditais(un){ if(typeof editalDe!=='function') return []; return (cur.fontes||[]).map(f=>{ let e=null; try{ e=editalDe(f); }catch(x){} return e&&(!un||e.un===un)?{f,e,ci:edCiclo(e)}:null; }).filter(Boolean); }
function cvEditaisHtml(un){ const L=cvEditais(un), nm=(UNS.find(u=>u.id===un)||{}).nome||'';
  if(!L.length) return `<p class="muted cv-nota">Nenhum edital de ${esc(nm)} foi lido na Base de conhecimento. Suba o edital em Base de conhecimento › Fontes e ele cria o ciclo com as datas.</p>`;
  return `<div class="cv-eds">${L.map(({f,e,ci})=>`<div class="cv-ed"><span><b>${esc(f.titulo||'Edital')}</b><small>${ci?`${esc(ci.nome)}: inscrições de ${edFmt(ci.ini)} a ${edFmt(ci.fim)}${ci.aulas?` · aulas em ${edFmt(ci.aulas)}`:''}`:e.per?'o ciclo deste edital já existe':'o edital não traz o período de inscrições'}</small></span>${ci?`<button class="btn sm primary" data-act="ciclo-cv-edital" data-id="${f.id}">Criar o ciclo</button>`:''}</div>`).join('')}</div>`; }

/* ---------- verba e retorno ---------- */
function cvMesesCapt(un,ano){ const S=new Set(); ciclosTodos().filter(c=>c.un===un).forEach(c=>{ const a=cDt(c.camp_ini||c.insc_ini), b=cDt(c.camp_fim); if(!a||!b) return; let d=new Date(a.getFullYear(),a.getMonth(),1); while(d<=b){ if(d.getFullYear()===+ano) S.add(d.getMonth()); d=new Date(d.getFullYear(),d.getMonth()+1,1); } }); return S; }
/* investido real por mês, das séries do CRM (diferença do acumulado) */
function cvRealMes(un,ano){ const R=Array(12).fill(null); ciclosTodos().filter(c=>c.un===un).forEach(c=>{ let ant=0; cvSerie(c).forEach(p=>{ const v=num(p.v); if(v==null) return; const d=cDt(p.d); if(d.getFullYear()===+ano){ R[d.getMonth()]=(R[d.getMonth()]||0)+(v-ant); } ant=v; }); }); return R; }
function cvSubVerba(c){
  const un=c.un, d=buDados(un), anoDef=(String(cur.campos[`${un}.ciclo_ref`]||'').match(/20\d\d/)||[String(new Date().getFullYear())])[0];
  const ano=String(ui.cvAno||anoDef), P=cvPlano(un), anual=num(cur.campos[`${un}.orcamento`]), cap=cvMesesCapt(un,ano), real=cvRealMes(un,ano);
  const v=m=>num(P[`${ano}-${String(m+1).padStart(2,'0')}`]), tot=CV_MESES.reduce((a,_,m)=>a+(v(m)||0),0), mx=Math.max(1,...CV_MESES.map((_,m)=>Math.max(v(m)||0,real[m]||0)));
  const peso=num(ui.cvPeso)??50, dif=anual!=null&&tot?tot-anual:null;
  /* retorno por campanha */
  const s=cvSerie(c); let px=null, dim=''; for(let j=s.length-1;j>=0;j--){ if(s[j].x&&Object.keys(s[j].x).length){ px=s[j].x; dim='x'; break; } if(!px&&s[j].o&&Object.keys(s[j].o).length){ px=s[j].o; dim='o'; } }
  const desc=(num(cur.campos[`base.${un}.desc_enem`])||0)/100, meses=d.meses||12, mens=num(cur.campos[`base.${un}.ticket_roi`])||d.ticket;
  const camps=px?Object.entries(px).map(([k,q])=>{ const [camp,ingTxt]=dim==='x'?k.split('||'):[k,'']; const ing=/enem/i.test(ingTxt||camp)?'ENEM':/vestib/i.test(ingTxt||camp)||!ingTxt?'Vestibular':ingTxt;
      return {camp,ing,v:num(q.v),m:num(q.m)||0,l:num(q.l)}; }):[];
  /* junta as linhas da mesma campanha quando vieram separadas por ingresso */
  const porC={}; camps.forEach(x=>{ const o=porC[x.camp]=porC[x.camp]||{camp:x.camp,v:0,m:0,mEnem:0,l:0,ings:new Set()}; o.v+=x.v||0; o.m+=x.m; if(x.ing==='ENEM') o.mEnem+=x.m; o.l+=x.l||0; o.ings.add(x.ing); });
  const CR=Object.values(porC).map(o=>{ const rec=mens?((o.m-o.mEnem)*mens+o.mEnem*mens*(1-desc))*meses:null; return {...o,rec,roi:o.v&&rec!=null?rec/o.v:null,cac:o.v&&o.m?o.v/o.m:null}; }).sort((a,b)=>(b.roi||0)-(a.roi||0));
  const mxR=Math.max(0.01,...CR.map(x=>x.roi||0));
  return `<div class="cv-dois">
   <div class="block cv-in"><h4>Orçamento e premissas de ${esc((UNS.find(u=>u.id===un)||{}).nome||'')}</h4><p class="muted cv-sub">O orçamento anual vem fechado; a distribuição por mês fica no plano ao lado.</p>
    <div class="fields">${fieldHtml(`${un}.orcamento`,'Orçamento anual de marketing (fechado)','R$')}${fieldHtml(`base.${un}.ticket_roi`,`Mensalidade para o retorno${d.ticket?` (vazio usa ${brl(d.ticket)})`:''}`,'R$')}${fieldHtml(`base.${un}.desc_enem`,'Desconto de quem entra pelo ENEM (%)','%')}${fieldHtml(buKey(un,'meses_roi'),'Meses de mensalidade por aluno','n')}</div></div>
   <div class="block cv-in"><h4>Plano de verba por mês · ${esc(ano)}</h4>
    <div class="cv-ano">${[+anoDef-1,+anoDef,+anoDef+1].map(a=>`<button class="chip${String(a)===ano?' on':''}" data-act="ciclo-cv-ano" data-v="${a}">${a}</button>`).join('')}</div>
    <p class="muted cv-sub">Meses em destaque têm captação aberta em algum ciclo desta área. ${tot?`Plano: <b>${brl(tot)}</b>`:'Sem plano ainda.'}${anual!=null?` · orçamento anual ${brl(anual)}`:''}${dif?` · <span class="${dif>0?'cv-baixo':''}">${dif>0?'passa':'sobra'} ${brl(Math.abs(dif))}</span>`:''}</p>
    <div class="cv-plano">${CV_MESES.map((nm,m)=>`<label class="${cap.has(m)?'capt':''}"><span>${nm}</span><input class="cnum" data-cvplano="${un}" data-m="${ano}-${String(m+1).padStart(2,'0')}" value="${v(m)!=null?String(v(m)).replace('.',','):''}" inputmode="decimal" placeholder="0" aria-label="Verba de ${nm} de ${ano}"><i class="pl" style="height:${((v(m)||0)/mx*42).toFixed(0)}px" title="Planejado"></i><i class="rl" style="height:${((real[m]||0)/mx*42).toFixed(0)}px" title="Investido (CRM)"></i></label>`).join('')}</div>
    <div class="cv-leg"><span><i style="background:var(--cv-i)"></i>planejado</span><span><i style="background:var(--cv-m)"></i>investido (CRM)</span></div>
    <div class="cv-acoes">${anual?`<button class="btn sm" data-act="ciclo-cv-distr" data-v="${un}" data-ano="${ano}">Distribuir o orçamento igual nos 12 meses</button><span class="cv-peso">Meses de captação com <input class="cnum" data-cvpeso="1" value="${peso}" inputmode="decimal" aria-label="Peso dos meses de captação">% a mais</span><button class="btn sm primary" data-act="ciclo-cv-distr" data-v="${un}" data-ano="${ano}" data-peso="1">Distribuir com peso na captação</button>`:'<span class="muted">Preencha o orçamento anual para distribuir automaticamente, ou digite mês a mês.</span>'}</div>
   </div></div>
   <h4 class="cv-h">Retorno por campanha</h4>
   <p class="muted cv-sub">Receita estimada ÷ investido realizado na campanha. Receita = matrículas × mensalidade${mens?` (${brl(mens)})`:''} × ${meses} meses; quem entra pelo ENEM paga com ${Math.round(desc*100)}% de desconto, quem entra pelo vestibular paga cheio. ${dim==='x'?'A forma de ingresso veio da planilha.':'Sem coluna de forma de ingresso, campanha com "ENEM" no nome conta como ENEM e as outras como vestibular.'}</p>
   ${!px?`<p class="empty">Para ver o retorno de cada campanha, a planilha do CRM precisa das colunas Origem (ou Campanha), Matriculados e Investimento. Com a coluna Forma de ingresso, o ENEM entra com desconto.</p>`:!mens?`<p class="empty">Informe a mensalidade (acima ou na tabela Captação e capacidade da Base) para calcular a receita.</p>`:`
   <div class="tblw"><table class="tbl cv-ct"><thead><tr><th>Campanha</th><th>Ingresso</th><th class="r">Investido</th><th class="r">Matrículas</th><th class="r">Receita estimada</th><th class="r">Retorno</th><th class="r">CAC</th><th class="r">CPL</th></tr></thead><tbody>
    ${CR.map(x=>`<tr><td><b>${esc(x.camp)}</b></td><td>${[...x.ings].join(' + ')}</td><td class="num">${x.v?brl(x.v):'—'}</td><td class="num">${cvN(x.m)}${x.mEnem&&x.mEnem!==x.m?` <small class="muted">${cvN(x.mEnem)} ENEM</small>`:''}</td><td class="num">${x.rec!=null?brl(x.rec):'—'}</td><td class="num"><span class="cv-roi"><i style="width:${Math.max(2,(x.roi||0)/mxR*60).toFixed(0)}px;background:${x.roi!=null&&x.roi<1?'var(--st-alerta)':'var(--cv-m)'}"></i>${x.roi!=null?x.roi.toFixed(1).replace('.',',')+'x':'—'}</span></td><td class="num">${x.cac!=null?brl(x.cac):'—'}</td><td class="num">${x.v&&x.l?brl(x.v/x.l):'—'}</td></tr>`).join('')}
   </tbody></table></div><p class="muted cv-nota">Retorno abaixo de 1x (em vermelho): a receita estimada não cobre o que foi investido na campanha. Sem investido informado, a campanha não tem retorno calculado.</p>`}`; }

/* ---------- call center e comercial ---------- */
const cvH=h=>h==null?'—':h<1?`${Math.round(h*60)} min`:h<48?`${String(Math.round(h*10)/10).replace('.',',')} h`:`${String(Math.round(h/24*10)/10).replace('.',',')} dias`;
function cvFunilAt(x){ const E=[['l','Leads recebidos'],['ct','Contatados'],['cm','Com o comercial'],['i','Inscritos'],['a','Aprovados'],['m','Matriculados']].filter(([k])=>x[k]!=null);
  const top=Math.max(1,x.l||0); const taxas=E.slice(1).map(([k],j)=>{ const a=x[E[j][0]]; return a?(x[k]||0)/a:null; }); const pior=taxas.reduce((b,t,j)=>t!=null&&(b<0||t<taxas[b])?j:b,-1);
  return `<div class="cv-vf">${E.map(([k,l],j)=>`${j?`<p class="cv-pass${j-1===pior?' pior':''}">↓ ${taxas[j-1]!=null?(taxas[j-1]*100).toFixed(1).replace('.',',')+'%':'—'} passam</p>`:''}<div class="cv-vf-r"><span>${l}</span><b>${cvN(x[k])}</b></div><div class="cv-vf-b"><i style="width:${Math.max(1.5,(x[k]||0)/top*100).toFixed(1)}%"></i></div>`).join('')}</div>`; }
function cvSubAtend(c){
  const s=cvSerie(c); let p=null; for(let j=s.length-1;j>=0;j--) if(s[j].at){ p=s[j]; break; }
  if(!p) return `<div class="empty cv-vazio"><p>Para ver o funil do call center e do comercial, importe do CRM a <b>lista de leads</b> (um por linha), com estas colunas:</p>
   <ul><li><b>Status</b> ou etapa do lead (novo, em contato, encaminhado ao comercial, inscrito, aprovado, matriculado, perdido…)</li><li><b>Atendente do call center</b> e <b>Consultor comercial</b>, ou uma coluna <b>Responsável</b> com outra de <b>Equipe</b></li><li><b>Data de criação</b> do lead e <b>Data do primeiro contato</b>, com a hora, para medir o tempo de resposta</li><li>Se tiver: data de inscrição, data de matrícula, curso e origem</li></ul></div>`;
  const at=p.at, t=at.tot, ord=(a,b)=>(b.m-a.m)||(b.i-a.i)||(b.l-a.l);
  const eqs=Object.entries(at.eq), pes=at.pes.slice().sort(ord), mx=Math.max(1,...pes.map(x=>x.m));
  const sc=t.l-t.ct;
  const eqCard=([nm,o])=>{ const cc=/call/i.test(nm); return `<div class="cv-kc cv-eqc"><span>${esc(nm)}</span><b>${cvN(o.l)}</b><small>${cc?'leads atribuídos':'leads recebidos'}</small>
    <dl>${(cc?[['Contatados',o.ct,o.l],['Levados ao comercial',o.cm,o.ct],['Inscritos',o.i,o.l],['Tempo até o 1º contato',null,null,cvH(o.hmed)]]:[['Inscritos',o.i,o.l],['Aprovados',o.a,o.i],['Matriculados',o.m,o.l],['Conversão',null,null,o.l?((o.m/o.l)*100).toFixed(1).replace('.',',')+'%':'—']]).map(([l,v,b,txt])=>`<div><dt>${l}</dt><dd>${txt!=null?txt:`${cvN(v)}${b?` <small>${cvP(v/b)}</small>`:''}`}</dd></div>`).join('')}</dl></div>`; };
  return `<p class="muted cv-sub">Retrato da lista de leads de ${cvDia(p.d)}: cada lead na etapa em que está hoje. Para acompanhar a evolução, importe a lista toda semana (ou todo dia no começo da campanha).</p>
   <div class="cv-ks">
    ${cvKpi(cvN(t.l),'Leads recebidos','',`${cvN(at.pes.length)} pessoas no atendimento`)}
    ${cvKpi(cvN(t.ct),'Contatados','',t.l?`${cvP(t.ct/t.l)} dos leads`:'')}
    ${cvKpi(cvN(sc),'Sem contato','',t.l?`${cvP(sc/t.l)} dos leads ainda sem contato`:'',sc/t.l>0.2?'ruim':'')}
    ${cvKpi(cvN(t.cm),'Com o comercial','',t.ct?`${cvP(t.cm/t.ct)} dos contatados`:'')}
    ${cvKpi(cvN(t.m),'Matriculados','',t.l?`${(t.m/t.l*100).toFixed(1).replace('.',',')}% dos leads`:'')}
    ${at.tc?cvKpi(cvH(at.tc.med),'Tempo até o 1º contato','',`mediana de ${cvN(at.tc.n)} leads contatados`,at.tc.med>24?'ruim':''):''}
   </div>
   ${sc&&t.l&&sc/t.l>0.2?`<p class="pz-aviso"><span class="i">!</span><span>${cvN(sc)} leads (${cvP(sc/t.l)}) ainda não foram contatados. Lead que espera esfria: a chance de inscrição cai a cada hora sem resposta.</span></p>`:''}
   <div class="cv-dois">
    <div class="block cv-in"><h4>Funil do atendimento</h4><p class="muted cv-sub">Em vermelho, a passagem com a maior perda.</p>${cvFunilAt(t)}</div>
    <div class="block cv-in"><h4>Tempo até o primeiro contato</h4>${at.tc?`<p class="muted cv-sub">Da criação do lead ao primeiro contato. Mediana: ${cvH(at.tc.med)}.</p><div class="cv-tm">${CV_HX.map(([a,b,l],j)=>`<span>${l}</span><div><i class="${a>=24?'tarde':''}" style="width:${(at.tc.b[j]/Math.max(1,...at.tc.b)*100).toFixed(1)}%"></i></div><b>${cvN(at.tc.b[j])}</b>`).join('')}<span>Sem contato</span><div><i class="tarde" style="width:${(at.tc.b[5]/Math.max(1,...at.tc.b)*100).toFixed(1)}%"></i></div><b>${cvN(at.tc.b[5])}</b></div>`:'<p class="muted">Aparece quando a lista traz a data de criação do lead e a data do primeiro contato, com a hora.</p>'}</div>
   </div>
   ${eqs.length>1||at.cc?`<h4 class="cv-h">Equipes</h4><div class="cv-ks cv-eqs">${eqs.map(eqCard).join('')}</div>`:''}
   ${pes.length?cvPessoas(pes,at.cc):''}`; }
function cvBarras(L,val,fmt,cor){ const mx=Math.max(1e-9,...L.map(val)); return `<div class="cv-tm cv-q">${L.slice(0,12).map(x=>`<span title="${esc(x.nome)}">${esc(x.nome)}</span><div><i style="width:${(val(x)/mx*100).toFixed(1)}%;${cor?`background:${cor}`:''}"></i></div><b>${fmt(x)}</b>`).join('')}</div>`; }
const cvPc=(a,b)=>b?(a/b*100).toFixed(1).replace('.',',')+'%':'—';
function cvPessoas(pes,cc){
  const linha=(x,cols)=>`<tr><td><b>${esc(x.nome)}</b></td>${cols.map(f=>`<td class="num">${f(x)}</td>`).join('')}</tr>`;
  if(cc){ const C=pes.filter(x=>x.eq==='Call center').sort((a,b)=>b.cm/(b.l||1)-a.cm/(a.l||1)), M=pes.filter(x=>x.eq==='Comercial').sort((a,b)=>(b.m-a.m)||(b.i-a.i));
    return `${C.length?`<h4 class="cv-h">Call center, por atendente</h4><div class="cv-dois">
      <div class="block cv-in"><h4>Leads levados ao comercial</h4><p class="muted cv-sub">Do total atribuído a cada atendente.</p>${cvBarras(C,x=>x.l?x.cm/x.l:0,x=>`${cvPc(x.cm,x.l)} <small>${cvN(x.cm)}</small>`)}</div>
      <div class="block cv-in"><h4>Tempo até o primeiro contato</h4><p class="muted cv-sub">Mediana de cada atendente. Menor é melhor.</p>${cvBarras(C.filter(x=>x.hmed!=null).sort((a,b)=>a.hmed-b.hmed),x=>x.hmed,x=>cvH(x.hmed),'var(--cv-l)')}</div></div>
      <div class="tblw"><table class="tbl cv-ct"><thead><tr><th>Atendente</th><th class="r">Leads atribuídos</th><th class="r">Contatados</th><th class="r">Sem contato</th><th class="r">Levados ao comercial</th><th class="r">Inscritos</th><th class="r">Matriculados</th><th class="r">1º contato (mediana)</th></tr></thead><tbody>
      ${C.map(x=>linha(x,[x=>cvN(x.l),x=>`${cvN(x.ct)} <small class="muted">${cvP(x.ct/(x.l||1))}</small>`,x=>`<span class="${x.l&&(x.l-x.ct)/x.l>0.2?'cv-baixo':''}">${cvN(x.l-x.ct)}</span>`,x=>`${cvN(x.cm)} <small class="muted">${cvP(x.cm/(x.l||1))}</small>`,x=>cvN(x.i),x=>cvN(x.m),x=>`<span class="${x.hmed>24?'cv-baixo':''}">${cvH(x.hmed)}</span>`])).join('')}
      </tbody></table></div>`:''}
     ${M.length?`<h4 class="cv-h">Comercial, por consultor</h4><div class="cv-dois">
      <div class="block cv-in"><h4>Matriculados</h4>${cvBarras(M,x=>x.m,x=>cvN(x.m),'var(--cv-m)')}</div>
      <div class="block cv-in"><h4>Conversão em matrícula</h4><p class="muted cv-sub">Matriculados ÷ leads recebidos do call center.</p>${cvBarras(M.filter(x=>x.l>=5).slice().sort((a,b)=>b.m/b.l-a.m/a.l),x=>x.m/x.l,x=>cvPc(x.m,x.l))}</div></div>
      <div class="tblw"><table class="tbl cv-ct"><thead><tr><th>Consultor</th><th class="r">Leads recebidos</th><th class="r">Inscritos</th><th class="r">Aprovados</th><th class="r">Matriculados</th><th class="r">Aprovado → matrícula</th><th class="r">Lead → matrícula</th></tr></thead><tbody>
      ${M.map(x=>linha(x,[x=>cvN(x.l),x=>`${cvN(x.i)} <small class="muted">${cvP(x.i/(x.l||1))}</small>`,x=>cvN(x.a),x=>cvN(x.m),x=>x.a?cvPc(x.m,x.a):'—',x=>cvPc(x.m,x.l)])).join('')}
      </tbody></table></div>`:''}
     <p class="muted cv-nota">Em vermelho: mais de 20% dos leads sem contato ou primeiro contato acima de 24 horas.</p>`; }
  const P=pes.slice().sort((a,b)=>(b.m-a.m)||(b.i-a.i));
  return `<h4 class="cv-h">Por pessoa</h4><div class="cv-dois">
    <div class="block cv-in"><h4>Matriculados</h4>${cvBarras(P,x=>x.m,x=>cvN(x.m),'var(--cv-m)')}</div>
    <div class="block cv-in"><h4>Conversão lead → matrícula</h4>${cvBarras(P.filter(x=>x.l>=5).sort((a,b)=>b.m/b.l-a.m/a.l),x=>x.m/x.l,x=>cvPc(x.m,x.l))}</div></div>
   <div class="tblw"><table class="tbl cv-ct"><thead><tr><th>Pessoa</th><th>Equipe</th><th class="r">Leads</th><th class="r">Contatados</th><th class="r">Com o comercial</th><th class="r">Inscritos</th><th class="r">Matriculados</th><th class="r">Lead → matrícula</th><th class="r">1º contato (mediana)</th></tr></thead><tbody>
    ${P.map(x=>`<tr><td><b>${esc(x.nome)}</b></td><td class="nw">${esc(x.eq)}</td><td class="num">${cvN(x.l)}</td><td class="num">${cvN(x.ct)} <small class="muted">${cvP(x.ct/(x.l||1))}</small></td><td class="num">${cvN(x.cm)}</td><td class="num">${cvN(x.i)}</td><td class="num">${cvN(x.m)}</td><td class="num">${cvPc(x.m,x.l)}</td><td class="num${x.hmed>24?' cv-baixo':''}">${cvH(x.hmed)}</td></tr>`).join('')}
   </tbody></table></div>`; }

/* vestibulares e provas do ciclo */
function cvProvas(c){ return (Array.isArray(c.provas)?c.provas:[]).filter(v=>v&&v.d).sort((a,b)=>a.d.localeCompare(b.d)); }
function cvProvasHtml(c){ const L=Array.isArray(c.provas)?c.provas:[], h=cvHojeISO(), prox=cvProvas(c).find(v=>v.d>=h);
  return `<div class="cv-provas"><div class="cv-provas-h"><b>Vestibulares e provas do ciclo</b>${prox?`<span class="tag area">próximo: ${esc(prox.nome||'vestibular')} ${prox.d===h?'hoje':`em ${Math.round((cDt(prox.d)-cDt(h))/864e5)} dias`} (${cvDia(prox.d)})</span>`:''}</div>
   ${L.length?`<div class="cv-pl">${L.map((v,j)=>`<div class="cv-pr"><input type="date" class="dt" data-cvprova="${c.id}" data-j="${j}" data-f="d" value="${esc(v.d||'')}" aria-label="Data do vestibular"><input data-cvprova="${c.id}" data-j="${j}" data-f="nome" value="${esc(v.nome||'')}" placeholder="Ex.: 1º vestibular agendado, prova ENEM, vestibular de inverno" aria-label="Nome do vestibular"><button class="x" data-act="ciclo-cv-prova-del" data-id="${c.id}" data-j="${j}" aria-label="Apagar">×</button></div>`).join('')}</div>`:'<p class="muted cv-nota" style="margin:0">Cadastre as datas de prova: elas aparecem como linhas na curva, para ver o efeito de cada vestibular nas inscrições.</p>'}
   <button class="btn sm" data-act="ciclo-cv-prova-add" data-id="${c.id}">+ Vestibular ou prova</button></div>`; }
function cvSubRegistros(c,A){ const todos=ui.cvTodos===c.id, lin=A.s.slice().reverse(), vis=todos?lin:lin.slice(0,10);
  return `${cvProvasHtml(c)}<div class="cv-acoes">
    <label class="btn sm primary cv-up">Importar do CRM para ${esc(c.nome||'este ciclo')}<input type="file" data-cv-imp="${c.id}" accept=".csv,.tsv,.txt,.xlsx,.xls" hidden></label>
    <button class="btn sm" data-act="ciclo-cv-add" data-id="${c.id}">+ Registrar os números de hoje</button></div>
   <p class="muted cv-nota">A planilha pode ser o total por dia ou semana (data, leads, inscritos, aprovados, matriculados, investimento, e se tiver, curso e origem) ou a lista de inscritos com status, data de inscrição e data de matrícula. Uma data que já existe é substituída pela nova.</p>
   ${A.s.length?`<div class="tblw"><table class="tbl cv-t"><thead><tr><th>Data</th><th class="r">Leads</th><th class="r">Inscritos</th><th class="r">Aprovados</th><th class="r">Matriculados</th><th class="r">Investido até a data</th><th class="r">CAC na data</th><th></th></tr></thead><tbody>
    ${vis.map(p=>{ const j=A.s.indexOf(p), v=num(p.v), m=num(p.m); return `<tr><td><input type="date" class="dt" data-cvp="${c.id}" data-j="${j}" data-f="d" value="${esc(p.d)}" aria-label="Data"></td>${['l','i','a','m','v'].map(k=>`<td><input class="cnum" data-cvp="${c.id}" data-j="${j}" data-f="${k}" value="${esc(p[k]==null?'':String(p[k]))}" inputmode="decimal" placeholder="${k==='v'?'R$':'0'}" aria-label="${{l:'Leads',i:'Inscritos',a:'Aprovados',m:'Matriculados',v:'Investido até a data'}[k]}"></td>`).join('')}<td class="num">${v&&m?brl(v/m):'—'}</td><td><button class="x" data-act="ciclo-cv-del" data-id="${c.id}" data-j="${j}" aria-label="Apagar o registro de ${cvDia(p.d)}">×</button></td></tr>`; }).join('')}
   </tbody></table></div>${lin.length>10?`<button class="btn sm ghost" data-act="ciclo-cv-todos" data-id="${c.id}">${todos?'Mostrar só os últimos':`Ver todos os ${lin.length} registros`}</button>`:''}`:''}`; }

/* resumo de uma linha para "Captação agora" na Visão geral */
function cvResumo(c){ const A=cvAnalise(c); if(!A.last) return ''; return ` · ${cvDia(A.last.d)}: ${cvN(A.i)} inscritos${A.di?` (+${cvN(A.di)})`:''}, ${cvN(A.m)} matriculados${A.dm?` (+${cvN(A.dm)})`:''}`; }

/* mantém os totais do ciclo (tabela do calendário) iguais ao último registro */
function cvSync(c){ c.serie=cvSerie(c); ['i','a','m'].forEach((k,j)=>{ const v=cvUlt(c,k); if(v!=null) c[['inscritos','aprovados','matriculados'][j]]=String(v); }); }
/* o desenho espera o foco ir para o próximo campo (Tab), para não perder o que se digita em seguida */
function cvGravar(c,muda){ const L=ciclosTodos(), x=L.find(y=>y.id===c.id); if(!x) return; muda(x); cvSync(x); ciclosSalvar(L); setTimeout(render,0); }

/* ---------- importação do CRM ---------- */
const cvNorm=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().trim();
/* data válida ou null; mdy=true quando a coluna está no padrão americano (mês/dia) */
const cvOk=(y,m,d)=>{ const x=new Date(+y,+m-1,+d); return x.getFullYear()===+y&&x.getMonth()===+m-1&&x.getDate()===+d&&+y>1990&&+y<2100; };
function cvData(v,mdy){ const s=String(v||'').trim(); let m;
  if((m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return cvOk(m[1],m[2],m[3])?`${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`:null;
  if((m=s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/))){ const y=m[3].length===2?'20'+m[3]:m[3]; const d=mdy?m[2]:m[1], mo=mdy?m[1]:m[2]; return cvOk(y,mo,d)?`${y}-${mo.padStart(2,'0')}-${d.padStart(2,'0')}`:null; }
  if(/^\d{5}(\.\d+)?$/.test(s)){ const d=new Date(Math.round((+s-25569)*864e5)); return d.toISOString().slice(0,10); }
  return null; }
/* a coluna de datas está em mês/dia? só quando algum valor obriga (2º número > 12 e nenhum 1º > 12) */
function cvMdy(rows,ci){ if(ci<0) return false; let a=false,b=false; rows.forEach(r=>{ const m=String(r[ci]||'').match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-]\d{2,4}/); if(m){ if(+m[1]>12) a=true; if(+m[2]>12) b=true; } }); return b&&!a; }
const CV_FALHA='Não achei nesta planilha uma coluna de data com leads, inscritos ou matriculados, nem uma lista de leads com status. Confira o cabeçalho ou use o modelo de planilha da Captação.';
function cvTabelas(txt){ return String(txt||'').split(/^## Aba:.*$/m).map(b=>b.split('\n').filter(l=>l.trim())).filter(l=>l.length>1).map(ls=>{
  const sep=['\t',';',','].map(s=>[s,ls.slice(0,5).reduce((a,l)=>a+l.split(s).length,0)]).sort((a,b)=>b[1]-a[1])[0][0];
  const split=l=>{ if(sep!==',') return l.split(sep); const out=[]; let cur='',q=false; for(const ch of l){ if(ch==='"') q=!q; else if(ch===','&&!q){ out.push(cur); cur=''; } else cur+=ch; } out.push(cur); return out; };
  const rows=ls.map(l=>split(l).map(x=>x.replace(/^"|"$/g,'').trim())); const KW=/data|lead|inscri|aprova|matric|status|etapa|curso|origem|nivel|invest|verba|responsavel|consultor|atendente|equipe|canal|unidade/;
  let h=-1, best=0; rows.slice(0,10).forEach((r,j)=>{ const n=r.filter(x=>KW.test(cvNorm(x))).length; if(n>best){ best=n; h=j; } }); if(h<0) h=rows.findIndex(r=>r.filter(Boolean).length>=2);
  return {cab:(rows[h]||[]).map(cvNorm),rows:rows.slice(h+1)}; }); }
const CV_UN={graduacao:/^(?!.*\bpos\b)(?!.*pos[- ]?grad)(?!.*mba).*(gradua|bachar|tecnolog|licenciat|vestibular)/,pos:/\bpos\b|pos[- ]?grad|mba|especializ|lato/,mestrado:/mestrado|stricto|doutor/,colegio:/colegio|ensino (medio|fundamental)|infantil/};
const CV_FX=[[0,3,'No mesmo dia a 3 dias'],[4,7,'4 a 7 dias'],[8,14,'8 a 14 dias'],[15,30,'15 a 30 dias'],[31,60,'31 a 60 dias'],[61,1e9,'Mais de 60 dias']];
function cvLerTabela(T,un){
  const col=re=>T.cab.findIndex(h=>re.test(h));
  const codigo=h=>/(^|[\s(])(n[º°]|n\.|no\.|num\.?|numero|cod\.?|codigo|id|ra|cpf|protocolo)([\s).]|$)/.test(h);
  const semData=h=>!/^data|^dt\b|^dia\b/.test(h), colN=re=>T.cab.findIndex(h=>semData(h)&&!codigo(h)&&re.test(h));
  const cD=col(/^(data|dia|date|semana|periodo)\b/), cI=colN(/inscri|candidat/), cL=colN(/lead/), cA=colN(/aprova|classific/), cM=colN(/matricul|efetiv/), cV=colN(/invest|verba|gasto|custo|spend/);
  const cS=col(/status|etapa|fase|situac|estagio|stage/), cCurso=col(/^(curso|nome do curso|programa|oferta|curso de interesse)/);
  const cU=T.cab.findIndex(h=>/^(un|unidade|unidade de negocio|nivel|produto|tipo de curso|modalidade de ensino|segmento|nivel de ensino|area)$/.test(h));
  let nOutra=0;
  const doUn=rows=>{ if(cU<0||!CV_UN[un]){ if(cU<0&&un==='graduacao'&&cCurso>=0){ const ok=rows.filter(r=>!CV_UN.pos.test(cvNorm(r[cCurso]))&&!CV_UN.mestrado.test(cvNorm(r[cCurso]))); nOutra=rows.length-ok.length; return ok; } return rows; } return rows.filter(r=>CV_UN[un].test(cvNorm(r[cU]))); };
  /* linhas de total e subtotal nunca entram (somariam em dobro) */
  const TOT=/^(sub)?total|^soma\b|^consolidado|^geral$|^todos$|^todas$/;
  const total0=T.rows.length; T={cab:T.cab,rows:T.rows.filter(r=>!r.some((x,ci)=>ci<6&&TOT.test(cvNorm(x))))}; const nTot=total0-T.rows.length;
  const MD={}, dt=(r,ci)=>{ if(ci<0) return null; if(MD[ci]==null) MD[ci]=cvMdy(T.rows,ci); return cvData(r[ci],MD[ci]); };
  const avisos=()=>[nOutra?`${pl(nOutra,'linha de curso de pós ou mestrado ficou de fora','linhas de cursos de pós ou mestrado ficaram de fora')}`:'',nTot?`${pl(nTot,'linha de total ignorada','linhas de total ignoradas')}`:'',Object.values(MD).some(Boolean)?'datas lidas como mês/dia (padrão americano)':''].filter(Boolean).join(', ');
  const dI=col(/data.*(inscri|cadastr|criac|entrada)|(inscri|cadastr|criad|created).*data|^criado|^created/), dA=col(/data.*aprova|aprova.*data/), dM=col(/data.*matric|matric.*data/);
  const cC=col(/^(curso|nome do curso|programa|oferta|curso de interesse)/), cO=col(/^(origem|canal|fonte|midia|utm.?source|campanha|utm.?campaign)/);
  const cF=col(/^(forma de ingresso|ingresso|tipo de ingresso|modalidade de ingresso|processo seletivo)$/);
  const K=['l','i','a','m','v'], DIM=[['c',cC],['o',cO],['f',cF]].filter(x=>x[1]>=0); if(cO>=0&&cF>=0) DIM.push(['x',-1]); /* x = campanha × forma de ingresso, para o retorno por campanha */
  /* 1) total por data (e por curso e origem, se houver as colunas) */
  if(cD>=0&&cD!==dI&&(cI>=0||cM>=0||cL>=0)&&cS<0&&T.rows.filter(r=>/^\s*\d/.test(r[cI>=0?cI:cM>=0?cM:cL]||'')).length>=1){
    const absurdo=ci=>ci>=0&&T.rows.some(r=>(num(r[ci])||0)>5e6); [['cI',cI],['cL',cL],['cA',cA],['cM',cM]].forEach(([n,ci])=>{ if(absurdo(ci)) throw new Error('A coluna "'+T.cab[ci]+'" tem números grandes demais para ser uma contagem (parece código ou matrícula). Tire essa coluna ou renomeie.'); });
    const linhas=doUn(T.rows).map(r=>{ const o={d:dt(r,cD),l:cL>=0?num(r[cL]):null,i:cI>=0?num(r[cI]):null,a:cA>=0?num(r[cA]):null,m:cM>=0?num(r[cM]):null,v:cV>=0?num(r[cV]):null}; DIM.forEach(([k,ci])=>o['_'+k]=ci>=0?String(r[ci]||'').trim():''); if(cO>=0&&cF>=0) o._x=`${o._o||'(sem origem)'}||${o._f||'(sem ingresso)'}`; return o; }).filter(p=>p.d&&(p.i!=null||p.m!=null||p.l!=null));
    let nDup=0; if(!DIM.length){ const ult={}; linhas.forEach((r,j)=>{ if(ult[r.d]!=null) nDup++; ult[r.d]=j; }); if(nDup){ const keep=new Set(Object.values(ult)); for(let j=linhas.length-1;j>=0;j--) if(!keep.has(j)) linhas.splice(j,1); } }
    const porD={}; linhas.forEach(r=>{ const p=porD[r.d]=porD[r.d]||{d:r.d}; K.forEach(k=>{ if(r[k]!=null) p[k]=(p[k]||0)+r[k]; });
      DIM.forEach(([k])=>{ const nm=r['_'+k]||'(sem '+({c:'curso',o:'origem',f:'ingresso'}[k]||'dado')+')'; p[k]=p[k]||{}; const q=p[k][nm]=p[k][nm]||{}; K.forEach(kk=>{ if(r[kk]!=null) q[kk]=(q[kk]||0)+r[kk]; }); }); });
    const P=Object.values(porD).sort((a,b)=>a.d.localeCompare(b.d));
    /* diário ou acumulado: o cabeçalho decide; sem pista, só é diário se os valores sobem e descem com frequência (uma queda isolada é cancelamento) */
    const cabT=T.cab.join(' '), pistaD=/novos|no dia|diari|por dia|do dia|por semana|semanal|na semana/.test(cabT), pistaA=/acumul|total ate|ate a data|ate o dia/.test(cabT);
    const quedas=['l','i','a','m'].map(k=>{ let q=0,n=0; P.forEach((p,j)=>{ if(j&&p[k]!=null&&P[j-1][k]!=null){ n++; if(p[k]<P[j-1][k]) q++; } }); return n?q/n:0; });
    const nq=['l','i','a','m'].map(k=>P.filter((p,j)=>j&&p[k]!=null&&P[j-1][k]!=null&&p[k]<P[j-1][k]).length);
    const diario=pistaD||(!pistaA&&Math.max(...quedas)>=0.4&&Math.max(...nq)>=2);
    if(diario){ const acc={}, accD={c:{},o:{},f:{},x:{}}; P.forEach(p=>{ K.forEach(k=>{ if(p[k]!=null){ acc[k]=(acc[k]||0)+p[k]; p[k]=acc[k]; } });
      DIM.forEach(([dk])=>{ const AC=accD[dk]; Object.entries(p[dk]||{}).forEach(([nm,q])=>{ const a=AC[nm]=AC[nm]||{}; K.forEach(k=>{ if(q[k]!=null) a[k]=(a[k]||0)+q[k]; }); }); const n={}; Object.keys(AC).forEach(nm=>n[nm]={...AC[nm]}); if(Object.keys(n).length) p[dk]=n; }); }); }
    return P.length?{temUn:cU>=0,tipo:`${diario?'números do dia, somados':'acumulado por data'}${cC>=0?', com os cursos':''}${cO>=0?', com as origens':''}${cF>=0?', com a forma de ingresso':''}${avisos()?' · '+avisos():''}${nDup?` · ${pl(nDup,'data repetida: ficou a última linha','datas repetidas: ficou a última linha de cada')}`:''}`,P}:null; }
  /* 2) lista de leads ou de inscritos (um por linha) */
  const dC=col(/(^criad|^created|cadastr|entrada|data do lead|data de criac|data de captac)/), dIns=col(/data.*inscri|inscri.*data/);
  const dCt=col(/primeiro contato|data.*(contato|ligac|atendimento)|(contato|ligac|atendimento).*data/), dCm=col(/data.*(encaminh|agend|visita|entrevista|comercial)/);
  const cEq=T.cab.findIndex(h=>/^(equipe|time|setor|fila|celula)$/.test(h));
  const cRcc=T.cab.findIndex(h=>semData(h)&&/call ?center|atendente|operador|\bsdr\b|pre.?venda|teleatend/.test(h));
  const cRcm=T.cab.findIndex(h=>semData(h)&&/consultor|vendedor|closer|executivo|comercial/.test(h));
  const cR=T.cab.findIndex(h=>/^(responsavel|dono|owner|atribuido a|proprietario|usuario responsavel)/.test(h));
  if(cS<0&&dI<0&&dM<0&&dC<0) return null;
  let R=doUn(T.rows.filter(r=>r.some(Boolean))); if(!R.length) return null;
  /* só é lista de leads se o status fala de funil (não "Vigente" de uma tabela de cursos) ou se há datas de inscrição/matrícula */
  if(dC<0&&dI<0&&dM<0&&!R.some(r=>/lead|contat|inscri|aprova|matric|desist|perdid|novo|encaminh|negocia|atendiment/.test(cvNorm(r[cS])))) return null;
  const st=r=>cS>=0?cvNorm(r[cS]):'', neg=/nao\s|desist|cancel|reprov|ausent|elimin|perdid|indefer/;
  const ehM=r=>(dM>=0&&dt(r,dM))||(/^matriculad|^matricula (efetivad|confirmad|realizad|concluid)|^efetivad|^pago\b|^confirmad/.test(st(r))&&!neg.test(st(r))&&!/pre|aguard|convoc|analise|pendent|apto|andamento/.test(st(r)));
  const ehA=r=>ehM(r)||(dA>=0&&dt(r,dA))||(/\baprova|classific|convoca|aguardando matric|pre.?matric|apto|matricula em analise|matricula pendente/.test(st(r))&&!neg.test(st(r)));
  const ehI=r=>ehA(r)||(dIns>=0&&dt(r,dIns))||(/inscri|prova|vestibular|enem|aguardando resultado|reprov|ausent|nao matric/.test(st(r))&&!/nao inscri|sem inscri/.test(st(r)));
  const ehCm=r=>ehI(r)||(dCm>=0&&dt(r,dCm))||/negocia|proposta|visita|entrevista|agendad|oportunidad|encaminhad|comercial|interessad/.test(st(r));
  const ehCt=r=>ehCm(r)||(dCt>=0&&dt(r,dCt))||/contat|atendid|atendiment|retorno|ligac|whats|qualificad|em andamento|sem interesse|nao atende|desist|perdid/.test(st(r));
  const fase=r=>ehM(r)?6:ehA(r)?5:ehI(r)?4:ehCm(r)?3:ehCt(r)?2:1;
  const F=R.map(fase), listaLeads=F.some(f=>f<4)&&(cS>=0||dIns>=0);
  const semA=cA<0&&dA<0&&!R.some(r=>/\baprova|classific/.test(st(r)));
  const quebra=(ci,chave)=>{ const o={}; R.forEach((r,j)=>{ const nm=chave?chave(r):String(r[ci]||'').trim()||'(não informado)'; const q=o[nm]=o[nm]||{l:listaLeads?0:null,i:0,a:semA?null:0,m:0}; if(listaLeads) q.l++; if(!listaLeads||F[j]>=4) q.i++; if(!semA&&F[j]>=5) q.a++; if(F[j]>=6) q.m++; }); return o; };
  let P;
  const dCria=R.map(r=>dC>=0?dt(r,dC):dI>=0?dt(r,dI):null);
  const di=R.map((r,j)=>!listaLeads||F[j]>=4?((dIns>=0&&dt(r,dIns))||dCria[j]):null);
  const dm=R.map((r,j)=>F[j]>=6?((dM>=0&&dt(r,dM))||di[j]):null);
  if(dCria.some(Boolean)){ const dias=[...new Set(dCria.concat(di,dm).filter(Boolean))].sort();
    const da=R.map((r,j)=>F[j]>=5?((dA>=0&&dt(r,dA))||(dM>=0&&dt(r,dM))||di[j]):null);
    const cnt=(arr,d)=>arr.reduce((a,x)=>a+(x&&x<=d?1:0),0);
    P=dias.map(d=>({d,l:listaLeads?cnt(dCria,d):null,i:cnt(di,d),a:semA?null:cnt(da,d),m:cnt(dm,d)})); }
  else P=[{d:cvHojeISO(),l:listaLeads?R.length:null,i:listaLeads?F.filter(f=>f>=4).length:R.length,a:semA?null:F.filter(f=>f>=5).length,m:F.filter(f=>f>=6).length}];
  const ult=P[P.length-1]; DIM.forEach(([k,ci])=>{ if(ci>=0) ult[k]=quebra(ci); }); if(cO>=0&&cF>=0) ult.x=quebra(-1,r=>`${String(r[cO]||'').trim()||'(sem origem)'}||${String(r[cF]||'').trim()||'(sem ingresso)'}`);
  /* tempo da inscrição até a matrícula */
  if(dM>=0){ const ds=R.map((r,j)=>di[j]&&dm[j]&&dt(r,dM)?Math.round((cDt(dm[j])-cDt(di[j]))/864e5):null).filter(x=>x!=null&&x>=0).sort((a,b)=>a-b);
    if(ds.length) ult.t={b:CV_FX.map(([a,b])=>ds.filter(x=>x>=a&&x<=b).length),med:cvMed(ds),n:ds.length}; }
  /* call center e comercial */
  if(listaLeads&&(cRcc>=0||cRcm>=0||cR>=0||cEq>=0)){
    const hs=R.map(r=>{ if(dC<0||dCt<0) return null; const a=cvDT(r[dC]), b=cvDT(r[dCt]); return a&&b&&b>=a?(b-a)/36e5:null; });
    const novo=()=>({l:0,ct:0,cm:0,i:0,a:semA?null:0,m:0,h:[]}), soma=(o,j)=>{ o.l++; if(F[j]>=2)o.ct++; if(F[j]>=3)o.cm++; if(F[j]>=4)o.i++; if(!semA&&F[j]>=5)o.a++; if(F[j]>=6)o.m++; if(hs[j]!=null)o.h.push(hs[j]); };
    const eq={}, pes={}, add=(e,nm,j)=>{ soma(eq[e]=eq[e]||novo(),j); if(nm){ const k=nm+'|'+e; const q=pes[k]=pes[k]||Object.assign(novo(),{nome:nm,eq:e}); soma(q,j); } };
    R.forEach((r,j)=>{ const v=ci=>ci>=0?String(r[ci]||'').trim():'';
      if(cRcc>=0||cRcm>=0){ if(cRcc>=0) add('Call center',v(cRcc)||'(sem atendente)',j); if(cRcm>=0&&(v(cRcm)||F[j]>=3)) add('Comercial',v(cRcm)||'(sem consultor)',j); }
      else add(cEq>=0?(v(cEq)||'(sem equipe)'):'Atendimento',cR>=0?(v(cR)||'(sem responsável)'):'',j); });
    const fecha=o=>{ const h=o.h.sort((a,b)=>a-b); delete o.h; o.hmed=h.length?cvMed(h):null; return o; };
    const todosH=hs.filter(x=>x!=null).sort((a,b)=>a-b);
    ult.at={eq:Object.fromEntries(Object.entries(eq).map(([k,o])=>[k,fecha(o)])),pes:Object.values(pes).map(fecha),
      tot:{l:R.length,ct:F.filter(f=>f>=2).length,cm:F.filter(f=>f>=3).length,i:F.filter(f=>f>=4).length,a:semA?null:F.filter(f=>f>=5).length,m:F.filter(f=>f>=6).length},
      tc:todosH.length?{b:CV_HX.map(([a,b])=>todosH.filter(x=>x>=a&&x<b).length).concat([F.filter((f,j)=>f<2&&hs[j]==null).length]),med:cvMed(todosH),n:todosH.length}:null,
      cc:cRcc>=0||cRcm>=0}; }
  return {temUn:cU>=0,lista:true,tipo:`lista de ${cvN(R.length)} ${listaLeads?'leads':'inscritos'}${avisos()?' ('+avisos()+')':''}, ${dCria.some(Boolean)?'montada por data':'retrato de hoje'}${cC>=0?', com os cursos':''}${cO>=0?', com as origens':''}${ult.at?', com o atendimento':''}`,P}; }
const cvMed=a=>a.length?(a.length%2?a[(a.length-1)/2]:(a[a.length/2-1]+a[a.length/2])/2):null;
const CV_HX=[[0,1,'Até 1 hora'],[1,4,'1 a 4 horas'],[4,24,'4 a 24 horas'],[24,72,'1 a 3 dias'],[72,1e9,'Mais de 3 dias']];
function cvDT(v){ const s=String(v||'').trim(); let m;
  if((m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ](\d{1,2}):(\d{2}))?/))) return new Date(+m[1],m[2]-1,+m[3],+(m[4]||0),+(m[5]||0)).getTime();
  if((m=s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})(?:[ ,T]+(\d{1,2}):(\d{2}))?/))) return new Date(m[3].length===2?2000+ +m[3]:+m[3],m[2]-1,+m[1],+(m[4]||0),+(m[5]||0)).getTime();
  if(/^\d{5}(\.\d+)?$/.test(s)) return Math.round((+s-25569)*864e5)+new Date().getTimezoneOffset()*6e4; return null; }

/* várias abas: a curva (total por data) e, se houver, a lista de leads, que entra como detalhe (atendimento, tempo até o contato) */
function cvLerTodas(tabs,un){ const L=tabs.map(T=>cvLerTabela(T,un)).filter(Boolean); const agg=L.find(r=>!r.lista)||null, lista=L.filter(r=>r.lista).sort((a,b)=>b.P.length-a.P.length)[0]||null; return {agg,lista}; }
function cvLer(tabs,un){ const x=cvLerTodas(tabs,un); return x.agg||x.lista; }
function cvAplicar(c,r,file){ cvGravar(c,x=>{ const temAgg=cvSerie(x).some(p=>p.f!=='lista');
  /* lista de leads num ciclo que já tem a curva do CRM (totais por data): só acrescenta as quebras (curso, origem, atendimento, tempo) ao último dia; não troca os totais */
  if(r.lista&&temAgg){ const s=cvSerie(x), u=r.P[r.P.length-1]; let alvo=s.filter(p=>p.d<=u.d).slice(-1)[0]||s[s.length-1]; ['c','o','f','x','t','at'].forEach(k=>{ if(u[k]&&(k==='t'||k==='at'||!alvo[k])) alvo[k]=u[k]; }); x.serie=s; x.cvFonte=file.name; x.cvEm=new Date().toISOString(); r.soQuebras=alvo.d; return; }
  const s=cvSerie(x).filter(p=>!r.P.some(q=>q.d===p.d)); r.P.forEach(q=>{ const old=cvSerie(x).find(p=>p.d===q.d)||{}; const np={d:q.d,f:r.lista?'lista':'agg'}; ['l','i','a','m','v'].forEach(k=>np[k]=q[k]!=null?q[k]:(old[k]??null)); ['c','o','f','x','t','at'].forEach(k=>{ if(q[k]) np[k]=q[k]; else if(old[k]) np[k]=old[k]; }); s.push(np); }); x.serie=s; x.cvFonte=file.name; x.cvEm=new Date().toISOString(); }); }
async function cvLerArq(file){ if(/\.xlsx?$/i.test(file.name)) return xlsxTexto(await file.arrayBuffer(),true); return lerArquivo(file); }
async function cvImportar(id,file){
  const c=ciclosTodos().find(x=>x.id===id); if(!c) return;
  try{ const X=cvLerTodas(cvTabelas(await cvLerArq(file)),c.un), r=X.agg||X.lista; if(!r){ toast(CV_FALHA); return; }
    cvAplicar(c,r,file); if(X.agg&&X.lista){ cvAplicar(c,X.lista,file); toast(`${pl(r.P.length,'registro','registros')} na curva de ${c.nome||'ciclo'} (${r.tipo}), mais o detalhe da lista de leads (${X.lista.tipo})`); return; } toast(r.soQuebras?`A curva deste ciclo já vem do CRM: a lista (${r.tipo}) entrou só como detalhe de cursos, origens e atendimento em ${cvDia(r.soQuebras)}.`:`${pl(r.P.length,'registro','registros')} na curva de ${c.nome||'ciclo'} (${r.tipo})`);
  }catch(e){ console.error(e); toast('Não foi possível ler a planilha: '+(e.message||e)); } }
/* uma planilha com todas as áreas: cada UN vai para o ciclo escolhido dela */
async function cvImportarTudo(file){
  try{ const tabs=cvTabelas(await cvLerArq(file)); const feitos=[]; let semUn=false;
    UNS.forEach(u=>{ const c=cvEscolhido(u.id); if(!c) return; const X=cvLerTodas(tabs,u.id), r=X.agg||X.lista; if(!r) return; if(!r.temUn){ semUn=true; return; } cvAplicar(c,r,file); if(X.agg&&X.lista&&X.lista.temUn) cvAplicar(c,X.lista,file); feitos.push(`${u.nome} (${r.P.length}${X.agg&&X.lista&&X.lista.temUn?' + lista de leads':''})`); });
    if(feitos.length) toast(`Curvas atualizadas: ${feitos.join(', ')}`);
    else toast(semUn?'A planilha não tem uma coluna de UN ou nível. Importe dentro da aba da área.':CV_FALHA);
  }catch(e){ console.error(e); toast('Não foi possível ler a planilha: '+(e.message||e)); } }

document.addEventListener('change',e=>{ const t=e.target; if(!t||!t.dataset) return;
  if(t.dataset.cvPer){ const c0=UNS.map(u=>cvEscolhido(u.id)).find(c=>c&&cvSerie(c).length); const P=c0?cvPer(c0):{}; ui.cvDe=t.dataset.cvPer==='de'?t.value:P.de; ui.cvAte=t.dataset.cvPer==='ate'?t.value:P.ate; ui.cvPer='livre'; render(); return; }
  if(t.dataset.cvImp&&t.files&&t.files[0]){ (t.dataset.cvImp==='todas'?cvImportarTudo(t.files[0]):cvImportar(t.dataset.cvImp,t.files[0])); t.value=''; return; }
  if(t.dataset.cvplano){ const P=cvPlano(t.dataset.cvplano); P[t.dataset.m]=t.value===''?null:num(t.value); cvPlanoSalvar(t.dataset.cvplano,P); setTimeout(render,0); return; }
  if(t.dataset.cvpeso){ ui.cvPeso=num(t.value); return; }
  if(t.dataset.cvprova){ const L=ciclosTodos(), x=L.find(y=>y.id===t.dataset.cvprova); if(x&&Array.isArray(x.provas)&&x.provas[+t.dataset.j]){ x.provas[+t.dataset.j][t.dataset.f]=t.value; ciclosSalvar(L); setTimeout(render,0); } return; }
  if(t.dataset.cvp&&t.dataset.f==='d'&&!t.value){ toast('A data não pode ficar vazia. Para tirar o registro, use o × no fim da linha.'); setTimeout(render,0); return; }
  if(t.dataset.cvp){ const j=+t.dataset.j, f=t.dataset.f; cvGravar({id:t.dataset.cvp},x=>{ const s=cvSerie(x); const p=s[j]; if(!p) return; p[f]=f==='d'?t.value:(t.value===''?null:num(t.value)); x.serie=s.filter(q=>q.d); }); } });

if(typeof cicloClick==='function'){ const _cc=cicloClick; cicloClick=function(act,d){
  if(act==='ciclo-cv-ver'){ const c=ciclosTodos().find(x=>x.id===d.id); if(c){ ui.cvCiclo=ui.cvCiclo||{}; ui.cvCiclo[c.un]=c.id; render(); } return true; }
  if(act==='ciclo-cv-modo'){ ui.cvModo=d.v; render(); return true; }
  if(act==='ciclo-cv-prova-add'){ const L=ciclosTodos(), x=L.find(y=>y.id===d.id); if(x){ x.provas=Array.isArray(x.provas)?x.provas:[]; x.provas.push({id:uid(),d:'',nome:`${x.provas.length+1}º vestibular`}); ciclosSalvar(L); render(); } return true; }
  if(act==='ciclo-cv-prova-del'){ const L=ciclosTodos(), x=L.find(y=>y.id===d.id); if(x&&Array.isArray(x.provas)){ x.provas.splice(+d.j,1); ciclosSalvar(L); render(); } return true; }
  if(act==='ciclo-cv-ano'){ ui.cvAno=d.v; render(); return true; }
  if(act==='ciclo-cv-distr'){ const un=d.v, ano=d.ano, anual=num(cur.campos[`${un}.orcamento`]); if(!anual) return true; const cap=cvMesesCapt(un,ano), w=CV_MESES.map((_,m)=>d.peso&&cap.has(m)?1+(num(ui.cvPeso)??50)/100:1), sw=w.reduce((a,b)=>a+b,0);
    const P=cvPlano(un); CV_MESES.forEach((_,m)=>P[`${ano}-${String(m+1).padStart(2,'0')}`]=Math.round(anual*w[m]/sw)); cvPlanoSalvar(un,P); render(); toast(`Orçamento de ${ano} distribuído${d.peso&&cap.size?` com ${num(ui.cvPeso)??50}% a mais em ${pl(cap.size,'mês de captação','meses de captação')}`:' igual nos 12 meses'}`); return true; }
  if(act==='ciclo-cv-sub'){ ui.cvSub=d.v; render(); return true; }
  if(act==='ciclo-cv-per'){ ui.cvPer=d.v; render(); return true; }
  if(act==='ciclo-cv-sel'){ ui.cvSel=ui.cvSel||{}; ui.cvSel[d.id]=d.v; render(); return true; }
  if(act==='ciclo-cv-todos'){ ui.cvTodos=ui.cvTodos===d.id?null:d.id; render(); return true; }
  if(act==='ciclo-cv-add'){ cvGravar({id:d.id},x=>{ const s=cvSerie(x), h=cvHojeISO(); if(s.some(p=>p.d===h)){ toast('Hoje já tem registro. Ajuste os números na tabela.'); return; } const u=s[s.length-1]||{}; s.push({d:h,l:u.l??null,i:u.i??null,a:u.a??null,m:u.m??null,v:u.v??null}); x.serie=s; }); return true; }
  if(act==='ciclo-cv-del'){ cvGravar({id:d.id},x=>{ const s=cvSerie(x); s.splice(+d.j,1); x.serie=s; }); return true; }
  return _cc(act,d); }; }

/* ---------- Área Captação (módulo à parte do diagnóstico) ---------- */
const temCaptacao=()=>typeof temMod==='function'&&temMod('captacao');
const _cvCal=typeof ciclosUnHtml==='function'?ciclosUnHtml:null;
/* na Base do diagnóstico fica só o calendário; a curva mora na área Captação */
if(_cvCal){ ciclosUnHtml=function(un){ return _cvCal(un)+(temCaptacao()?`<p class="cv-link"><span>Inscritos, aprovados, matriculados, CAC e CPL de cada ciclo ficam na área Captação.</span><button class="btn sm" data-act="ciclo-cv-ir" data-v="${un}">Abrir a Captação</button></p>`:curvaHtml(un)); }; }

function cvArea(u){ const c=cvEscolhido(u.id), d=buDados(u.id); const A=c?cvAnalise(c):null;
  const meta=A?A.meta:d.meta, m=A&&A.m!=null?A.m:null, proj=A&&A.proj!=null?A.proj:null, base=proj!=null?proj:m;
  const st=meta&&base!=null&&A&&A.last&&(A.proj!=null||(c.camp_fim&&A.last.d>=c.camp_fim))?(base>=meta*0.95?['ok','No caminho da meta']:base>=meta*0.8?['at','Atenção']:['mal','Longe da meta']):null;
  return {u,c,d,A,meta,m,proj,st,orc:d.verba}; }
const cvAreas=()=>UNS.map(cvArea).filter(x=>x.c||x.meta);

function captacaoGeralHtml(){
  const T=cvAreas(), L=T.filter(x=>x.c), sem=T.filter(x=>!x.c);
  if(!L.length){ const E=cvEditais(null).filter(x=>x.ci); return `<p class="empty">Nenhuma área com ciclo de captação ainda.${E.length?' Estes editais lidos na Base já podem virar ciclo:':' Abra a aba de uma área, crie o ciclo (por exemplo, Vestibular 2027.1) e importe os números do CRM.'}</p>${E.length?`<div class="cv-eds">${E.map(({f,e,ci})=>`<div class="cv-ed"><span><b>${esc(f.titulo||'Edital')}</b><small>${esc(edUnNome(e.un))} · ${esc(ci.nome)}: inscrições de ${edFmt(ci.ini)} a ${edFmt(ci.fim)}</small></span><button class="btn sm primary" data-act="ciclo-cv-edital" data-id="${f.id}">Criar o ciclo</button></div>`).join('')}</div>`:''}`; }
  const bar=x=>{ if(!x.meta) return ''; const top=Math.max(x.meta,x.proj||0,x.m||0)*1.08, w=v=>(Math.min(v,top)/top*100).toFixed(1);
    return `<div class="cv-meta" aria-hidden="true"><i class="ok" style="width:${w(x.m||0)}%"></i>${x.proj!=null?`<i class="pj" style="left:${w(x.proj)}%"></i>`:''}<i class="alvo" style="left:${w(x.meta)}%"></i></div>`; };
  const cards=L.map(x=>{ const A=x.A||{}; return `<article class="cv-card">
    <header><b>${esc(x.u.nome)}</b>${x.st?`<span class="cv-st ${x.st[0]}"><i aria-hidden="true">${x.st[0]==='ok'?'✓':'!'}</i>${x.st[1]}</span>`:''}</header>
    <small class="muted">${x.c?`${esc(x.c.nome||'Ciclo')} · ${cicloSituacao(x.c).t}`:'sem ciclo de captação'}</small>
    <div class="cv-big"><b>${cvN(x.m)}</b><span>matriculados${x.meta?` de ${cvN(x.meta)} da meta · ${cvP(x.m!=null?x.m/x.meta:null)}`:''}</span></div>
    ${bar(x)}
    ${x.c&&cvSerie(x.c).length?(()=>{ const P=cvPer(x.c), C=cvComp(x.c,P), J=k=>cvJan(x.c,k,P.de,P.ate), JC=k=>C?cvJan(C.c,k,C.de,C.ate):null; return `<p class="cv-cp"><b>No período</b> (${cvDia(P.de)} a ${cvDia(P.ate)}): ${cvN(J('i'))} inscritos${C&&JC('i')!=null?` ${cvDelta(J('i'),JC('i'),'').replace(/ vs .*$/,'')}`:''} · ${cvN(J('m'))} matriculados${C&&JC('m')!=null?` ${cvDelta(J('m'),JC('m'),'').replace(/ vs .*$/,'')}`:''}</p>`; })():''}
    <dl>${[['Projeção',x.proj!=null?`${cvN(x.proj)}${x.meta?` (${cvP(x.proj/x.meta)})`:''}`:'—'],['Leads',cvN(A.l)],['Inscritos',cvN(A.i)],['Aprovados',cvN(A.a)],['Investido',A.inv?brl(A.inv):'—'],['Verba planejada do ciclo',x.c&&num(x.c.verba)?brl(num(x.c.verba)):'—'],['CPL',A.cpl!=null?brl(A.cpl):'—'],['CAC',A.cac!=null?brl(A.cac):'—']].map(([k,v])=>`<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
    <button class="btn sm" data-act="ciclo-cv-tab" data-v="${x.u.id}">Abrir ${esc(x.u.nome)}</button></article>`; }).join('');
  const comInv=L.filter(x=>x.A&&x.A.inv), mxI=Math.max(1,...comInv.map(x=>x.A.inv));
  const tot=k=>comInv.reduce((a,x)=>a+((x.A&&x.A[k])||0),0), invT=tot('inv'), mT=tot('m'), lT=tot('l'), iT=tot('i');
  return `<div class="cv-cards">${cards}</div>${sem.length?`<p class="muted cv-nota">Sem ciclo de captação: ${sem.map(x=>`<button class="lnk" data-act="ciclo-cv-tab" data-v="${x.u.id}">${esc(x.u.nome)}</button>`).join(', ')}. Abra a área e crie o ciclo.</p>`:''}
   <p class="muted cv-nota">Meta: a meta oficial da coordenação de cada área, ou a soma das metas por turno. A projeção segue o ritmo do ciclo anterior no mesmo ponto ou, sem ele, o dos últimos 14 dias. Investido é o que o CRM ou a mídia informam até a data (coluna Investimento); a verba planejada é a do Calendário de captação.</p>
   ${comInv.length?`<section class="block"><div class="block-h"><h3>Verba investida e CAC por área</h3><p>${brl(invT)} investidos${mT?` · CAC geral ${brl(invT/mT)}`:''}${lT?` · CPL geral ${brl(invT/lT)}`:''}${iT?` · ${brl(invT/iT)} por inscrito`:''}</p></div>
    <div class="chart">${comInv.sort((a,b)=>b.A.inv-a.A.inv).map(x=>`<div class="crow"><span class="nm">${esc(x.u.nome)}</span><div class="track"><span style="width:${(x.A.inv/mxI*100).toFixed(1)}%;min-width:4px;background:var(--cv-m)"></span></div><span class="num" style="font-size:12px">${brl(x.A.inv)}${x.A.cac!=null?` · CAC ${brl(x.A.cac)}`:''}${x.A.cpl!=null?` · CPL ${brl(x.A.cpl)}`:''}</span></div>`).join('')}</div></section>`:''}
   <section class="block"><div class="block-h"><h3>Comparativo das áreas</h3><p>O ciclo escolhido em cada área.</p></div>
    <div class="tblw"><table class="tbl"><thead><tr><th>Área</th><th>Ciclo</th><th class="r">Meta</th><th class="r">Matriculados</th><th class="r">Da meta</th><th class="r">Projeção</th><th class="r">Leads</th><th class="r">Inscritos</th><th class="r">Aprovados</th><th class="r">Aprovado → matrícula</th><th class="r">Verba planejada</th><th class="r">Investido</th><th class="r">CPL</th><th class="r">Por inscrito</th><th class="r">CAC</th></tr></thead><tbody>
    ${L.map(x=>{ const A=x.A||{}; return `<tr><td><b>${esc(x.u.nome)}</b></td><td>${x.c?esc(x.c.nome||'Ciclo'):'—'}</td><td class="num">${cvN(x.meta)}</td><td class="num">${cvN(x.m)}</td><td class="num">${x.meta&&x.m!=null?cvP(x.m/x.meta):'—'}</td><td class="num">${cvN(x.proj)}</td><td class="num">${cvN(A.l)}</td><td class="num">${cvN(A.i)}</td><td class="num">${cvN(A.a)}</td><td class="num">${cvP(A.am)}</td><td class="num">${x.c&&num(x.c.verba)?brl(num(x.c.verba)):'—'}</td><td class="num">${A.inv?brl(A.inv):'—'}</td><td class="num">${A.cpl!=null?brl(A.cpl):'—'}</td><td class="num">${A.cpi!=null?brl(A.cpi):'—'}</td><td class="num">${A.cac!=null?brl(A.cac):'—'}</td></tr>`; }).join('')}
    </tbody></table></div></section>`; }

function renderCaptacao(){
  const tabs=[['geral','Visão geral'],...UNS.map(u=>[u.id,u.nome])], t=tabs.some(x=>x[0]===ui.cvTab)?ui.cvTab:'geral';
  const nCic=un=>ciclosTodos().filter(c=>c.un===un).length;
  if(t!=='geral') ui.baseUn=t; // o calendário de ciclos usa a UN aberta
  $('#main').innerHTML=`<section class="panel cv-area">
   <header class="ph" style="grid-template-columns:minmax(0,1fr) auto"><div><span class="eyebrow"><b>Captação</b></span><h2 style="margin-top:8px">Como a captação está indo</h2><p class="lead">Leads, inscritos, aprovados e matriculados de cada área, contra a meta e o ciclo anterior, com a verba investida, o CPL e o CAC. Os números vêm do CRM, por dia ou por semana.</p></div>
    <div class="cv-topo"><label class="btn primary cv-up">Importar do CRM<input type="file" data-cv-imp="todas" accept=".csv,.tsv,.txt,.xlsx,.xls" hidden></label><button class="btn" data-act="ciclo-cv-exp">Exportar planilha</button></div></header>
   <nav class="subtabs bu-tabs" aria-label="Áreas">${tabs.map(([id,nm])=>`<button class="${t===id?'on':''}" data-act="ciclo-cv-tab" data-v="${id}" ${t===id?'aria-current="page"':''}>${esc(nm)}${id!=='geral'&&nCic(id)?` <span class="bu-n">${nCic(id)}</span>`:''}</button>`).join('')}</nav>
   ${cvPerHtml()}
   ${t==='geral'?`<p class="muted cv-nota">Para importar todas as áreas de uma vez, a planilha precisa de uma coluna de UN ou nível (Graduação, Pós…). Sem ela, importe dentro da aba de cada área.</p>${captacaoGeralHtml()}`:curvaHtml(t)+(_cvCal?_cvCal(t):'')}
  </section>`; }

function cvExportar(){
  const L=[['UN','Ciclo','Data','Leads','Inscritos','Aprovados','Matriculados','Investido até a data']];
  ciclosTodos().forEach(c=>cvSerie(c).forEach(p=>L.push([(UNS.find(u=>u.id===c.un)||{}).nome||'',c.nome||'',p.d.split('-').reverse().join('/'),p.l,p.i,p.a,p.m,p.v].map(v=>v==null?'':String(v)))));
  if(L.length<2){ toast('Ainda não há registros de captação para exportar'); return; }
  const csv='﻿'+L.map(r=>r.map(v=>/[;"\n]/.test(v)?`"${v.replace(/"/g,'""')}"`:v).join(';')).join('\n');
  const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})); a.download=`captacao-${(cur.nome||'cliente').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-')}-${cvHojeISO()}.csv`; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },500);
  toast(`${pl(L.length-1,'registro exportado','registros exportados')}`); }

if(typeof cicloClick==='function'){ const _cc2=cicloClick; cicloClick=function(act,d){
  if(act==='ciclo-cv-tab'){ ui.cvTab=d.v; ui.view='captacao'; render(); window.scrollTo({top:0}); return true; }
  if(act==='ciclo-cv-ir'){ ui.cvTab=d.v; ui.view='captacao'; render(); window.scrollTo({top:0}); return true; }
  if(act==='ciclo-cv-exp'){ cvExportar(); return true; }
  if(act==='ciclo-cv-edital'){ const f=(cur.fontes||[]).find(x=>x.id===d.id); const e=f&&editalDe(f), ci=e&&edCiclo(e); if(!ci) return true;
    const nid=uid(), L=ciclosTodos(); L.push({id:nid,un:e.un,nome:ci.nome,camp_ini:'',insc_ini:ci.ini,mat_ini:'',camp_fim:ci.fim,aulas:ci.aulas||''}); ciclosSalvar(L);
    ui.cvCiclo=ui.cvCiclo||{}; ui.cvCiclo[e.un]=nid; if(ui.view==='captacao') ui.cvTab=e.un;
    const cp=typeof edCap==='function'?edCap(e):null; let n=0; if(cp){ cp.linhas.forEach(l=>{ if(l.atual==null){ cur.campos[`base.cap.${l.k}.vagas`]=String(l.v); n++; } }); if(cp.ref) cur.campos[`${e.un}.ciclo_ref`]=cp.ref; touch(false); }
    render(); toast(`Ciclo "${ci.nome}" criado${n?` e ${pl(n,'linha de vagas preenchida','linhas de vagas preenchidas')} na capacidade`:''}`); return true; }
  return _cc2(act,d); }; }

/* aviso no menu: áreas longe da meta */
function cvAlertas(){ return cvAreas().filter(x=>x.st&&x.st[0]==='mal').length; }
