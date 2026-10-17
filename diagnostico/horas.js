/* =====================================================================
   Horas da equipe (só o administrador vê)
   1) Registro: enquanto alguém da equipe LORSO usa o sistema, o navegador
      avisa o banco uma vez por minuto. Conta só com a aba visível e com
      uso (mouse, teclado, rolagem ou toque) nos últimos 5 minutos.
   2) Tela: horas por pessoa, por cliente e por dia, com exportação.
   Cliente e funcionários não veem: o banco só deixa o administrador ler.
   ===================================================================== */
ICO.horas=ICO.relogio;
const HR_INATIVO=5*60*1000;
let hrUltimoUso=Date.now();
const hrMarcar=()=>{ hrUltimoUso=Date.now(); };
['mousemove','mousedown','keydown','scroll','touchstart','wheel'].forEach(ev=>window.addEventListener(ev,hrMarcar,{passive:true,capture:true}));
function hrOuvirFrames(){
  document.querySelectorAll('iframe').forEach(f=>{ try{ const w=f.contentWindow; if(!w||w.__hrOuvindo) return; ['mousemove','mousedown','keydown','scroll','touchstart','wheel'].forEach(ev=>w.addEventListener(ev,hrMarcar,{passive:true,capture:true})); w.__hrOuvindo=true; }catch(e){ /* módulo de outra origem */ } });
}
const hrDiaLocal=()=>{ const t=new Date(); return t.getFullYear()+'-'+String(t.getMonth()+1).padStart(2,'0')+'-'+String(t.getDate()).padStart(2,'0'); };
async function hrPulso(){
  try{
    hrOuvirFrames();
    if(!me||me.papel==='cliente'||typeof sb==='undefined') return;
    if(document.visibilityState!=='visible') return;
    if(Date.now()-hrUltimoUso>HR_INATIVO) return;
    await sb.rpc('registrar_atividade',{p_diag:cur?cur.id:null,p_dia:hrDiaLocal()});
  }catch(e){ /* sem rede: o minuto não conta */ }
}
setInterval(hrPulso,60*1000);

/* ---------- tela ---------- */
let HR={per:'mes',de:'',ate:'',pessoa:'',dados:null,carregando:false,erro:null,chave:''};
const hrIso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
function hrPeriodo(){
  const t=new Date(); let a,b;
  if(HR.per==='mes'){ a=new Date(t.getFullYear(),t.getMonth(),1); b=t; }
  else if(HR.per==='passado'){ a=new Date(t.getFullYear(),t.getMonth()-1,1); b=new Date(t.getFullYear(),t.getMonth(),0); }
  else if(HR.per==='7d'){ a=new Date(t.getFullYear(),t.getMonth(),t.getDate()-6); b=t; }
  else { return [HR.de||hrIso(new Date(t.getFullYear(),t.getMonth(),1)),HR.ate||hrIso(t)]; }
  return [hrIso(a),hrIso(b)];
}
const hrH=m=>{ m=Math.round(m||0); const h=Math.floor(m/60), r=m%60; return h?`${h}h${r?` ${String(r).padStart(2,'0')}min`:''}`:`${r}min`; };
const hrDec=m=>(m/60).toFixed(2).replace('.',',');
const hrNome=id=>{ const p=(profiles||[]).find(x=>x.id===id); return p?(p.nome||p.email):'Pessoa removida'; };
const hrCli=id=>id?((all&&all[id]&&all[id].nome)||'Cliente removido'):'Fora de um cliente';
const hrHora=s=>s?new Date(s).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit',timeZone:'America/Sao_Paulo'}):'—';

async function hrCarregar(){
  const [a,b]=hrPeriodo(), k=a+'|'+b; if(HR.carregando||HR.chave===k&&HR.dados) return;
  HR.carregando=true; HR.erro=null;
  const r=await sb.from('horas_atividade').select('*').gte('dia',a).lte('dia',b).order('dia',{ascending:false});
  HR.carregando=false; HR.chave=k;
  if(r.error){ HR.erro=r.error.message; HR.dados=[]; } else HR.dados=r.data||[];
  if(ui.view==='horas') render();
}

