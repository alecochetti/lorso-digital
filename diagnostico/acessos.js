/* =====================================================================
   Equipe e acessos (só administrador)
   Convidar pessoas da LORSO com nome completo e e-mail, escolher o tipo
   (Administrador ou Equipe) e, para a Equipe, o nível em cada cliente:
   Sem acesso, Visualização ou Editor. Desativar e reativar pessoas.
   Quem vê o quê é garantido no banco (can_access / can_write).
   ===================================================================== */
const AC_NIVEIS=[['','Sem acesso'],['leitura','Visualização'],['editor','Editor']];
const acUi={nome:'',email:'',funcao:'',tipo:'equipe',acessos:{}};
const acClientes=()=>Object.values(all).sort((a,b)=>String(a.nome).localeCompare(String(b.nome)));
const acNivel=(uid,d)=>{ const m=membros.find(x=>x.user_id===uid&&x.diagnostico_id===d); return m?(m.nivel||'editor'):''; };
const acLogo=d=>{ const lg=d.logo||(typeof logoArquivo==='function'?logoArquivo(d.id):''); const ini=typeof eqIniciais==='function'?eqIniciais(d.nome):String(d.nome||'?').slice(0,2).toUpperCase(); return lg?`<span class="logo-plate ac-lg"><img src="${esc(lg)}" alt="" data-ini="${esc(ini)}"></span>`:`<span class="mono">${esc(ini)}</span>`; };
const acSeg=(act,attrs,v)=>`<div class="seg ac-seg" role="group">${AC_NIVEIS.map(([k,l])=>`<button class="${v===k?'on':''}" data-act="${act}" ${attrs} data-v="${k}" aria-pressed="${v===k}">${l}</button>`).join('')}</div>`;

