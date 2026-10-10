/* =====================================================================
   Tarefas e Projetos da equipe LORSO (fora do contexto do cliente)
   Abas Tarefas e Projetos · visões Lista, Quadro, Tabela, Por área, Métricas
   Carregado antes de app.js: só define estado e funções.
   ===================================================================== */
let internas=[], projetos=[], itCh=null, itT={}, pjT={};
const PRIO=['Alta','Média','Baixa'];
const EQ_ST=[['A fazer','Backlog'],['Em andamento','Em andamento'],['Em revisão','Em revisão'],['Concluída','Realizado']];
const eqStNome=s=>(EQ_ST.find(x=>x[0]===s)||EQ_ST[0])[1];
const EQ_AREAS=[['Comercial','var(--s1)'],['Marketing','var(--s2)'],['Consultoria','var(--s3)'],['Tecnologia','var(--s6)'],['CS','var(--s5)'],['Administrativo','var(--faint)']];
const eqCor=a=>(EQ_AREAS.find(x=>x[0]===a)||['','var(--faint)'])[1];
const PJ_ST=['Planejado','Em andamento','Pausado','Concluído'];
const itFrom=r=>({id:r.id,titulo:r.titulo||'',descricao:r.descricao||'',responsaveis:Array.isArray(r.responsaveis)&&r.responsaveis.length?r.responsaveis:(r.responsavel?[r.responsavel]:[]),diagnostico_id:r.diagnostico_id||'',area:r.area||'',area_eq:r.area_eq||'',projeto_id:r.projeto_id||'',prazo:r.prazo||'',inicio:r.inicio||'',prioridade:r.prioridade||'Média',status:r.status||'A fazer',origem:r.origem||'',subtarefas:Array.isArray(r.subtarefas)?r.subtarefas:[],comentarios:Array.isArray(r.comentarios)?r.comentarios:[],created_at:r.created_at,concluida_em:r.concluida_em||null});
const itTo=t=>({id:t.id,titulo:nz(t.titulo),descricao:nz(t.descricao),responsavel:t.responsaveis[0]||null,responsaveis:t.responsaveis,diagnostico_id:nz(t.diagnostico_id),area:nz(t.area),area_eq:nz(t.area_eq),projeto_id:nz(t.projeto_id),prazo:nz(t.prazo),inicio:nz(t.inicio),prioridade:t.prioridade||'Média',status:t.status||'A fazer',origem:nz(t.origem),subtarefas:t.subtarefas,comentarios:t.comentarios,concluida_em:t.concluida_em,updated_at:new Date().toISOString()});
const pjFrom=r=>({id:r.id,nome:r.nome||'',descricao:r.descricao||'',area:r.area||'',diagnostico_id:r.diagnostico_id||'',responsavel:r.responsavel||'',inicio:r.inicio||'',fim:r.fim||'',status:r.status||'Em andamento',created_at:r.created_at});
const pjTo=p=>({id:p.id,nome:p.nome||'Projeto sem nome',descricao:nz(p.descricao),area:nz(p.area),diagnostico_id:nz(p.diagnostico_id),responsavel:nz(p.responsavel),inicio:nz(p.inicio),fim:nz(p.fim),status:p.status||'Em andamento'});
const podeInternas=()=>me&&me.papel!=='cliente';
async function loadInternas(){
  if(!podeInternas()){ internas=[]; projetos=[]; return; }
  const [r,q]=await Promise.all([sb.from('tarefas_internas').select('*').order('created_at'),sb.from('projetos').select('*').order('created_at')]);
  if(r.error){ console.warn('tarefas_internas',r.error.message); internas=[]; } else internas=(r.data||[]).map(itFrom);
  projetos=q&&!q.error?(q.data||[]).map(pjFrom):[];
  if(!itCh){ itCh=sb.channel('internas'); const re=()=>{ clearTimeout(itT._r); itT._r=setTimeout(async()=>{ if(isTyping())return; const [a,b]=await Promise.all([sb.from('tarefas_internas').select('*').order('created_at'),sb.from('projetos').select('*').order('created_at')]); if(!a.error)internas=(a.data||[]).map(itFrom); if(b&&!b.error)projetos=(b.data||[]).map(pjFrom); render(); },600); };
    itCh.on('postgres_changes',{event:'*',schema:'public',table:'tarefas_internas'},re).on('postgres_changes',{event:'*',schema:'public',table:'projetos'},re); itCh.subscribe(); }
}
function itSave(t,now){ clearTimeout(itT[t.id]); const go=async()=>{ const r=await sb.from('tarefas_internas').upsert(itTo(t)); if(r.error) toast('Não foi possível salvar a tarefa: '+r.error.message); }; if(now) go(); else itT[t.id]=setTimeout(go,600); }
async function itDel(id){ internas=internas.filter(t=>t.id!==id); const r=await sb.from('tarefas_internas').delete().eq('id',id); if(r.error) toast('Não foi possível excluir a tarefa'); }
function itNew(o){ const x={...o}; if(x.responsavel!==undefined){ x.responsaveis=x.responsavel?[x.responsavel]:[]; delete x.responsavel; }
  const t={id:uid(),titulo:'',descricao:'',responsaveis:[],diagnostico_id:'',area:'',area_eq:'',projeto_id:'',prazo:'',inicio:'',prioridade:'Média',status:'A fazer',origem:'',subtarefas:[],comentarios:[],concluida_em:null,created_at:new Date().toISOString(),...x};
  if(!t.area_eq&&t.diagnostico_id) t.area_eq='Consultoria'; if(t.status==='Concluída'&&!t.concluida_em) t.concluida_em=new Date().toISOString(); internas.push(t); itSave(t,true); return t; }