function renderHoras(){
  if(!me||me.papel!=='admin'){ $('#main').innerHTML='<section class="block"><p class="empty">Só o administrador vê esta tela.</p></section>'; return; }
  const [a,b]=hrPeriodo();
  if(!HR.dados||HR.chave!==a+'|'+b) hrCarregar();
  const L=(HR.dados||[]).filter(r=>!HR.pessoa||r.user_id===HR.pessoa);
  const tot=L.reduce((s,r)=>s+r.minutos,0);
  const soma=(fk)=>{ const m={}; L.forEach(r=>{ const k=fk(r); m[k]=(m[k]||0)+r.minutos; }); return Object.entries(m).sort((x,y)=>y[1]-x[1]); };
  const porPessoa=soma(r=>r.user_id), porCli=soma(r=>r.diagnostico_id||''), dias=new Set(L.map(r=>r.dia));
  const diasDe=id=>new Set(L.filter(r=>r.user_id===id).map(r=>r.dia)).size;
  const cliDe=id=>{ const m={}; L.filter(r=>r.user_id===id).forEach(r=>{ const k=r.diagnostico_id||''; m[k]=(m[k]||0)+r.minutos; }); return Object.entries(m).sort((x,y)=>y[1]-x[1]); };
  const pessoasEq=(profiles||[]).filter(p=>p.papel!=='cliente');
  const seg=[['mes','Este mês'],['passado','Mês passado'],['7d','Últimos 7 dias'],['outro','Escolher datas']];
  const maxP=porPessoa.length?porPessoa[0][1]:1;
  $('#main').innerHTML=`<section class="panel">
   <header class="ph" style="grid-template-columns:minmax(0,1fr) auto"><div><span class="eyebrow">LORSO · <b>Só administrador</b></span><h2 style="margin-top:8px">Horas da equipe</h2><p class="lead">Tempo de uso ativo de cada pessoa da equipe LORSO no sistema, por cliente e por dia. Cliente e funcionários não veem esta tela.</p></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary" data-act="hr-csv" ${L.length?'':'disabled'}>Exportar planilha (.csv)</button></div></header>
   <section class="block hr-filtros">
    <div class="seg" role="group" aria-label="Período">${seg.map(([k,l])=>`<button class="${HR.per===k?'on':''}" data-act="hr-per" data-v="${k}" aria-pressed="${HR.per===k}">${l}</button>`).join('')}</div>
    ${HR.per==='outro'?`<label class="field"><span class="lbl">De</span><input type="date" id="hr-de" value="${a}"></label><label class="field"><span class="lbl">Até</span><input type="date" id="hr-ate" value="${b}"></label>`:''}
    <label class="field"><span class="lbl">Pessoa</span><select id="hr-pessoa"><option value="">Toda a equipe</option>${pessoasEq.map(p=>`<option value="${p.id}" ${HR.pessoa===p.id?'selected':''}>${esc(p.nome||p.email)}</option>`).join('')}</select></label>
    <span class="muted" style="font-size:13px">${pzFmt(a)} a ${pzFmt(b)}</span>
   </section>
   ${HR.erro?`<p class="msg err">Não foi possível ler as horas: ${esc(HR.erro)}</p>`:''}
   <div class="kpis hr-k">
    <div class="kpi"><b>${hrH(tot)}</b><span>de uso ativo no período</span></div>
    <div class="kpi"><b>${porPessoa.length}</b><span>${porPessoa.length===1?'pessoa com registro':'pessoas com registro'}</span></div>
    <div class="kpi"><b>${dias.size}</b><span>${dias.size===1?'dia com uso':'dias com uso'}</span></div>
    <div class="kpi"><b>${hrH(dias.size?tot/dias.size:0)}</b><span>média por dia com uso</span></div>
   </div>
   ${HR.carregando&&!HR.dados?'<p class="muted">Carregando…</p>':!L.length?`<section class="block"><p class="empty">Nenhum minuto registrado neste período. O registro começa a contar a partir de hoje, sempre que alguém da equipe usa o sistema.</p></section>`:`
   <section class="block"><div class="block-h"><h3>Por pessoa</h3><p>Horas, dias com uso e em quais clientes</p></div>
    <div class="tblw"><table class="tbl hr-tbl"><thead><tr><th>Pessoa</th><th class="r">Horas</th><th class="r">Em decimal</th><th class="r">Dias</th><th class="r">Média por dia</th><th>Clientes</th></tr></thead><tbody>
    ${porPessoa.map(([id,m])=>`<tr><td><b>${esc(hrNome(id))}</b><span class="hr-bar"><i style="width:${(m/maxP*100).toFixed(1)}%"></i></span></td><td class="r num">${hrH(m)}</td><td class="r num">${hrDec(m)}</td><td class="r num">${diasDe(id)}</td><td class="r num">${hrH(m/Math.max(1,diasDe(id)))}</td><td><span class="hr-chips">${cliDe(id).map(([c,mm])=>`<span class="tag">${esc(hrCli(c))} · ${hrH(mm)}</span>`).join('')}</span></td></tr>`).join('')}
    </tbody></table></div></section>
   <section class="block"><div class="block-h"><h3>Por cliente</h3><p>Base para comprovar horas em cada contrato</p></div>
    <div class="tblw"><table class="tbl"><thead><tr><th>Cliente</th><th class="r">Horas</th><th class="r">Em decimal</th><th class="r">Pessoas</th></tr></thead><tbody>
    ${porCli.map(([c,m])=>`<tr><td>${esc(hrCli(c))}</td><td class="r num">${hrH(m)}</td><td class="r num">${hrDec(m)}</td><td class="r num">${new Set(L.filter(r=>(r.diagnostico_id||'')===c).map(r=>r.user_id)).size}</td></tr>`).join('')}
    </tbody></table></div></section>
   <section class="block"><div class="block-h"><h3>Dia a dia</h3><p>Primeiro e último minuto registrados em cada dia</p></div>
    <div class="tblw"><table class="tbl"><thead><tr><th>Dia</th><th>Pessoa</th><th>Cliente</th><th class="r">Horas</th><th class="r">Primeiro uso</th><th class="r">Último uso</th></tr></thead><tbody>
    ${L.slice().sort((x,y)=>y.dia.localeCompare(x.dia)||hrNome(x.user_id).localeCompare(hrNome(y.user_id))).map(r=>`<tr><td class="num">${pzFmt(r.dia)}</td><td>${esc(hrNome(r.user_id))}</td><td>${esc(hrCli(r.diagnostico_id))}</td><td class="r num">${hrH(r.minutos)}</td><td class="r num">${hrHora(r.primeiro)}</td><td class="r num">${hrHora(r.ultimo)}</td></tr>`).join('')}
    </tbody></table></div></section>`}
   <section class="block hr-como"><div class="block-h"><h3>Como as horas são contadas</h3></div>
    <ul><li>Conta 1 minuto a cada minuto em que a pessoa está com o sistema aberto na tela e usou mouse, teclado, rolagem ou toque nos últimos 5 minutos.</li>
    <li>Aba escondida, computador parado ou sem internet não contam. Várias abas abertas contam uma vez só.</li>
    <li>O minuto vai para o cliente que está aberto na hora. Sem cliente aberto, entra em "Fora de um cliente".</li>
    <li>Conta só a equipe LORSO (você e os funcionários). Os registros começaram em 17/10/2026.</li></ul></section>
  </section>`;
}