function renderAcessos(){
  if(!me||me.papel!=='admin'){ $('#main').innerHTML='<section class="panel"><p class="empty">Só administradores gerenciam a equipe e os acessos.</p></section>'; return; }
  const cli=acClientes();
  const staff=profiles.filter(p=>p.papel==='admin'||p.papel==='equipe').sort((a,b)=>(b.ativo?1:0)-(a.ativo?1:0)||String(a.nome||a.email).localeCompare(String(b.nome||b.email)));
  const pend=convites.filter(c=>c.papel!=='cliente');
  const linhaCli=(d,act,attrs,v)=>`<div class="ac-cli">${acLogo(d)}<b>${esc(d.nome)}</b>${acSeg(act,attrs,v)}</div>`;
  $('#main').innerHTML=`<section class="panel">
   <header class="ph" style="grid-template-columns:minmax(0,1fr)"><div><span class="eyebrow">LORSO · <b>Administração</b></span><h2 style="margin-top:8px">Equipe e acessos</h2><p class="lead">Convide pessoas da LORSO e defina o que cada uma acessa. Cada pessoa só enxerga os clientes liberados aqui. Isso vale no banco de dados, não só na tela.</p></div></header>
   <div class="ac-leg"><span><b>Administrador</b> vê todos os clientes e gerencia a equipe.</span><span><b>Editor</b> vê e altera o cliente.</span><span><b>Visualização</b> só vê o cliente, sem alterar nada.</span></div>

   <section class="block"><div class="block-h"><h3>Convidar pessoa da LORSO</h3><p>Depois de convidar, o texto do convite é copiado para você enviar.</p></div>
    <form id="f-ac-convite" class="ac-form" autocomplete="off">
     <div class="ac-campos">
      <label>Nome completo<input id="ac-nome" data-ac="nome" value="${esc(acUi.nome)}" required placeholder="Nome e sobrenome"></label>
      <label>E-mail<input id="ac-email" data-ac="email" type="email" value="${esc(acUi.email)}" required placeholder="pessoa@lorsodigital.com.br"></label>
      <label>Função<input id="ac-funcao" data-ac="funcao" value="${esc(acUi.funcao)}" placeholder="Ex.: analista de marketing"></label>
     </div>
     <div class="ac-tipo"><span class="lbl">Tipo de acesso</span><div class="seg" role="group">${[['equipe','Equipe'],['admin','Administrador']].map(([k,l])=>`<button type="button" class="${acUi.tipo===k?'on':''}" data-act="ac-tipo" data-v="${k}" aria-pressed="${acUi.tipo===k}">${l}</button>`).join('')}</div></div>
     ${acUi.tipo==='equipe'?`<div class="ac-clis"><span class="lbl">Clientes que vai atender</span>${cli.length?cli.map(d=>linhaCli(d,'ac-conv-nivel',`data-d="${d.id}"`,acUi.acessos[d.id]||'')).join(''):'<p class="muted">Nenhum cliente cadastrado ainda.</p>'}</div>`:`<p class="muted ac-nota">Administrador vê todos os clientes, convida e desativa pessoas.</p>`}
     <div class="ac-acoes"><button class="btn primary" type="submit">Convidar e copiar o convite</button></div>
    </form></section>

   ${pend.length?`<section class="block"><div class="block-h"><h3>Convites pendentes</h3><p>${pl(pend.length,'pessoa ainda não criou a senha','pessoas ainda não criaram a senha')}</p></div>
    <div class="ac-lista">${pend.map(c=>{ const ac=Array.isArray(c.acessos)?c.acessos:[]; return `<div class="ac-pess"><div class="ac-ph"><span class="av">${esc(initials(c.nome||c.email))}</span><span class="ac-id"><b>${esc(c.nome||c.email)}</b><small>${esc(c.email)}${c.funcao?' · '+esc(c.funcao):''}</small></span><span class="tag">${c.papel==='admin'?'Administrador':'Equipe'}</span></div>
      ${c.papel==='admin'?'<p class="muted ac-nota">Vai ver todos os clientes.</p>':`<p class="ac-resumo">${ac.length?ac.map(a=>`${esc((all[a.d]||{}).nome||'Cliente')}: ${a.n==='leitura'?'Visualização':'Editor'}`).join(' · '):c.diagnostico_id?esc((all[c.diagnostico_id]||{}).nome||'Cliente')+': Editor':'Nenhum cliente'}</p>`}
      <div class="ac-bt"><button class="btn sm" data-act="ac-conv-copiar" data-email="${esc(c.email)}">Copiar convite</button><button class="btn sm ghost" data-act="conv-del" data-email="${esc(c.email)}">Cancelar convite</button></div></div>`; }).join('')}</div></section>`:''}

   <section class="block"><div class="block-h"><h3>Equipe LORSO</h3><p>${pl(staff.filter(p=>p.ativo).length,'pessoa ativa','pessoas ativas')}</p></div>
    <div class="ac-lista">${staff.map(p=>{ const eu=p.id===me.id; return `<div class="ac-pess ${p.ativo?'':'off'}"><div class="ac-ph"><span class="av">${esc(initials(p.nome||p.email))}</span><span class="ac-id"><b>${esc(p.nome||p.email)}${eu?' <small class="muted">(você)</small>':''}</b><small>${esc(p.email)}${p.funcao?' · '+esc(p.funcao):''}</small></span>
       <select data-ac-papel="${p.id}" aria-label="Tipo de acesso de ${esc(p.nome||p.email)}" ${eu||!p.ativo?'disabled':''}><option value="equipe" ${p.papel==='equipe'?'selected':''}>Equipe</option><option value="admin" ${p.papel==='admin'?'selected':''}>Administrador</option></select>
       ${p.ativo?'':'<span class="tag">Desativada</span>'}</div>
      ${!p.ativo?'<p class="muted ac-nota">Sem acesso a nenhum cliente enquanto estiver desativada.</p>':p.papel==='admin'?'<p class="muted ac-nota">Administrador: vê todos os clientes.</p>':`<div class="ac-clis">${cli.map(d=>linhaCli(d,'ac-nivel',`data-u="${p.id}" data-d="${d.id}"`,acNivel(p.id,d.id))).join('')}</div>`}
      ${eu?'':`<div class="ac-bt">${p.ativo?`<button class="btn sm ghost" data-act="ac-ativo" data-u="${p.id}" data-v="0">Desativar acesso</button>`:`<button class="btn sm" data-act="ac-ativo" data-u="${p.id}" data-v="1">Reativar acesso</button>`}</div>`}</div>`; }).join('')}</div></section>
  </section>`;
}

