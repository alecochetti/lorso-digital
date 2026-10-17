/* =====================================================================
   Prazo do projeto
   Início do trabalho, entrega prevista e cada prorrogação com o motivo.
   O cliente acompanha; só a equipe LORSO define e muda (o banco também barra).
   Não entra em nenhuma nota nem cálculo do diagnóstico.
   ===================================================================== */
const PZ_DIA=864e5;
const pzData=s=>{ if(!s) return null; const [y,m,d]=String(s).slice(0,10).split('-').map(Number); return new Date(y,m-1,d); };
const pzHoje=()=>{ const t=new Date(); return new Date(t.getFullYear(),t.getMonth(),t.getDate()); };
const pzFmt=s=>{ const d=pzData(s); return d?d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'}):'—'; };
const pzCurto=s=>{ const d=pzData(s); return d?d.toLocaleDateString('pt-BR',{day:'numeric',month:'short'}).replace('.',''):'—'; };
const pzDias=(a,b)=>Math.round((b-a)/PZ_DIA);
const pzEquipe=()=>me&&me.papel!=='cliente';
let pzEdit=false, pzSalvando=false;

function prazoDe(c){ return (c&&c.prazo)||{inicio:'',fim:'',hist:[]}; }

/* coleta: o mesmo número dos indicadores da Visão geral */
function pzColeta(){ let t=0,a=0; AREAS.forEach(x=>{ t+=x.q.length; a+=x.q.filter(q=>cur.resp[q[0]]!=null).length; }); return t?a/t:0; }

function prazoHtml(){
  if(!cur) return '';
  const P=prazoDe(cur), eq=pzEquipe();
  if(pzEdit&&eq) return pzForm(P);
  if(!P.inicio||!P.fim){
    if(!eq) return '';
    return `<section class="block pz pz-vazio"><div class="block-h"><h3>Prazo do projeto</h3><p>O cliente vê o início, a entrega prevista e cada prorrogação.</p></div>
      <p class="muted" style="margin:0">Ainda sem datas. Defina quando o trabalho começou e quando a entrega está prevista.</p>
      <div><button class="btn primary" data-act="pz-editar">Definir prazo</button></div></section>`;
  }
  const ini=pzData(P.inicio), fim=pzData(P.fim), hoje=pzHoje();
  const total=Math.max(1,pzDias(ini,fim)), passou=pzDias(ini,hoje), falta=pzDias(hoje,fim);
  const tempo=Math.min(1,Math.max(0,passou/total)), col=pzColeta();
  const hist=(P.hist||[]).filter(h=>h&&h.para);
  const orig=hist.length?hist[0].de:null;
  const situ = hoje<ini ? `Começa em ${pl(pzDias(hoje,ini),'dia','dias')}`
    : falta>0 ? `Dia ${passou+1} de ${total}` : falta===0 ? 'Entrega prevista para hoje' : `Entrega prevista passou há ${pl(-falta,'dia','dias')}`;
  const big = hoje<ini ? pzDias(hoje,ini) : Math.max(0,falta);
  const bigTxt = hoje<ini ? (big===1?'dia para começar':'dias para começar') : falta<0 ? 'prazo vencido' : (big===1?'dia para a entrega':'dias para a entrega');
  const atras = hoje>=ini && tempo-col>=0.15 && col<1;
  return `<section class="block pz"><div class="block-h"><h3>Prazo do projeto</h3>${eq?`<button class="btn sm" data-act="pz-editar">Editar prazo</button>`:`<p>Definido pela LORSO</p>`}</div>
   <div class="pz-grid">
    <div class="pz-linha">
     <div class="pz-tempo" role="img" aria-label="${Math.round(tempo*100)}% do prazo já passou">
      <span class="pz-fill" style="width:${(tempo*100).toFixed(1)}%"></span>
      <span class="pz-hoje" style="left:${(tempo*100).toFixed(1)}%"><i></i><b>Hoje</b></span>
     </div>
     <div class="pz-marcos"><span><small>Início</small><b>${pzFmt(P.inicio)}</b></span><span class="pz-sit">${esc(situ)}</span><span style="text-align:right"><small>Entrega prevista</small><b>${pzFmt(P.fim)}</b></span></div>
     <div class="pz-barras">
      <div><span>Tempo do prazo</span><span class="pz-b"><i style="width:${Math.round(tempo*100)}%"></i></span><b>${Math.round(tempo*100)}%</b></div>
      ${temMod('diagnostico')?`<div><span>Coleta do diagnóstico</span><span class="pz-b pz-b2"><i style="width:${Math.round(col*100)}%"></i></span><b>${Math.round(col*100)}%</b></div>`:''}
     </div>
     ${atras&&temMod('diagnostico')?`<p class="pz-aviso"><span class="i">!</span><span>A coleta está em ${Math.round(col*100)}% com ${Math.round(tempo*100)}% do prazo já usado. Respostas e entrevistas em dia mantêm a entrega na data.</span></p>`:''}
    </div>
    <div class="pz-cont"><b>${big}</b><span>${bigTxt}</span></div>
   </div>
   ${hist.length?`<details class="pz-hist"><summary>Prazo prorrogado ${pl(hist.length,'vez','vezes')}${orig?` · entrega original ${pzFmt(orig)}`:''}</summary>
     <ol>${hist.slice().reverse().map(h=>`<li><b>${pzFmt(h.de)} → ${pzFmt(h.para)}</b><span>${esc(h.motivo||'Sem motivo registrado')}</span><small>Registrado em ${new Date(h.em).toLocaleDateString('pt-BR')}${h.por?' por '+esc(h.por):''}</small></li>`).join('')}</ol></details>`:''}
  </section>`;
}

function pzForm(P){
  return `<section class="block pz"><div class="block-h"><h3>Prazo do projeto</h3><p>O cliente vê estas datas e o histórico. Só a equipe LORSO muda.</p></div>
   <div class="pz-form">
    <label class="field"><span class="lbl">Início do trabalho</span><input type="date" id="pz-ini" value="${esc(P.inicio||'')}"></label>
    <label class="field"><span class="lbl">Entrega prevista</span><input type="date" id="pz-fim" value="${esc(P.fim||'')}"></label>
    <label class="field pz-mot"><span class="lbl">Motivo da mudança de entrega${P.fim?' (obrigatório se a data mudar)':''}</span><input id="pz-mot" placeholder="Ex.: ampliação do escopo para incluir a pós-graduação"></label>
   </div>
   ${P.fim?`<p class="muted" style="font-size:13px;margin:0">Mudar a entrega prevista registra a prorrogação no histórico, com a data antiga, a nova e o motivo.</p>`:''}
   <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary" data-act="pz-salvar" ${pzSalvando?'disabled':''}>${pzSalvando?'Salvando…':'Salvar prazo'}</button><button class="btn" data-act="pz-cancelar">Cancelar</button></div>
  </section>`;
}

async function pzSalvar(){
  const P=prazoDe(cur), ini=($('#pz-ini')||{}).value||'', fim=($('#pz-fim')||{}).value||'', mot=(($('#pz-mot')||{}).value||'').trim();
  if(!ini||!fim){ toast('Preencha o início e a entrega prevista'); return; }
  if(pzData(fim)<pzData(ini)){ toast('A entrega prevista precisa ser depois do início'); return; }
  const hist=(P.hist||[]).slice();
  if(P.fim&&P.fim!==fim){
    if(!mot){ toast('Escreva o motivo da mudança de entrega'); const el=$('#pz-mot'); if(el) el.focus(); return; }
    hist.push({de:P.fim,para:fim,motivo:mot,em:new Date().toISOString(),por:me?(me.nome||me.email):''});
  }
  pzSalvando=true; render();
  const r=await sb.from('diagnosticos').update({inicio_projeto:ini,fim_previsto:fim,prazo_historico:hist}).eq('id',cur.id);
  pzSalvando=false;
  if(r.error){ toast('Não foi possível salvar o prazo: '+r.error.message); render(); return; }
  cur.prazo={inicio:ini,fim,hist}; pzEdit=false; render(); toast(P.fim&&P.fim!==fim?'Prazo prorrogado e registrado no histórico':'Prazo salvo');
}

function prazoClick(act){
  if(act==='pz-editar'){ pzEdit=true; render(); return true; }
  if(act==='pz-cancelar'){ pzEdit=false; render(); return true; }
  if(act==='pz-salvar'){ pzSalvar(); return true; }
  return false;
}