function pjSave(p,now){ clearTimeout(pjT[p.id]); const go=async()=>{ const r=await sb.from('projetos').upsert(pjTo(p)); if(r.error) toast('Não foi possível salvar o projeto: '+r.error.message); }; if(now) go(); else pjT[p.id]=setTimeout(go,600); }
const itLate=t=>t.prazo&&t.status!=='Concluída'&&t.prazo<today();
const pessoa=id=>profiles.find(p=>p.id===id);
const diagNome=id=>id?(cur&&cur.id===id?cur.nome:(all[id]||{}).nome||'Cliente'):'';
const pjNome=id=>{ const p=projetos.find(x=>x.id===id); return p?p.nome:''; };
const itDono=(t,id)=>t.responsaveis.includes(id);
function minhasAbertas(){ return me?internas.filter(t=>itDono(t,me.id)&&t.status!=='Concluída').length:0; }
function itStatus(t,s){ if(t.status===s)return; t.status=s; t.concluida_em=s==='Concluída'?new Date().toISOString():null; itSave(t,true); }

/* ---------- filtros e agrupamentos ---------- */
function eqUi(){ return ui.eq||(ui.eq={aba:'tarefas',visao:'lista',grupo:'prazo',escopo:'time',pessoa:'',area:'',projeto:'',prazo:'',busca:'',ordem:'prazo',dir:1,aberta:null,pj:null}); }
function eqFiltradas(){ const f=eqUi(), hoje=today(), sem=new Date(); sem.setDate(sem.getDate()+7); const s7=isoLocal(sem);
  return internas.filter(t=>(f.escopo!=='minhas'||itDono(t,me.id))&&(!f.pessoa||(f.pessoa==='-'?!t.responsaveis.length:itDono(t,f.pessoa)))&&(!f.area||t.area_eq===f.area)
    &&(!f.projeto||(f.projeto==='-'?!t.projeto_id&&!t.diagnostico_id:f.projeto.startsWith('c:')?t.diagnostico_id===f.projeto.slice(2):t.projeto_id===f.projeto))
    &&(!f.prazo||(f.prazo==='atrasadas'?itLate(t):f.prazo==='semana'?(t.prazo&&t.prazo>=hoje&&t.prazo<=s7):f.prazo==='sem'?!t.prazo:true))
    &&(!f.busca||(t.titulo+' '+t.descricao).toLowerCase().includes(f.busca.toLowerCase()))); }
function eqGrupos(L){ const g=eqUi().grupo, hoje=today(), d7=new Date(); d7.setDate(d7.getDate()+7); const s7=isoLocal(d7);
  const ab=L.filter(t=>t.status!=='Concluída'), feitas=L.filter(t=>t.status==='Concluída');
  if(g==='prazo') return [['Atrasadas',ab.filter(itLate),'bad'],['Próximos 7 dias',ab.filter(t=>t.prazo&&t.prazo>=hoje&&t.prazo<=s7)],['Depois',ab.filter(t=>t.prazo&&t.prazo>s7)],['Sem data final',ab.filter(t=>!t.prazo)],['Realizadas',feitas,'ok']];
  if(g==='etapa') return EQ_ST.map(([s,n])=>[n,L.filter(t=>t.status===s)]);
  if(g==='area') return [...EQ_AREAS.map(([a])=>[a,ab.filter(t=>t.area_eq===a)]),['Sem área',ab.filter(t=>!t.area_eq)]];
  if(g==='projeto'){ const ks=[...new Set(ab.map(t=>t.projeto_id?'p:'+t.projeto_id:t.diagnostico_id?'c:'+t.diagnostico_id:'-'))]; return ks.map(k=>[k==='-'?'Avulsas':k.startsWith('p:')?pjNome(k.slice(2)):diagNome(k.slice(2)),ab.filter(t=>(t.projeto_id?'p:'+t.projeto_id:t.diagnostico_id?'c:'+t.diagnostico_id:'-')===k)]); }
  if(g==='pessoa') return [...profiles.filter(p=>p.ativo&&p.papel!=='cliente').map(p=>[p.nome||p.email,ab.filter(t=>itDono(t,p.id))]),['Sem responsável',ab.filter(t=>!t.responsaveis.length)]];
  return [['Tarefas',L]]; }

