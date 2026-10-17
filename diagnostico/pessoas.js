/* =====================================================================
   Pessoas ouvidas
   Um cadastro por pessoa: foto, cargo, departamento, jornada, regime e
   as frentes de captação em que atua. Cada entrevista por área aponta
   para a pessoa, então ela é cadastrada uma vez e ouvida em várias áreas.
   A foto aparece no PDI, no modo entrevista e no relatório.
   ===================================================================== */
ICO.pessoas=ICO.equipe;
const P_REGIME=['CLT','PJ','Estágio','Terceirizado','Outro'];
const P_PERIODO=['Manhã','Tarde','Noite','Integral','Flexível'];
const P_FRENTES=()=>[...UNS.map(u=>[u.id,u.nome]),['institucional','Institucional'],['outros','Curta duração e extensão']];
const pNorm=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
let pAberta=null, pFiltro='', pBusca='';

function pessoaDe(e){ if(!cur||!e) return null; return (e.pid&&cur.pessoas.find(p=>p.id===e.pid))||(e.nome&&cur.pessoas.find(p=>pNorm(p.nome)===pNorm(e.nome)))||null; }
function pessoaPorNome(nome){ return cur&&nome?cur.pessoas.find(p=>pNorm(p.nome)===pNorm(nome))||null:null; }
function pAvatar(p,cls){ const nm=p?p.nome:''; return p&&p.foto?`<img class="pav ${cls||''}" src="${p.foto}" alt="Foto de ${esc(nm)}">`:`<span class="pav ini ${cls||''}" aria-hidden="true">${esc(initials(nm||'?'))}</span>`; }
const pAvatarNome=(nome,cls)=>pAvatar(pessoaPorNome(nome)||{nome},cls);
const pAreas=p=>[...new Set(cur.entrevistas.filter(e=>pessoaDe(e)===p).map(e=>e.area))].filter(Boolean);
function pJornada(p){ return [p.horas?`${p.horas}h por semana`:'',p.periodo,p.regime,p.tempo?`${p.tempo} na casa`:''].filter(Boolean).join(' · '); }
const pFrenteNome=id=>(P_FRENTES().find(f=>f[0]===id)||[,id])[1];