function hrCsv(){
  const [a,b]=hrPeriodo(); const L=(HR.dados||[]).filter(r=>!HR.pessoa||r.user_id===HR.pessoa);
  const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
  const linhas=[['Dia','Pessoa','Cliente','Minutos','Horas (decimal)','Primeiro uso','Último uso'].map(q).join(';')]
    .concat(L.slice().sort((x,y)=>x.dia.localeCompare(y.dia)).map(r=>[pzFmt(r.dia),hrNome(r.user_id),hrCli(r.diagnostico_id),r.minutos,hrDec(r.minutos),hrHora(r.primeiro),hrHora(r.ultimo)].map(q).join(';')));
  const blob=new Blob(['﻿'+linhas.join('\r\n')],{type:'text/csv;charset=utf-8'});
  const u=URL.createObjectURL(blob), el=document.createElement('a'); el.href=u; el.download=`horas-equipe-lorso_${a}_a_${b}.csv`; document.body.appendChild(el); el.click(); el.remove(); setTimeout(()=>URL.revokeObjectURL(u),2000);
}

function horasClick(act,d){
  if(act==='hr-per'){ HR.per=d.v; HR.dados=null; render(); return true; }
  if(act==='hr-csv'){ hrCsv(); return true; }
  return false;
}
document.addEventListener('change',e=>{
  const t=e.target; if(!t||!t.id) return;
  if(t.id==='hr-pessoa'){ HR.pessoa=t.value; render(); }
  if(t.id==='hr-de'||t.id==='hr-ate'){ HR[t.id==='hr-de'?'de':'ate']=t.value; HR.dados=null; render(); }
});