/* ---------- peças ---------- */
const eqAvs=ids=>`<span class="avs">${ids.slice(0,4).map(id=>{ const p=pessoa(id); return p?`<span class="av" title="${esc(p.nome||p.email)}">${esc(initials(p.nome||p.email))}</span>`:''; }).join('')}${ids.length>4?`<span class="av mais">+${ids.length-4}</span>`:''}</span>`;
const eqArea=a=>a?`<span class="tag dotc"><i style="background:${eqCor(a)}"></i>${esc(a)}</span>`:'';
function eqProj(t){ const n=t.projeto_id?pjNome(t.projeto_id):t.diagnostico_id?diagNome(t.diagnostico_id):''; return n?`<span class="tag proj"><i></i>${esc(n.length>28?n.slice(0,27)+'…':n)}</span>`:'<span class="tag">Avulsa</span>'; }
const eqStPill=t=>`<span class="stp st-${EQ_ST.findIndex(x=>x[0]===t.status)}">${eqStNome(t.status)}</span>`;
const eqData=d=>d?d.slice(8,10)+'/'+d.slice(5,7):'';
function eqPeriodo(t){ if(!t.prazo&&!t.inicio)return '<span class="muted">—</span>'; const l=itLate(t); return `<span class="per ${l?'late':''}">${t.inicio?eqData(t.inicio)+' → ':''}${eqData(t.prazo)||'?'}</span>`; }
function eqMeta(t){ const st=t.subtarefas.length, ok=t.subtarefas.filter(x=>x.ok).length; return `${st?`<span class="mi" title="Subtarefas">${ico('lista',13)}${ok}/${st}</span>`:''}${t.comentarios.length?`<span class="mi" title="Comentários">${ico('chat',13)}${t.comentarios.length}</span>`:''}`; }
function eqLinha(t){ return `<div class="eqrow ${t.status==='Concluída'?'done':''}"><input type="checkbox" data-eqchk="${t.id}" ${t.status==='Concluída'?'checked':''} aria-label="Concluir ${esc(t.titulo)}">
   <button class="eqt" data-act="eq-abrir" data-v="${t.id}">${esc(t.titulo||'Sem título')}${itLate(t)?` ${ico('alerta',13)}`:''}</button><span class="eqm">${eqMeta(t)}</span>
   <span class="eqtags">${eqArea(t.area_eq)}${eqProj(t)}${eqStPill(t)}</span>${eqAvs(t.responsaveis)}${eqPeriodo(t)}</div>`; }
function eqCard(t){ const pc=t.prioridade==='Alta'?'alta':t.prioridade==='Baixa'?'baixa':'media'; const st=t.subtarefas.length, ok=t.subtarefas.filter(x=>x.ok).length;
  return `<div class="eqcard ${itLate(t)?'late':''}" draggable="true" data-it="${t.id}"><button class="eqt" data-act="eq-abrir" data-v="${t.id}">${esc(t.titulo||'Sem título')}</button>${itLate(t)?`<span class="warn">${ico('alerta',15)}</span>`:''}
   <div class="ktags">${eqArea(t.area_eq)}<span class="tag ${pc}">${esc(t.prioridade)}</span>${t.projeto_id||t.diagnostico_id?eqProj(t):''}</div>
   ${t.prazo?`<div class="cd ${itLate(t)?'late':''}">${ico('relogio',13)}${t.inicio?eqData(t.inicio)+' → ':''}${t.prazo.split('-').reverse().join('/')}</div>`:''}
   ${st?`<div class="cbar"><span style="width:${Math.round(ok/st*100)}%"></span></div><div class="cd">${ok}/${st} subtarefas${t.comentarios.length?' · '+pl(t.comentarios.length,'comentário','comentários'):''}</div>`:t.comentarios.length?`<div class="cd">${pl(t.comentarios.length,'comentário','comentários')}</div>`:''}
   <div class="cf">${eqAvs(t.responsaveis)}<select data-eqst="${t.id}" aria-label="Etapa">${EQ_ST.map(([s,n])=>`<option value="${s}" ${t.status===s?'selected':''}>${n}</option>`).join('')}</select></div></div>`; }

/* ---------- visões ---------- */
function eqLista(L){ const f=eqUi();
  return `<div class="eqgrp-bar"><span class="muted">Agrupar por</span><div class="seg" role="group">${[['prazo','Prazo'],['etapa','Etapa'],['area','Área'],['projeto','Projeto'],['pessoa','Pessoa']].map(([k,l])=>`<button class="${f.grupo===k?'on':''}" data-act="eq-set" data-k="grupo" data-v="${k}">${l}</button>`).join('')}</div><span class="muted" style="margin-left:auto">${L.filter(t=>t.status!=='Concluída').length} abertas</span></div>
   ${eqGrupos(L).filter(([,l])=>l.length).map(([n,l,c])=>`<section class="block eqgrp"><div class="eqgh ${c||''}"><b>${esc(n)}</b><span class="ct">${l.length}</span>${n!=='Realizadas'?`<button class="kadd2" data-act="eq-nova" data-grupo="${esc(n)}" aria-label="Nova tarefa">+</button>`:''}</div>${(c==='ok'&&!ui.open['eq-feitas']?l.slice(-5):l).map(eqLinha).join('')}${c==='ok'&&l.length>5?`<button class="eqmore" data-act="eq-feitas">${ui.open['eq-feitas']?'Mostrar menos':'Ver todas as '+l.length+' realizadas'}</button>`:''}</section>`).join('')||'<section class="block"><p class="empty">Nenhuma tarefa com esses filtros. Crie em <b>Nova tarefa</b>.</p></section>'}`; }
function eqQuadro(L){ return `<div class="eqboard">${EQ_ST.map(([s,n],i)=>{ const it=L.filter(t=>t.status===s).sort((a,b)=>PRIO.indexOf(a.prioridade)-PRIO.indexOf(b.prioridade)||(a.prazo||'9').localeCompare(b.prazo||'9'));
   return `<section class="eqcol c${i}" data-col="${s}" data-board="it"><div class="eqch"><b>${n}</b><span class="ct">${it.length}</span><button class="kadd2" data-act="eq-nova" data-st="${s}" aria-label="Nova tarefa em ${n}">+</button></div>${it.map(eqCard).join('')}</section>`; }).join('')}</div>`; }