/* foto: corta em quadrado e reduz para 320 px (cerca de 20 KB) */
function pFoto(file){ return new Promise((ok,erro)=>{ if(!file||!/^image\//.test(file.type)) return erro(new Error('escolha uma imagem'));
  const url=URL.createObjectURL(file), img=new Image();
  img.onload=()=>{ const s=Math.min(img.width,img.height), c=document.createElement('canvas'); c.width=c.height=320; const g=c.getContext('2d');
    g.drawImage(img,(img.width-s)/2,(img.height-s)/2.6,s,s,0,0,320,320); URL.revokeObjectURL(url); ok(c.toDataURL('image/jpeg',0.82)); };
  img.onerror=()=>{ URL.revokeObjectURL(url); erro(new Error('não foi possível ler a imagem')); }; img.src=url; }); }

/* mantém as entrevistas ligadas iguais ao cadastro */
function pSincronizar(p){ cur.entrevistas.forEach(e=>{ if(e.pid===p.id){ e.nome=p.nome; e.cargo=p.cargo; e.mkt=p.mkt; if(p.depto) e.depto=p.depto; } }); }
function pNova(dados){ const p={id:uid(),nome:'',cargo:'',depto:'',foto:'',email:'',tel:'',regime:'',horas:'',periodo:'',frentes:[],tempo:'',gestor:'',mkt:false,obs:'',...dados}; cur.pessoas.push(p); return p; }
function pSemCadastro(){ const m=new Map(); cur.entrevistas.filter(e=>e.nome&&!pessoaDe(e)).forEach(e=>{ const k=pNorm(e.nome); if(!m.has(k)) m.set(k,e); }); return [...m.values()]; }

/* ---------- tela ---------- */
function renderPessoas(){
  const F=P_FRENTES(), L=cur.pessoas.filter(p=>(!pFiltro||(pFiltro==='mkt'?p.mkt:p.frentes.includes(pFiltro)))&&(!pBusca||pNorm(p.nome+' '+p.cargo+' '+p.depto).includes(pNorm(pBusca)))).sort((a,b)=>(a.nome||'').localeCompare(b.nome||''));
  const sem=pSemCadastro(), semFoto=cur.pessoas.filter(p=>!p.foto).length;
  $('#main').innerHTML=`<section class="panel">
   <header class="ph" style="grid-template-columns:minmax(0,1fr) auto"><div><span class="eyebrow">Passo 3 · <b>Entrevistas</b></span><h2 style="margin-top:8px">Pessoas ouvidas</h2><p class="lead">Cadastre cada pessoa uma vez, com foto, cargo, jornada e as frentes de captação em que atua. Depois é só escolher a pessoa em cada área. A foto aparece no modo entrevista e no relatório${me&&me.papel!=='cliente'?', e também no PDI':''}.</p></div>
    <div><button class="btn primary" data-act="pes-nova">+ Pessoa</button></div></header>
   <div class="stats bu-k"><div class="stat"><b>${cur.pessoas.length}</b><span>pessoas cadastradas</span></div><div class="stat"><b>${cur.pessoas.filter(p=>pAreas(p).length).length}</b><span>já ouvidas em alguma área</span></div><div class="stat"><b>${cur.pessoas.filter(p=>p.mkt).length}</b><span>do time de marketing${me&&me.papel!=='cliente'?' (PDI)':''}</span></div><div class="stat ${semFoto?'warn':''}"><b>${semFoto}</b><span>sem foto</span></div></div>
   ${sem.length?`<p class="pz-aviso"><span class="i">!</span><span>${pl(sem.length,'nome das entrevistas ainda não tem','nomes das entrevistas ainda não têm')} cadastro: ${sem.slice(0,6).map(e=>esc(e.nome)).join(', ')}${sem.length>6?'…':''}. <button class="btn sm" data-act="pes-importar">Cadastrar a partir das entrevistas</button></span></p>`:''}
   <section class="block hr-filtros"><div class="seg" role="group" aria-label="Filtrar por frente"><button class="${!pFiltro?'on':''}" data-act="pes-filtro" data-v="">Todas</button>${F.map(([id,nm])=>`<button class="${pFiltro===id?'on':''}" data-act="pes-filtro" data-v="${id}">${nm}</button>`).join('')}<button class="${pFiltro==='mkt'?'on':''}" data-act="pes-filtro" data-v="mkt">Marketing</button></div>
    <label class="field"><span class="lbl">Buscar</span><input id="pes-busca" value="${esc(pBusca)}" placeholder="Nome, cargo ou departamento"></label></section>
   ${L.length?`<div class="pgrid">${L.map(p=>{ const ar=pAreas(p); return `<button class="pcard2" data-act="pes-abrir" data-v="${p.id}">${pAvatar(p,'g')}<div class="pc-t"><b>${esc(p.nome||'Sem nome')}</b><small>${esc([p.cargo,p.depto].filter(Boolean).join(' · ')||'Cargo não informado')}</small>
      ${p.frentes.length?`<span class="pc-f">${p.frentes.map(f=>`<span class="tag area">${esc(pFrenteNome(f))}</span>`).join('')}</span>`:''}
      ${pJornada(p)?`<span class="pc-j">${esc(pJornada(p))}</span>`:''}
      <span class="pc-a">${ar.length?`Ouvida em ${ar.map(a=>esc(nameOf(a))).join(', ')}`:'Ainda não ouvida'}${p.mkt?' · <b>MKT</b>':''}</span></div></button>`; }).join('')}</div>`
     :`<section class="block"><p class="empty">${cur.pessoas.length?'Ninguém com esse filtro.':'Ninguém cadastrado ainda. Comece pela lista de quem vai ser ouvido: reitoria, coordenações das UNs, marketing e áreas de apoio.'}</p></section>`}
   ${pDrawer()}
  </section>`;
}

function pDrawer(){
  const p=pAberta&&cur.pessoas.find(x=>x.id===pAberta); if(!p) return '';
  const inp=(f,l,ph,tipo)=>`<label>${l}<input data-pes="${p.id}" data-f="${f}" value="${esc(p[f]||'')}" placeholder="${ph||''}" ${tipo?`inputmode="${tipo}"`:''}></label>`;
  const sel=(f,l,ops)=>`<label>${l}<select data-pes="${p.id}" data-f="${f}"><option value=""></option>${ops.map(o=>`<option ${p[f]===o?'selected':''}>${o}</option>`).join('')}</select></label>`;
  const ar=pAreas(p);
  return `<div class="drawer-back" data-act="pes-fechar"></div><aside class="drawer pesd" role="dialog" aria-label="Cadastro de ${esc(p.nome||'pessoa')}">
   <div class="dh"><span class="eyebrow"><b>Pessoa ouvida</b></span><button class="xbtn" data-act="pes-fechar" aria-label="Fechar">×</button></div>
   <div class="pfoto"><label class="pfoto-l" title="Escolher foto">${pAvatar(p,'xl')}<input type="file" accept="image/*" id="pes-foto" data-v="${p.id}" hidden><span>${p.foto?'Trocar foto':'Adicionar foto'}</span></label>${p.foto?`<button class="btn sm" data-act="pes-sem-foto" data-v="${p.id}">Tirar foto</button>`:''}</div>
   <div class="dgrid">${inp('nome','Nome','Nome completo')}${inp('cargo','Cargo','Ex.: Coordenadora de marketing')}${inp('depto','Departamento','Ex.: Marketing')}${inp('gestor','Responde para','Nome do gestor')}
    ${sel('regime','Regime',P_REGIME)}${inp('horas','Jornada (horas por semana)','40','decimal')}${sel('periodo','Período',P_PERIODO)}${inp('tempo','Tempo na instituição','Ex.: 3 anos')}
    ${inp('email','E-mail','')}${inp('tel','Telefone','','tel')}</div>
   <div class="dsec"><b>Frentes de captação em que atua</b><div class="pchips">${P_FRENTES().map(([id,nm])=>`<label class="mktag ${p.frentes.includes(id)?'on':''}"><input type="checkbox" data-pes="${p.id}" data-frente="${id}" ${p.frentes.includes(id)?'checked':''}> ${nm}</label>`).join('')}</div></div>
   <div class="dsec"><label class="mktag ${p.mkt?'on':''}"><input type="checkbox" data-pes="${p.id}" data-f="mkt" ${p.mkt?'checked':''}> Faz parte do time de marketing${me&&me.papel!=='cliente'?' (entra no PDI)':''}</label></div>
   <div class="dsec"><b>Observações</b><textarea data-pes="${p.id}" data-f="obs" rows="3" placeholder="Como é a rotina, o que mais ocupa o tempo, com quem conversa no dia a dia">${esc(p.obs||'')}</textarea></div>
   <div class="dsec"><b>Entrevistas</b>${ar.length?`<p class="muted" style="margin:0">Ouvida em ${ar.map(a=>esc(nameOf(a))).join(', ')}.</p>`:'<p class="muted" style="margin:0">Ainda não ouvida. Escolha a pessoa em Entrevistados, dentro da área.</p>'}</div>
   <div style="display:flex;justify-content:space-between;gap:8px;padding-bottom:18px"><button class="btn" data-act="pes-del" data-v="${p.id}">Excluir cadastro</button><button class="btn primary" data-act="pes-fechar">Pronto</button></div>
  </aside>`;
}

/* ---------- entrevistados da área: escolher pessoa cadastrada ---------- */
function pEscolherHtml(areaId){
  const ja=new Set(cur.entrevistas.filter(e=>e.area===areaId).map(e=>(pessoaDe(e)||{}).id).filter(Boolean));
  const L=cur.pessoas.filter(p=>p.nome&&!ja.has(p.id)).sort((a,b)=>(a.nome||'').localeCompare(b.nome||''));
  return `<div class="pesc">${L.length?`<select id="pes-add-${areaId}" data-pes-area="${areaId}" aria-label="Adicionar pessoa cadastrada"><option value="">+ Pessoa já cadastrada…</option>${L.map(p=>`<option value="${p.id}">${esc(p.nome)}${p.cargo?' · '+esc(p.cargo):''}</option>`).join('')}</select>`:''}<button class="btn sm" data-act="pes-nova" data-area="${areaId}">+ Nova pessoa</button></div>`;
}

function pessoasClick(act,d){
  if(act==='pes-nova'){ const p=pNova({}); if(d.area){ cur.entrevistas.push({id:uid(),area:d.area,nome:'',cargo:'',depto:nameOf(d.area),data:today(),mkt:false,pid:p.id}); } pAberta=p.id; if(ui.view!=='pessoas'&&!d.area) ui.view='pessoas'; touch(true); setTimeout(()=>{ const el=document.querySelector(`[data-pes="${p.id}"][data-f="nome"]`); if(el) el.focus(); },60); return true; }
  if(act==='pes-abrir'){ pAberta=d.v; render(); return true; }
  if(act==='pes-fechar'){ pAberta=null; render(); return true; }
  if(act==='pes-filtro'){ pFiltro=d.v; render(); return true; }
  if(act==='pes-del'){ const p=cur.pessoas.find(x=>x.id===d.v); if(!p) return true; cur.entrevistas.forEach(e=>{ if(e.pid===p.id) e.pid=''; }); cur.pessoas=cur.pessoas.filter(x=>x.id!==p.id); pAberta=null; touch(true); toast('Cadastro excluído. As entrevistas continuam com o nome.'); return true; }
  if(act==='pes-sem-foto'){ const p=cur.pessoas.find(x=>x.id===d.v); if(p){ p.foto=''; touch(true); } return true; }
  if(act==='pes-importar'){ let n=0; pSemCadastro().forEach(e=>{ const p=pNova({nome:e.nome.trim(),cargo:e.cargo||'',depto:e.depto||'',mkt:cur.entrevistas.some(x=>pNorm(x.nome)===pNorm(e.nome)&&x.mkt)}); cur.entrevistas.forEach(x=>{ if(pNorm(x.nome)===pNorm(e.nome)) x.pid=p.id; }); n++; }); touch(true); toast(`${pl(n,'pessoa cadastrada','pessoas cadastradas')}`); return true; }
  if(act==='pes-ver'){ ui.view='pessoas'; pAberta=d.v||null; render(); window.scrollTo({top:0}); return true; }
  return false;
}

document.addEventListener('input',e=>{ const t=e.target; if(!t||!t.dataset) return;
  if(t.id==='pes-busca'){ pBusca=t.value; clearTimeout(pessoasClick.t); pessoasClick.t=setTimeout(()=>{ render(); const el=document.getElementById('pes-busca'); if(el){ el.focus(); el.setSelectionRange(el.value.length,el.value.length); } },250); return; }
  if(t.dataset.pes&&t.dataset.f&&t.type!=='checkbox'&&t.tagName!=='SELECT'){ const p=cur.pessoas.find(x=>x.id===t.dataset.pes); if(!p) return; p[t.dataset.f]=t.value; pSincronizar(p); touch(false); }
});
document.addEventListener('change',async e=>{ const t=e.target; if(!t||!t.dataset||!cur) return;
  if(t.id==='pes-foto'&&t.files&&t.files[0]){ const p=cur.pessoas.find(x=>x.id===t.dataset.v); try{ p.foto=await pFoto(t.files[0]); touch(true); toast('Foto salva'); }catch(er){ toast(er.message); } return; }
  if(t.dataset.pesArea){ const p=cur.pessoas.find(x=>x.id===t.value); if(!p) return; cur.entrevistas.push({id:uid(),area:t.dataset.pesArea,nome:p.nome,cargo:p.cargo,depto:p.depto||nameOf(t.dataset.pesArea),data:today(),mkt:p.mkt,pid:p.id}); touch(true); return; }
  if(t.dataset.pes&&t.dataset.frente){ const p=cur.pessoas.find(x=>x.id===t.dataset.pes); if(!p) return; p.frentes=t.checked?[...new Set([...p.frentes,t.dataset.frente])]:p.frentes.filter(f=>f!==t.dataset.frente); touch(true); return; }
  if(t.dataset.pes&&t.dataset.f){ const p=cur.pessoas.find(x=>x.id===t.dataset.pes); if(!p) return; p[t.dataset.f]=t.type==='checkbox'?t.checked:t.value; pSincronizar(p); const fazRender=t.type==='checkbox'||t.tagName==='SELECT'; touch(fazRender); return; }
  // nome digitado em Entrevistados: liga à pessoa cadastrada com o mesmo nome
  if(t.dataset.ent!=null&&t.dataset.f==='nome'){ const en=cur.entrevistas[+t.dataset.ent]; if(!en) return; const p=pessoaPorNome(en.nome); if(p&&en.pid!==p.id){ en.pid=p.id; en.cargo=en.cargo||p.cargo; en.mkt=p.mkt; touch(true); } }
});