/* ---------- eventos ---------- */
document.addEventListener('input',e=>{ const t=e.target; if(t&&t.dataset&&t.dataset.ac) acUi[t.dataset.ac]=t.value; },true);
document.addEventListener('change',async e=>{ const t=e.target; if(!t||!t.dataset||!t.dataset.acPapel) return; e.stopPropagation();
  const r=await sb.from('profiles').update({papel:t.value}).eq('id',t.dataset.acPapel);
  if(r.error){ toast('Não foi possível mudar o tipo de acesso: '+r.error.message); } else toast(t.value==='admin'?'Agora é administrador':'Agora é equipe');
  await loadTeam(); render(); },true);
document.addEventListener('submit',async e=>{ const f=e.target; if(!f||f.id!=='f-ac-convite') return; e.preventDefault(); e.stopPropagation();
  const email=String(acUi.email||'').trim().toLowerCase(), nome=String(acUi.nome||'').trim();
  if(!nome||!email){ toast('Preencha o nome completo e o e-mail'); return; }
  if(nome.split(/\s+/).length<2){ toast('Use o nome completo, com sobrenome'); return; }
  const acessos=Object.entries(acUi.acessos).filter(([,n])=>n).map(([d,n])=>({d,n}));
  if(acUi.tipo==='equipe'&&!acessos.length){ toast('Escolha ao menos um cliente para esta pessoa'); return; }
  if(profiles.some(p=>p.email===email)){ toast('Esta pessoa já tem acesso. Ajuste os clientes dela na lista abaixo.'); return; }
  const c={email,nome,funcao:String(acUi.funcao||'').trim()||null,papel:acUi.tipo==='admin'?'admin':'equipe',convidado_por:me.id,diagnostico_id:null,acessos:acUi.tipo==='admin'?[]:acessos};
  const r=await sb.from('convites').upsert(c); if(r.error){ toast('Não foi possível convidar: '+r.error.message); return; }
  Object.assign(acUi,{nome:'',email:'',funcao:'',tipo:'equipe',acessos:{}}); await loadTeam(); render(); copyText(conviteTexto(c),'Convite registrado e texto copiado'); },true);
function acessosClick(act,d){
  if(act==='ac-tipo'){ acUi.tipo=d.v; render(); return true; }
  if(act==='ac-conv-nivel'){ acUi.acessos[d.d]=d.v; render(); return true; }
  if(act==='ac-conv-copiar'){ const c=convites.find(x=>x.email===d.email); if(c) copyText(conviteTexto(c),'Texto do convite copiado'); return true; }
  if(act==='ac-nivel'){ (async()=>{ const atual=acNivel(d.u,d.d); if(atual===d.v) return; let r;
      if(!d.v) r=await sb.from('membros_diagnostico').delete().eq('user_id',d.u).eq('diagnostico_id',d.d);
      else if(atual) r=await sb.from('membros_diagnostico').update({nivel:d.v}).eq('user_id',d.u).eq('diagnostico_id',d.d);
      else r=await sb.from('membros_diagnostico').insert({user_id:d.u,diagnostico_id:d.d,nivel:d.v});
      if(r.error){ toast('Não foi possível mudar o acesso: '+r.error.message); return; }
      await loadTeam(); render(); toast(!d.v?'Acesso ao cliente removido':d.v==='leitura'?'Agora só visualiza este cliente':'Agora edita este cliente'); })(); return true; }
  if(act==='ac-ativo'){ (async()=>{ const r=await sb.from('profiles').update({ativo:d.v==='1'}).eq('id',d.u); if(r.error){ toast('Não foi possível mudar: '+r.error.message); return; } await loadTeam(); render(); toast(d.v==='1'?'Acesso reativado':'Acesso desativado'); })(); return true; }
  return false;
}