function eqTabela(L){ const f=eqUi(); const key={titulo:t=>t.titulo.toLowerCase(),area:t=>t.area_eq,prio:t=>PRIO.indexOf(t.prioridade),etapa:t=>EQ_ST.findIndex(x=>x[0]===t.status),prazo:t=>t.prazo||'9999'}[f.ordem]||(t=>t.prazo||'9999');
  const R=[...L].sort((a,b)=>{ const x=key(a),y=key(b); return (x<y?-1:x>y?1:0)*f.dir; });
  const th=(k,l)=>`<th><button class="thb" data-act="eq-ordem" data-v="${k}">${l}${f.ordem===k?(f.dir>0?' ↑':' ↓'):''}</button></th>`;
  return `<div class="tblw"><table class="tbl eqtab"><thead><tr>${th('titulo','Tarefa')}${th('area','Área')}<th>Responsáveis</th>${th('prio','Prioridade')}${th('etapa','Etapa')}${th('prazo','Período')}<th></th></tr></thead><tbody>
   ${R.map(t=>`<tr class="${itLate(t)?'late':''}"><td><button class="eqt" data-act="eq-abrir" data-v="${t.id}">${esc(t.titulo||'Sem título')}</button>${itLate(t)?ico('alerta',13):''}</td>
    <td><select data-eqf="area_eq" data-id="${t.id}"><option value="">—</option>${EQ_AREAS.map(([a])=>`<option ${t.area_eq===a?'selected':''}>${a}</option>`).join('')}</select></td>
    <td>${eqAvs(t.responsaveis)}</td><td><select class="prio-${PRIO.indexOf(t.prioridade)}" data-eqf="prioridade" data-id="${t.id}">${PRIO.map(p=>`<option ${t.prioridade===p?'selected':''}>${p}</option>`).join('')}</select></td>
    <td><select class="st-${EQ_ST.findIndex(x=>x[0]===t.status)}" data-eqst="${t.id}">${EQ_ST.map(([s,n])=>`<option value="${s}" ${t.status===s?'selected':''}>${n}</option>`).join('')}</select></td>
    <td>${eqPeriodo(t)}</td><td class="x"><button class="xbtn" data-act="eq-del" data-v="${t.id}" aria-label="Excluir">×</button></td></tr>`).join('')||'<tr><td colspan="7" class="muted">Nenhuma tarefa.</td></tr>'}</tbody></table></div>`; }
function eqPorArea(L){ return `<div class="eqareas">${[...EQ_AREAS,['Sem área','var(--line-2)']].map(([a,c])=>{ const tl=L.filter(t=>a==='Sem área'?!t.area_eq:t.area_eq===a), ab=tl.filter(t=>t.status!=='Concluída'), lt=ab.filter(itLate), emP=ab.filter(t=>t.projeto_id||t.diagnostico_id);
   const pjs=[...new Set(ab.map(t=>t.projeto_id?pjNome(t.projeto_id):t.diagnostico_id?diagNome(t.diagnostico_id):'').filter(Boolean))];
   const ps=profiles.filter(p=>p.ativo&&p.papel!=='cliente').map(p=>[p,ab.filter(t=>itDono(t,p.id)).length]).filter(x=>x[1]).sort((x,y)=>y[1]-x[1]);
   if(a==='Sem área'&&!ab.length) return '';
   return `<button class="eqarea" data-act="eq-area" data-v="${a==='Sem área'?'':esc(a)}"><div class="eah"><i style="background:${c}"></i><b>${esc(a)}</b></div>
    <div class="eans"><div><b>${ab.length}</b><span>abertas</span></div><div class="${lt.length?'bad':''}"><b>${lt.length}</b><span>atrasadas</span></div><div><b>${pjs.length}</b><span>projetos</span></div></div>
    <div class="eabar"><span style="width:${ab.length?Math.round(emP.length/ab.length*100):0}%"></span></div><small>${emP.length} em projeto · ${ab.length-emP.length} do dia a dia</small>
    ${pjs.length?`<div class="ktags">${pjs.slice(0,4).map(n=>`<span class="tag proj"><i></i>${esc(n.length>26?n.slice(0,25)+'…':n)}</span>`).join('')}</div>`:''}
    ${ps.length?`<ul>${ps.map(([p,n])=>`<li><span>${esc(p.nome||p.email)}</span><b>${n}</b></li>`).join('')}</ul>`:''}</button>`; }).join('')}</div><p class="muted" style="font-size:12.5px">Clique numa área para ver a lista dela. A barra mostra quanto do trabalho aberto é de projeto.</p>`; }
function eqMetricas(L){ const ab=L.filter(t=>t.status!=='Concluída'), lt=ab.filter(itLate), lim=new Date(); lim.setDate(lim.getDate()-30);
  const feitas=L.filter(t=>t.status==='Concluída'), f30=feitas.filter(t=>t.concluida_em&&new Date(t.concluida_em)>=lim);
  const dur=feitas.filter(t=>t.concluida_em&&t.created_at).map(t=>(new Date(t.concluida_em)-new Date(t.created_at))/864e5); const med=dur.length?dur.reduce((a,b)=>a+b,0)/dur.length:null;
  const noPrazo=feitas.filter(t=>t.prazo&&t.concluida_em), ok=noPrazo.filter(t=>isoLocal(t.concluida_em)<=t.prazo).length;
  const ppl=profiles.filter(p=>p.ativo&&p.papel!=='cliente').map(p=>({p,v:EQ_ST.slice(0,3).map(([s])=>L.filter(t=>itDono(t,p.id)&&t.status===s).length)})).filter(x=>x.v.some(Boolean)).sort((a,b)=>b.v.reduce((x,y)=>x+y,0)-a.v.reduce((x,y)=>x+y,0));
  const mx=Math.max(1,...ppl.map(x=>x.v.reduce((a,b)=>a+b,0)));
  const sem=Array.from({length:8},(_,i)=>{ const fim=new Date(); fim.setDate(fim.getDate()-7*(7-i)); const ini=new Date(fim); ini.setDate(ini.getDate()-7); return {l:eqData(isoLocal(fim)),n:feitas.filter(t=>t.concluida_em&&new Date(t.concluida_em)>ini&&new Date(t.concluida_em)<=fim).length}; });
  const ms=Math.max(1,...sem.map(x=>x.n)); const cores=['var(--faint)','var(--s1)','var(--s4)'];
  const areaSeg=EQ_AREAS.map(([a,c])=>({l:a,v:ab.filter(t=>t.area_eq===a).length,c}));
  return `<div class="stats"><div class="stat"><span class="si">${ico('internas',20)}</span><b>${ab.length}</b><span>tarefas abertas</span></div>
    <div class="stat ${lt.length?'bad':''}"><span class="si">${ico('relogio',20)}</span><b>${lt.length}</b><span>atrasadas</span><small>${ab.length?pct(lt.length/ab.length):'—'} do que está aberto</small></div>
    <div class="stat"><span class="si">${ico('check',20)}</span><b>${f30.length}</b><span>realizadas em 30 dias</span></div>
    <div class="stat"><span class="si">${ico('alvo',20)}</span><b>${noPrazo.length?pct(ok/noPrazo.length):'—'}</b><span>entregues no prazo</span><small>${med!=null?'Leva em média '+dec(med,0)+' dias para concluir':'Sem histórico ainda'}</small></div></div>
   <div class="rx-two"><section class="block"><div class="block-h"><h3>Carga por pessoa</h3><p>Tarefas abertas por etapa</p></div>
     ${ppl.length?`<div class="eqbars">${ppl.map(x=>`<div class="eqbr"><span class="n">${esc(x.p.nome||x.p.email)}</span><span class="b">${x.v.map((v,i)=>v?`<i style="width:${v/mx*100}%;background:${cores[i]}" data-tip="${EQ_ST[i][1]}: ${v}"></i>`:'').join('')}</span><b>${x.v.reduce((a,b)=>a+b,0)}</b></div>`).join('')}</div><div class="legend">${EQ_ST.slice(0,3).map(([,n],i)=>`<span class="lg"><i style="background:${cores[i]}"></i>${n}</span>`).join('')}</div>`:'<p class="empty">Sem tarefas abertas com responsável.</p>'}</section>
    <section class="block"><div class="block-h"><h3>Por área</h3><p>Tarefas abertas</p></div>${ab.length&&typeof donutSvg==='function'?`<div class="donutw"><div class="donut">${donutSvg(areaSeg)}<div class="dv"><b>${ab.length}</b><small>abertas</small></div></div><div class="dleg">${areaSeg.filter(x=>x.v).map(x=>`<div><i style="background:${x.c}"></i><span>${x.l}</span><b>${x.v}</b></div>`).join('')}</div></div>`:'<p class="empty">Nada aberto.</p>'}</section></div>
   <section class="block"><div class="block-h"><h3>Realizadas por semana</h3><p>Últimas 8 semanas</p></div><div class="eqweeks">${sem.map(x=>`<div><span class="b"><i style="height:${x.n/ms*100}%" data-tip="Semana até ${x.l}: ${x.n}"></i></span><b>${x.n}</b><small>${x.l}</small></div>`).join('')}</div></section>`; }
function eqProjetos(){ const f=eqUi();
  return `<div class="eqpjs">${projetos.map(p=>{ const tl=internas.filter(t=>t.projeto_id===p.id), ok=tl.filter(t=>t.status==='Concluída').length, ab=tl.length-ok, lt=tl.filter(itLate).length, r=pessoa(p.responsavel);
    return `<button class="eqpj" data-act="eq-pj" data-v="${p.id}"><div class="eah"><i style="background:${eqCor(p.area)}"></i><b>${esc(p.nome)}</b><span class="stp pj-${PJ_ST.indexOf(p.status)}">${esc(p.status)}</span></div>
     ${p.descricao?`<p>${esc(p.descricao.slice(0,140))}</p>`:''}<div class="eabar"><span style="width:${tl.length?Math.round(ok/tl.length*100):0}%"></span></div>
     <small>${ok}/${tl.length} tarefas realizadas · ${ab} abertas${lt?` · <b class="late">${lt} atrasadas</b>`:''}</small>
     <div class="pjf">${p.diagnostico_id?`<span class="tag proj"><i></i>${esc(diagNome(p.diagnostico_id))}</span>`:''}${p.area?eqArea(p.area):''}${r?`<span class="av" title="${esc(r.nome||r.email)}">${esc(initials(r.nome||r.email))}</span>`:''}<span class="per">${p.inicio?eqData(p.inicio)+' → ':''}${p.fim?eqData(p.fim):''}</span></div></button>`; }).join('')}
   <button class="eqpj novo" data-act="eq-pj-novo">${ico('fases',22)}<b>Novo projeto</b><small>Agrupa tarefas de um cliente ou de uma iniciativa interna.</small></button></div>`; }
function eqDrawer(){ const f=eqUi(); if(f.aberta){ const t=internas.find(x=>x.id===f.aberta); if(!t){ f.aberta=null; return ''; }
  const st=t.subtarefas.length, ok=t.subtarefas.filter(x=>x.ok).length;
  return `<div class="drawer-back" data-act="eq-fechar"></div><aside class="drawer" role="dialog" aria-label="Tarefa"><div class="dh"><span class="eyebrow"><b>Tarefa</b></span><button class="xbtn" data-act="eq-fechar" aria-label="Fechar">×</button></div>
   <textarea class="dtit" data-eqf="titulo" data-id="${t.id}" rows="2" placeholder="O que precisa ser feito">${esc(t.titulo)}</textarea>
   <div class="dgrid"><label>Etapa<select data-eqst="${t.id}">${EQ_ST.map(([s,n])=>`<option value="${s}" ${t.status===s?'selected':''}>${n}</option>`).join('')}</select></label>
    <label>Prioridade<select data-eqf="prioridade" data-id="${t.id}">${PRIO.map(p=>`<option ${t.prioridade===p?'selected':''}>${p}</option>`).join('')}</select></label>
    <label>Área<select data-eqf="area_eq" data-id="${t.id}"><option value="">—</option>${EQ_AREAS.map(([a])=>`<option ${t.area_eq===a?'selected':''}>${a}</option>`).join('')}</select></label>
    <label>Projeto<select data-eqf="projeto_id" data-id="${t.id}"><option value="">Avulsa</option>${projetos.map(p=>`<option value="${p.id}" ${t.projeto_id===p.id?'selected':''}>${esc(p.nome)}</option>`).join('')}</select></label>
    <label>Cliente<select data-eqf="diagnostico_id" data-id="${t.id}"><option value="">Interno LORSO</option>${Object.values(all).map(d=>`<option value="${d.id}" ${t.diagnostico_id===d.id?'selected':''}>${esc(diagNome(d.id))}</option>`).join('')}</select></label>
    <label>Início<input type="date" data-eqf="inicio" data-id="${t.id}" value="${esc(t.inicio)}"></label><label>Fim<input type="date" data-eqf="prazo" data-id="${t.id}" value="${esc(t.prazo)}"></label></div>
   <div class="dsec"><b>Responsáveis</b><div class="pchips">${profiles.filter(p=>p.ativo&&p.papel!=='cliente').map(p=>`<button class="pchip ${itDono(t,p.id)?'on':''}" data-act="eq-resp" data-id="${t.id}" data-v="${p.id}" aria-pressed="${itDono(t,p.id)}"><span class="av">${esc(initials(p.nome||p.email))}</span>${esc((p.nome||p.email).split(' ')[0])}</button>`).join('')}</div></div>
   <div class="dsec"><b>Descrição</b><textarea data-eqf="descricao" data-id="${t.id}" rows="3" placeholder="Detalhes, links, combinados">${esc(t.descricao)}</textarea></div>
   <div class="dsec"><b>Subtarefas ${st?`<span class="muted">${ok}/${st}</span>`:''}</b>${st?`<div class="cbar"><span style="width:${Math.round(ok/st*100)}%"></span></div>`:''}
    ${t.subtarefas.map(x=>`<div class="sub"><input type="checkbox" data-eqsub="${t.id}" data-s="${x.id}" ${x.ok?'checked':''} aria-label="Concluir subtarefa"><span class="${x.ok?'okline':''}">${esc(x.t)}</span><button class="xbtn" data-act="eq-subdel" data-id="${t.id}" data-s="${x.id}" aria-label="Remover">×</button></div>`).join('')}
    <form class="addline" data-eqform="sub" data-id="${t.id}"><input name="t" placeholder="Nova subtarefa e Enter"><button class="btn sm" type="submit">+</button></form></div>
   <div class="dsec"><b>Comentários</b>${t.comentarios.map(c=>`<div class="com"><div><span class="av">${esc(initials(c.autor))}</span><b>${esc(c.autor)}</b><small>${new Date(c.em).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</small></div><p>${esc(c.txt)}</p></div>`).join('')}
    <form class="addline" data-eqform="com" data-id="${t.id}"><input name="t" placeholder="Escreva um comentário"><button class="btn sm primary" type="submit">Comentar</button></form></div>
   <div class="dfoot"><button class="btn ghost" data-act="eq-del" data-v="${t.id}">Excluir tarefa</button><button class="btn primary" data-act="eq-fechar">Pronto</button></div></aside>`; }
  if(f.pj){ const p=projetos.find(x=>x.id===f.pj); if(!p){ f.pj=null; return ''; }
   return `<div class="drawer-back" data-act="eq-fechar"></div><aside class="drawer" role="dialog" aria-label="Projeto"><div class="dh"><span class="eyebrow"><b>Projeto</b></span><button class="xbtn" data-act="eq-fechar" aria-label="Fechar">×</button></div>
   <textarea class="dtit" data-pjf="nome" data-id="${p.id}" rows="1" placeholder="Nome do projeto">${esc(p.nome)}</textarea>
   <div class="dgrid"><label>Status<select data-pjf="status" data-id="${p.id}">${PJ_ST.map(s=>`<option ${p.status===s?'selected':''}>${s}</option>`).join('')}</select></label>
    <label>Área<select data-pjf="area" data-id="${p.id}"><option value="">—</option>${EQ_AREAS.map(([a])=>`<option ${p.area===a?'selected':''}>${a}</option>`).join('')}</select></label>
    <label>Cliente<select data-pjf="diagnostico_id" data-id="${p.id}"><option value="">Interno LORSO</option>${Object.values(all).map(d=>`<option value="${d.id}" ${p.diagnostico_id===d.id?'selected':''}>${esc(diagNome(d.id))}</option>`).join('')}</select></label>
    <label>Responsável<select data-pjf="responsavel" data-id="${p.id}"><option value="">—</option>${profiles.filter(x=>x.ativo&&x.papel!=='cliente').map(x=>`<option value="${x.id}" ${p.responsavel===x.id?'selected':''}>${esc(x.nome||x.email)}</option>`).join('')}</select></label>
    <label>Início<input type="date" data-pjf="inicio" data-id="${p.id}" value="${esc(p.inicio)}"></label><label>Fim<input type="date" data-pjf="fim" data-id="${p.id}" value="${esc(p.fim)}"></label></div>
   <div class="dsec"><b>Descrição</b><textarea data-pjf="descricao" data-id="${p.id}" rows="3" placeholder="Objetivo e escopo">${esc(p.descricao)}</textarea></div>
   <div class="dfoot"><button class="btn" data-act="eq-pj-tarefas" data-v="${p.id}">Ver tarefas do projeto</button><button class="btn primary" data-act="eq-fechar">Pronto</button></div></aside>`; }
  return ''; }
function renderInternas(){ const f=eqUi(); const L=eqFiltradas(); const pessoas=profiles.filter(p=>p.ativo&&p.papel!=='cliente');
  const projOpts=`<option value="">Todos os projetos</option><option value="-" ${f.projeto==='-'?'selected':''}>Avulsas</option>${projetos.map(p=>`<option value="${p.id}" ${f.projeto===p.id?'selected':''}>${esc(p.nome)}</option>`).join('')}${Object.values(all).map(d=>`<option value="c:${d.id}" ${f.projeto==='c:'+d.id?'selected':''}>Cliente · ${esc(diagNome(d.id))}</option>`).join('')}`;
  const V={lista:eqLista,quadro:eqQuadro,tabela:eqTabela,area:eqPorArea,metricas:eqMetricas};
  $('#main').innerHTML=`<section class="panel eqpanel">
   <header class="ph" style="grid-template-columns:minmax(0,1fr) auto"><div><span class="eyebrow">LORSO · <b>Equipe</b></span><h2 style="margin-top:8px">Tarefas e projetos</h2><p class="lead">O trabalho do dia a dia e as iniciativas da equipe, no mesmo lugar. O cliente não vê este quadro.</p></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">${cur&&f.aba==='tarefas'?`<button class="btn" data-act="gen-coleta" title="Cria uma tarefa por área ainda incompleta de ${esc(cur.nome)}">Gerar tarefas de coleta</button>`:''}<button class="btn primary" data-act="${f.aba==='projetos'?'eq-pj-novo':'eq-nova'}">+ ${f.aba==='projetos'?'Novo projeto':'Nova tarefa'}</button></div></header>
   <nav class="subtabs" aria-label="Tarefas ou projetos"><button class="${f.aba==='tarefas'?'on':''}" data-act="eq-set" data-k="aba" data-v="tarefas">${ico('internas',16)} Tarefas</button><button class="${f.aba==='projetos'?'on':''}" data-act="eq-set" data-k="aba" data-v="projetos">${ico('fases',16)} Projetos <span class="ct">${projetos.length}</span></button></nav>
   ${f.aba==='projetos'?eqProjetos():`<div class="eqbar"><div class="seg" role="group"><button class="${f.escopo==='minhas'?'on':''}" data-act="eq-set" data-k="escopo" data-v="minhas">${ico('pessoa',14)} Minhas</button><button class="${f.escopo==='time'?'on':''}" data-act="eq-set" data-k="escopo" data-v="time">${ico('equipe',14)} Time</button></div>
     <select data-eqfil="pessoa" aria-label="Pessoa"><option value="">Todas as pessoas</option><option value="-" ${f.pessoa==='-'?'selected':''}>Sem responsável</option>${pessoas.map(p=>`<option value="${p.id}" ${f.pessoa===p.id?'selected':''}>${esc(p.nome||p.email)}</option>`).join('')}</select>
     <select data-eqfil="area" aria-label="Área"><option value="">Todas as áreas</option>${EQ_AREAS.map(([a])=>`<option ${f.area===a?'selected':''}>${a}</option>`).join('')}</select>
     <select data-eqfil="projeto" aria-label="Projeto">${projOpts}</select>
     <select data-eqfil="prazo" aria-label="Prazo"><option value="">Qualquer prazo</option><option value="atrasadas" ${f.prazo==='atrasadas'?'selected':''}>Atrasadas</option><option value="semana" ${f.prazo==='semana'?'selected':''}>Próximos 7 dias</option><option value="sem" ${f.prazo==='sem'?'selected':''}>Sem data</option></select>
     <input data-eqfil="busca" placeholder="Buscar tarefa" value="${esc(f.busca)}" aria-label="Buscar">
     ${f.pessoa||f.area||f.projeto||f.prazo||f.busca?`<button class="chip" data-act="eq-limpar">Limpar</button>`:''}
     <div class="seg vis" role="group" aria-label="Visão">${[['lista','Lista','lista'],['quadro','Quadro','tarefas'],['tabela','Tabela','sistemas'],['area','Por área','equipe'],['metricas','Métricas','resultados']].map(([k,l,i])=>`<button class="${f.visao===k?'on':''}" data-act="eq-set" data-k="visao" data-v="${k}">${ico(i,14)} ${l}</button>`).join('')}</div></div>
   ${V[f.visao](L)}`}</section>${eqDrawer()}`;
  if(typeof bindDnD==='function') bindDnD();
  const d=document.querySelector('.drawer .dtit'); if(d&&!d.value&&ui.eqFoco){ d.focus(); ui.eqFoco=false; } }

/* ---------- eventos (chamados pelo app.js) ---------- */
function eqClick(act,d){ const f=eqUi();
  if(act==='eq-set'){ f[d.k]=d.v; if(d.k==='aba'){ f.aberta=null; f.pj=null; } render(); return true; }
  if(act==='eq-limpar'){ Object.assign(f,{pessoa:'',area:'',projeto:'',prazo:'',busca:''}); render(); return true; }
  if(act==='eq-abrir'){ f.aberta=d.v; f.pj=null; render(); return true; }
  if(act==='eq-fechar'){ const t=internas.find(x=>x.id===f.aberta); if(t)itSave(t,true); const p=projetos.find(x=>x.id===f.pj); if(p)pjSave(p,true); f.aberta=null; f.pj=null; render(); return true; }
  if(act==='eq-nova'){ const o={status:d.st||'A fazer',responsaveis:f.escopo==='minhas'||!f.pessoa?[me.id]:(f.pessoa==='-'?[]:[f.pessoa]),area_eq:f.area||''};
    if(f.projeto&&f.projeto!=='-'){ if(f.projeto.startsWith('c:'))o.diagnostico_id=f.projeto.slice(2); else o.projeto_id=f.projeto; }
    if(d.grupo==='Próximos 7 dias'){ const x=new Date(); x.setDate(x.getDate()+3); o.prazo=isoLocal(x); }
    const t=itNew(o); f.aberta=t.id; ui.eqFoco=true; render(); return true; }
  if(act==='eq-del'){ itDel(d.v); f.aberta=null; render(); return true; }
  if(act==='eq-resp'){ const t=internas.find(x=>x.id===d.id); if(t){ t.responsaveis=itDono(t,d.v)?t.responsaveis.filter(x=>x!==d.v):[...t.responsaveis,d.v]; itSave(t); render(); } return true; }
  if(act==='eq-subdel'){ const t=internas.find(x=>x.id===d.id); if(t){ t.subtarefas=t.subtarefas.filter(x=>x.id!==d.s); itSave(t); render(); } return true; }
  if(act==='eq-ordem'){ if(f.ordem===d.v)f.dir=-f.dir; else { f.ordem=d.v; f.dir=1; } render(); return true; }
  if(act==='eq-area'){ f.area=d.v; f.visao='lista'; f.grupo='prazo'; render(); return true; }
  if(act==='eq-feitas'){ ui.open['eq-feitas']=!ui.open['eq-feitas']; render(); return true; }
  if(act==='eq-pj'){ f.pj=d.v; f.aberta=null; render(); return true; }
  if(act==='eq-pj-novo'){ const p={id:uid(),nome:'',descricao:'',area:'',diagnostico_id:cur?'':'',responsavel:me.id,inicio:today(),fim:'',status:'Em andamento'}; projetos.push(p); pjSave(p,true); f.aba='projetos'; f.pj=p.id; render(); const el=document.querySelector('.drawer .dtit'); el&&el.focus(); return true; }
  if(act==='eq-pj-tarefas'){ f.aba='tarefas'; f.projeto=d.v; f.pj=null; f.visao='lista'; render(); return true; }
  return false; }
function eqChange(t){ const d=t.dataset; const f=eqUi();
  if(d.eqfil!=null){ f[d.eqfil]=t.value; render(); return true; }
  if(d.eqst!=null){ const x=internas.find(y=>y.id===d.eqst); if(x){ itStatus(x,t.value); render(); } return true; }
  if(d.eqchk!=null){ const x=internas.find(y=>y.id===d.eqchk); if(x){ itStatus(x,t.checked?'Concluída':'A fazer'); render(); } return true; }
  if(d.eqsub!=null){ const x=internas.find(y=>y.id===d.eqsub); if(x){ const s=x.subtarefas.find(z=>z.id===d.s); if(s){ s.ok=t.checked; itSave(x); render(); } } return true; }
  if(d.eqf!=null){ const x=internas.find(y=>y.id===d.id); if(x){ x[d.eqf]=t.value; itSave(x); if(t.tagName==='SELECT'||t.type==='date')render(); } return true; }
  if(d.pjf!=null){ const p=projetos.find(y=>y.id===d.id); if(p){ p[d.pjf]=t.value; pjSave(p); if(t.tagName==='SELECT'||t.type==='date')render(); } return true; }
  return false; }
function eqInput(t){ const d=t.dataset;
  if(d.eqf==='titulo'||d.eqf==='descricao'){ const x=internas.find(y=>y.id===d.id); if(x){ x[d.eqf]=t.value; itSave(x); } return true; }
  if(d.pjf==='nome'||d.pjf==='descricao'){ const p=projetos.find(y=>y.id===d.id); if(p){ p[d.pjf]=t.value; pjSave(p); } return true; }
  if(d.eqfil==='busca'){ eqUi().busca=t.value; clearTimeout(itT._b); itT._b=setTimeout(()=>{ render(); const el=document.querySelector('[data-eqfil="busca"]'); if(el){ el.focus(); el.setSelectionRange(el.value.length,el.value.length); } },300); return true; }
  return false; }
function eqSubmit(f){ const d=f.dataset; if(d.eqform==null)return false; const x=internas.find(y=>y.id===d.id); const v=(f.t.value||'').trim(); if(!x||!v)return true;
  if(d.eqform==='sub') x.subtarefas.push({id:uid(),t:v,ok:false}); else x.comentarios.push({id:uid(),autor:me?(me.nome||me.email):'Equipe',txt:v,em:new Date().toISOString()});
  itSave(x,true); render(); const el=document.querySelector(`form[data-eqform="${d.eqform}"] input`); el&&el.focus(); return true; }
