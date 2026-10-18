/* =====================================================================
   PTC · Plano tático de comunicação (módulo da Central)
   Um documento por cliente na tabela modulos (modulo = 'ptc'):
   estratégias recorrentes que geram o calendário, peças com arte anexada,
   e o banco de mídia (links do Drive com fotos, vídeos e marca).
   As artes ficam no Storage, bucket 'ptc', na pasta do cliente:
   quem atende o cliente vê; só quem edita envia ou apaga.
   ===================================================================== */
const PT_CANAIS=[
  ['instagram','Instagram','#E1306C'],['tiktok','TikTok','#00A6A6'],['youtube','YouTube','#E52D27'],['linkedin','LinkedIn','#0A66C2'],
  ['facebook','Facebook','#6D5BD0'],['whatsapp','WhatsApp','#1F9D55'],['email','E-mail','#C27C0E'],['site','Site e blog','#64748B']];
/* formato: chave, canal, nome, especificação recomendada */
const PT_FORMATOS=[
  ['ig_feed','instagram','Post estático','Imagem 1080×1350 (4:5). Texto na arte curto; o resto vai na legenda.'],
  ['ig_carrossel','instagram','Carrossel','Até 20 cards de 1080×1350 (4:5). O primeiro card é a capa: promessa clara.'],
  ['ig_reels','instagram','Reels','Vídeo vertical 1080×1920 (9:16). Gancho nos 3 primeiros segundos; legenda na tela.'],
  ['ig_stories','instagram','Stories','Vertical 1080×1920 (9:16), até 60 s por story. Deixe livre o topo e a base da tela.'],
  ['ig_live','instagram','Live','Ao vivo. Combine a pauta e divulgue nos Stories antes.'],
  ['tt_video','tiktok','Vídeo','Vertical 1080×1920 (9:16). Gancho em 1 a 2 segundos; som em alta ajuda o alcance.'],
  ['tt_carrossel','tiktok','Carrossel de fotos','Fotos verticais 1080×1920 ou 1080×1350, até 35 imagens, com música.'],
  ['tt_live','tiktok','Live','Ao vivo.'],
  ['yt_shorts','youtube','Shorts','Vertical 1080×1920 (9:16), até 3 minutos.'],
  ['yt_video','youtube','Vídeo','Horizontal 1920×1080 (16:9), com capa de 1280×720.'],
  ['li_post','linkedin','Post','Imagem 1080×1350 ou 1200×1200, ou só texto.'],
  ['li_doc','linkedin','Carrossel em PDF','Documento em PDF com páginas de 1080×1350.'],
  ['li_video','linkedin','Vídeo','Vídeo vertical ou quadrado, com legenda na tela.'],
  ['fb_post','facebook','Post','Imagem 1080×1350 (4:5).'],
  ['fb_reels','facebook','Reels','Vertical 1080×1920 (9:16).'],
  ['wa_status','whatsapp','Status','Vertical 1080×1920 (9:16).'],
  ['wa_disparo','whatsapp','Disparo ou lista','Mensagem curta, com imagem 1080×1080 opcional e um link só.'],
  ['em_news','email','E-mail marketing','Peça com 600 px de largura e assunto de até 50 caracteres.'],
  ['site_artigo','site','Artigo ou página','Capa 1200×630 para quando o link for compartilhado.']];
const PT_ST=[['ideia','Ideia'],['producao','Em produção'],['aprovacao','Aguardando aprovação'],['aprovado','Aprovada'],['agendado','Agendado'],['publicado','Publicado']];
/* aprovação do cliente: Aprovado libera a peça; Revisar e Reprovado pedem comentário e devolvem a peça para quem produz */
const PT_DEC=[['aprovado','Aprovado'],['revisar','Revisar'],['reprovado','Reprovado']];
const ptVoltou=p=>p.aprov&&(p.aprov.st==='revisar'||p.aprov.st==='reprovado')&&p.status!=='aprovacao';
const ptAguardando=S=>S.pecas.filter(p=>p.status==='aprovacao');
const ptQuemSou=()=>me?(me.nome||me.email||''):'';
function ptRegistrar(p,st,coment){ const r={st,por:ptQuemSou(),em:new Date().toISOString(),coment:coment||''}; p.aprov=r; (p.aprovHist=p.aprovHist||[]).push(r); }
function ptEnviarAprov(p){ p.status='aprovacao'; ptRegistrar(p,'aguardando',''); }
function ptDecidir(p,st,coment){ ptRegistrar(p,st,coment); p.status=st==='aprovado'?'aprovado':st==='revisar'?'producao':'ideia'; }
const ptDataHora=iso=>{ try{ return new Date(iso).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).replace(',',' às'); }catch(e){ return ''; } };
const PT_DEC_NOME={aguardando:'Enviada para aprovação',aprovado:'Aprovada',revisar:'Pediu revisão',reprovado:'Reprovada'};
const PT_QUEM=[['lorso','LORSO'],['cliente','Cliente'],['juntos','Juntos']];
const PT_MIDIA=[['fotos','Fotos'],['videos','Vídeos'],['marca','Marca e logos'],['artes','Artes prontas'],['outro','Outro']];
const PT_DIAS=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const PT_DIAS_L=['domingo','segunda','terça','quarta','quinta','sexta','sábado'];
const PT_MESES=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const PT_TABS=[['calendario','Calendário'],['pecas','Peças'],['estrategias','Estratégias'],['midia','Banco de mídia']];

const ptCanal=k=>PT_CANAIS.find(c=>c[0]===k)||['','—','#94A3B8'];
const ptFmt=k=>PT_FORMATOS.find(f=>f[0]===k);
const ptFmtNome=k=>{ const f=ptFmt(k); return f?`${ptCanal(f[1])[1]} ${f[2]}`:''; };
const ptCanaisDe=fs=>[...new Set((fs||[]).map(k=>(ptFmt(k)||[])[1]).filter(Boolean))];
const ptStNome=s=>(PT_ST.find(x=>x[0]===s)||PT_ST[0])[1];
const ptQuemNome=s=>(PT_QUEM.find(x=>x[0]===s)||PT_QUEM[0])[1];
function ptUi(){ return ui.pt||(ui.pt={tab:'calendario',vis:'mes',dia:today(),mes:today().slice(0,7),canal:'',quem:'',st:'',aberta:null,est:null}); }
function ptNovo(){ return {v:1,estrategias:[],pecas:[],midia:[],updatedAt:0}; }
function ptDoc(){ if(!cur.mods) cur.mods={}; const S=cur.mods.ptc&&typeof cur.mods.ptc==='object'?cur.mods.ptc:ptNovo();
  ['estrategias','pecas','midia'].forEach(k=>{ if(!Array.isArray(S[k])) S[k]=[]; });
  S.pecas.forEach(p=>{ if(!Array.isArray(p.formatos)) p.formatos=[]; if(!Array.isArray(p.artes)) p.artes=[]; });
  return cur.mods.ptc=S; }
const ptPode=()=>!!(me&&cur&&!((me.papel==='cliente'&&cur.clienteLeitura)||(me.papel==='equipe'&&cur.meuNivel==='leitura')));
function ptMudou(full){ if(!ptPode()){ toast('Modo leitura: você só visualiza este plano'); render(); return; }
  const S=ptDoc(); S.updatedAt=Date.now(); modSave('ptc'); if(full) render(); }
const ptBRL=v=>(+v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0});
const ptDataBR=d=>d?d.slice(8,10)+'/'+d.slice(5,7):'';
const ptDiaSemana=d=>new Date(d+'T12:00:00').getDay();

/* ---------- calendário: peças + ocorrências previstas das estratégias ---------- */
function ptOcorrencias(S,de,ate){ const out=[];
  S.estrategias.filter(e=>e.ativa!==false&&(e.dias||[]).length).forEach(e=>{
    const ini=e.inicio||'2000-01-01'; const d=new Date((de>ini?de:ini)+'T12:00:00'); const fim=e.fim&&e.fim<ate?e.fim:ate;
    for(;isoLocal(d)<=fim;d.setDate(d.getDate()+1)){ const iso=isoLocal(d); if(!e.dias.includes(d.getDay())) continue;
      if(e.freq==='quinzenal'){ const sem=Math.floor((new Date(iso+'T12:00:00')-new Date(ini+'T12:00:00'))/(7*864e5)); if(sem%2) continue; }
      if(S.pecas.some(p=>p.est===e.id&&p.data===iso)) continue;
      out.push({virtual:true,id:'v:'+e.id+':'+iso,est:e.id,data:iso,titulo:e.nome,formatos:e.formatos||[],quem:e.quem||'lorso',status:'previsto'}); } });
  return out; }
function ptFiltra(L){ const f=ptUi(); return L.filter(p=>(!f.canal||ptCanaisDe(p.formatos).includes(f.canal))&&(!f.quem||p.quem===f.quem)&&(!f.st||(f.st==='voltou'?ptVoltou(p):p.status===f.st))); }
const PT_SIGLA={instagram:'IG',tiktok:'TT',youtube:'YT',linkedin:'in',facebook:'f',whatsapp:'WA',email:'@',site:'↗'};
const ptBadges=p=>ptCanaisDe(p.formatos).slice(0,3).map(c=>{ const k=ptCanal(c); return `<span class="pt-cb" style="background:${k[2]}" title="${esc(k[1])}">${PT_SIGLA[c]||''}</span>`; }).join('');
const ptStCls=p=>p.virtual?'prev':'st-'+p.status;
const ptTitulo=p=>`${(p.titulo||'Sem título')}${p.formatos.length?' · '+p.formatos.map(ptFmtNome).join(', '):''} · ${p.virtual?'Prevista pela estratégia':ptStNome(p.status)}`;
function ptChip(p){
  return `<button class="pt-chip ${ptStCls(p)}" data-act="${p.virtual?'pt-gerar':'pt-abrir'}" data-v="${esc(p.id)}" title="${esc(ptTitulo(p))}">
    <span class="pt-ct">${p.hora?`<b>${esc(p.hora)}</b>`:''}<span>${esc(p.titulo||(p.virtual?'Prevista':'Sem título'))}</span></span><span class="pt-cbs">${ptBadges(p)}</span></button>`; }
function ptCardSemana(p){ if(p.virtual) return `<button class="pt-wcard prev pt-wprev" data-act="pt-gerar" data-v="${esc(p.id)}" title="${esc(ptTitulo(p))}"><span class="pt-wh"><b>Prevista</b><span class="pt-cbs">${ptBadges(p)}</span></span><span class="pt-wt">${esc(p.titulo||'Peça prevista')}</span><small class="pt-wcta">Clique para criar a peça</small></button>`;
  const a=(p.artes||[]).find(x=>/^image\//.test(x.tipo||'')||/\.(png|jpe?g|webp|gif)$/i.test(x.nome||''));
  const fm=p.formatos.map(ptFmt).filter(Boolean).map(f=>f[2]);
  return `<button class="pt-wcard ${ptStCls(p)}" data-act="${p.virtual?'pt-gerar':'pt-abrir'}" data-v="${esc(p.id)}" title="${esc(ptTitulo(p))}">
    <span class="pt-wh">${p.hora?`<b>${esc(p.hora)}</b>`:`<b>${p.virtual?'Prevista':ptStNome(p.status)}</b>`}</span>
    <span class="pt-wimg">${a?`<img data-pt-arte="${esc(a.path)}" alt="">`:`<span class="pt-wsem">${p.virtual?'Clique para criar':'Sem arte ainda'}</span>`}
      ${fm.length?`<span class="pt-wfm">${esc(fm[0])}${fm.length>1?' +'+(fm.length-1):''}</span>`:''}<span class="pt-wcb">${ptBadges(p)}</span></span>
    <span class="pt-wt">${esc(p.titulo||(p.virtual?'Peça prevista':'Sem título'))}</span></button>`; }
function ptItensEntre(S,de,ate){ return ptFiltra(S.pecas.filter(p=>p.data&&p.data>=de&&p.data<=ate).concat(ptOcorrencias(S,de,ate)))
  .sort((a,b)=>(a.virtual?1:0)-(b.virtual?1:0)||String(a.hora||'99').localeCompare(String(b.hora||'99'))); }
function ptCalendario(S){ const f=ptUi(), hoje=today(), sem=f.vis==='semana';
  const ref=new Date((f.dia||hoje)+'T12:00:00'); const [y,m]=f.mes.split('-').map(Number);
  let ini,fim,titulo; if(sem){ ini=new Date(ref); ini.setDate(ref.getDate()-ref.getDay()); fim=new Date(ini); fim.setDate(ini.getDate()+6);
    titulo=ini.getMonth()===fim.getMonth()?`${ini.getDate()} a ${fim.getDate()} de ${PT_MESES[fim.getMonth()]}`:`${ini.getDate()} de ${PT_MESES[ini.getMonth()]} a ${fim.getDate()} de ${PT_MESES[fim.getMonth()]}`; }
  else { const d0=new Date(y,m-1,1,12); ini=new Date(d0); ini.setDate(1-d0.getDay()); const fm=new Date(y,m,0,12); fim=new Date(fm); fim.setDate(fm.getDate()+(6-fm.getDay())); titulo=`${PT_MESES[m-1]} de ${y}`; }
  const de=isoLocal(ini), ate=isoLocal(fim), itens=ptItensEntre(S,de,ate);
  const pde=sem?de:f.mes+'-01', pate=sem?ate:isoLocal(new Date(y,m,0,12));
  const doPer=S.pecas.filter(p=>p.data&&p.data>=pde&&p.data<=pate), pub=doPer.filter(p=>p.status==='publicado').length, verba=doPer.reduce((a,p)=>a+(p.impulsionar?(+p.verba||0):0),0), prev=ptOcorrencias(S,pde,pate).length;
  const ehHoje=sem?(hoje>=de&&hoje<=ate):f.mes===hoje.slice(0,7);
  let dias=''; for(const d=new Date(ini);d<=fim;d.setDate(d.getDate()+1)){ const iso=isoLocal(d), fora=!sem&&d.getMonth()!==m-1; const L=itens.filter(p=>p.data===iso);
    const add=ptPode()?`<button class="pt-add" data-act="pt-nova" data-v="${iso}" aria-label="Nova peça em ${ptDataBR(iso)}">+</button>`:'';
    dias+=sem?`<div class="pt-wdia ${iso===hoje?'hoje':''}"><div class="pt-dn"><span><small>${PT_DIAS[d.getDay()]}</small><b>${d.getDate()}</b></span>${add}</div>${L.map(ptCardSemana).join('')||'<span class="pt-wvaz"></span>'}</div>`
      :`<div class="pt-dia ${fora?'fora':''} ${iso===hoje?'hoje':''} ${L.length?'':'vazio'}"><div class="pt-dn"><span><b>${d.getDate()}</b><small>${PT_DIAS[d.getDay()]}, ${ptDataBR(iso)}</small></span>${add}</div>
     ${L.slice(0,3).map(ptChip).join('')}${L.length>3?`<button class="pt-mais" data-act="pt-semana" data-v="${iso}">+ ${L.length-3} ${L.length-3>1?'outras':'outra'}</button>`:''}</div>`; }
  return `<div class="pt-calbar"><div class="pt-mes"><div class="seg" role="group" aria-label="Visão"><button class="${sem?'on':''}" data-act="pt-vis" data-v="semana" aria-pressed="${sem}">Semana</button><button class="${sem?'':'on'}" data-act="pt-vis" data-v="mes" aria-pressed="${!sem}">Mês</button></div>
     <button class="btn sm" data-act="pt-mes" data-v="-1" aria-label="${sem?'Semana':'Mês'} anterior">‹</button><button class="btn sm ${ehHoje?'ghost':''}" data-act="pt-mes" data-v="0">Hoje</button><button class="btn sm" data-act="pt-mes" data-v="1" aria-label="Próxim${sem?'a semana':'o mês'}">›</button><h3 class="pt-per">${titulo}</h3></div>
    <div class="pt-resumo"><span><b>${doPer.length}</b> peças</span><span><b>${pub}</b> publicadas</span>${prev?`<span title="Previstas pelas estratégias e ainda não criadas"><b>${prev}</b> previstas</span>`:''}<span title="Soma da verba das peças marcadas para impulsionar"><b>${ptBRL(verba)}</b> em impulsionamento</span></div></div>
   <div class="${sem?'pt-sem':'pt-cal'}">${sem?'':PT_DIAS.map(x=>`<div class="pt-dh">${x}</div>`).join('')}${dias}</div>
   <p class="pt-leg"><span><i class="lg prev"></i>Prevista pela estratégia: clique para criar</span>${PT_ST.map(([k,n])=>`<span><i class="lg st-${k}"></i>${n}</span>`).join('')}</p>`; }

/* ---------- peças ---------- */
function ptThumb(a,cls){ const img=/^image\//.test(a.tipo||'')||/\.(png|jpe?g|webp|gif)$/i.test(a.nome||'');
  return img?`<img class="${cls||'pt-th'}" data-pt-arte="${esc(a.path)}" alt="${esc(a.nome||'Arte')}" loading="lazy">`:`<span class="${cls||'pt-th'} pt-doc">${/^video\//.test(a.tipo||'')?'Vídeo':/pdf/.test(a.tipo||'')?'PDF':'Arquivo'}</span>`; }
function ptAprovCel(p){ const A=p.aprov, f=ptUi();
  if(p.status==='aprovacao') return ptPode()?`<span class="pt-dec">${PT_DEC.map(([k,n])=>`<button class="pt-db d-${k} ${f.dec&&f.dec.id===p.id&&f.dec.st===k?'on':''}" data-act="pt-dec" data-v="${p.id}" data-st="${k}">${n}</button>`).join('')}</span>`:'<span class="pt-ap ag">Aguardando o cliente</span>';
  if(A&&A.st==='aprovado'&&p.status!=='ideia'&&p.status!=='producao') return `<span class="pt-ap ok">Aprovada<small>${esc(A.por||'')} · ${esc(ptDataHora(A.em))}</small></span>`;
  if(ptVoltou(p)) return `<span class="pt-ap ${A.st}" title="${esc(A.coment)}">${A.st==='revisar'?'Revisar':'Reprovada'}<small>${esc(A.coment.slice(0,60))}${A.coment.length>60?'…':''}</small></span>${ptPode()&&me&&me.papel!=='cliente'?`<button class="btn sm pt-reenv" data-act="pt-enviar" data-v="${p.id}">Reenviar para aprovação</button>`:''}`;
  if(ptPode()&&me&&me.papel!=='cliente'&&p.quem!=='cliente'&&(p.status==='ideia'||p.status==='producao')) return `<button class="btn sm" data-act="pt-enviar" data-v="${p.id}">Enviar para aprovação</button>`;
  return '<span class="muted">—</span>'; }
function ptDecForm(p){ const f=ptUi(); if(!f.dec||f.dec.id!==p.id) return '';
  const st=f.dec.st, ap=st==='aprovado';
  return `<form class="pt-decf d-${st}" data-ptform="dec" data-id="${p.id}" data-st="${st}"><b>${ap?'Aprovar esta peça':st==='revisar'?'O que precisa mudar?':'Por que esta peça foi reprovada?'}</b>
    ${ap?`<p class="muted">A peça fica liberada para o calendário, com o seu nome e a data de hoje.</p><input type="hidden" name="c" value="">`:`<textarea name="c" rows="3" required placeholder="${st==='revisar'?'Ex.: trocar a foto da capa e encurtar a legenda':'Ex.: o tema não combina com a fase do lançamento'}">${esc(f.dec.txt||'')}</textarea><p class="muted">O comentário é obrigatório. A peça volta para a LORSO ajustar.</p>`}
    <div class="pt-decb"><button type="button" class="btn sm ghost" data-act="pt-dec-x">Cancelar</button><button type="submit" class="btn sm primary">${ap?'Confirmar aprovação':st==='revisar'?'Pedir revisão':'Reprovar peça'}</button></div></form>`; }
function ptPecas(S){ const f=ptUi(); const L=ptFiltra(S.pecas.slice()).sort((a,b)=>String(a.data||'9999').localeCompare(String(b.data||'9999')));
  const futuras=L.filter(p=>p.status!=='publicado'), feitas=L.filter(p=>p.status==='publicado').reverse();
  const nAg=ptAguardando(S).length, nV=S.pecas.filter(ptVoltou).length, nAp=S.pecas.filter(p=>p.status==='aprovado').length;
  const chip=(v,t,n)=>`<button class="pt-fchip ${f.st===v?'on':''}" data-act="pt-st" data-v="${f.st===v?'':v}" aria-pressed="${f.st===v}">${t}<b>${n}</b></button>`;
  const linha=p=>{ const a=p.artes[0]; return `<div class="pt-linha ${f.dec&&f.dec.id===p.id?'com-dec':''}" data-act="pt-abrir" data-v="${p.id}">
    <span class="pt-lth">${a?ptThumb(a,'pt-limg'):'<span class="pt-limg pt-doc">Sem arte</span>'}<span class="pt-lcb">${ptBadges(p)}</span>${p.artes.length>1?`<span class="pt-lnum">${p.artes.length}</span>`:''}</span>
    <span class="pt-lt"><button class="pt-ltb" data-act="pt-abrir" data-v="${p.id}">${esc(p.titulo||'Sem título')}</button><small>${p.formatos.length?p.formatos.map(k=>esc(ptFmtNome(k))).join(' · '):'Formato a definir'}${p.legenda?` · ${esc(p.legenda.slice(0,90))}`:''}</small></span>
    <span class="pt-ld">${p.data?`<b>${PT_DIAS[ptDiaSemana(p.data)]}, ${ptDataBR(p.data)}</b><small>${p.hora?esc(p.hora):'sem hora'}</small>`:'<small>sem data</small>'}</span>
    <span class="pt-lq"><span class="tag">${esc(ptQuemNome(p.quem))}</span>${p.resp?`<small>${esc(p.resp)}</small>`:''}</span>
    <span class="pt-lst"><span class="pt-st st-${p.status}">${ptStNome(p.status)}</span>${p.impulsionar?`<small>Impulsionar ${p.verba?ptBRL(p.verba):''}</small>`:''}</span>
    <span class="pt-lap">${ptAprovCel(p)}</span></div>${ptDecForm(p)}`; };
  const cab='<div class="pt-lcab"><span>Arte</span><span>Peça</span><span>Data</span><span>Quem faz</span><span>Etapa</span><span>Aprovação</span></div>';
  return `<div class="pt-fchips">${chip('aprovacao','Aguardando aprovação',nAg)}${chip('voltou','Voltaram para ajuste',nV)}${chip('aprovado','Aprovadas',nAp)}</div>
   ${L.length?`${futuras.length?`<div class="pt-lista">${cab}${futuras.map(linha).join('')}</div>`:''}${feitas.length?`<h4 class="pt-sub">Publicadas</h4><div class="pt-lista">${cab}${feitas.map(linha).join('')}</div>`:''}`
    :`<p class="empty">${f.st==='aprovacao'?'Nenhuma peça esperando aprovação.':S.pecas.length?'Nenhuma peça com estes filtros.':'Nenhuma peça ainda. Crie uma aqui ou clique numa peça prevista no calendário.'}</p>`}`; }

/* ---------- estratégias ---------- */
function ptEstTexto(e){ const d=(e.dias||[]).slice().sort().map(i=>PT_DIAS_L[i]); if(!d.length) return 'Escolha os dias da semana';
  const lista=d.length>1?d.slice(0,-1).join(', ')+' e '+d[d.length-1]:d[0]; return (e.freq==='quinzenal'?'A cada 15 dias, ':'Toda ')+lista+(e.inicio?` · desde ${ptDataBR(e.inicio)}`:'')+(e.fim?` até ${ptDataBR(e.fim)}`:''); }
function ptEstrategias(S){
  return `<p class="muted pt-intro">Cada estratégia é uma regra que se repete (ex.: toda terça, corte da aula em Reels e TikTok). Ela preenche o calendário com as peças previstas.</p>
   ${S.estrategias.length?`<div class="pt-ests">${S.estrategias.map(e=>`<article class="pt-est ${e.ativa===false?'off':''}"><div><b>${esc(e.nome||'Sem nome')}</b><p>${esc(ptEstTexto(e))}</p>
     <div class="pt-tags">${(e.formatos||[]).map(k=>`<span class="tag"><i class="pt-dot" style="background:${ptCanal((ptFmt(k)||[])[1])[2]}"></i>${esc(ptFmtNome(k))}</span>`).join('')}<span class="tag">${esc(ptQuemNome(e.quem))}</span>${e.pilar?`<span class="tag">${esc(e.pilar)}</span>`:''}${e.ativa===false?'<span class="tag">Pausada</span>':''}</div></div>
     ${ptPode()?`<div class="pt-eacts"><button class="btn sm ghost" data-act="pt-est-pausa" data-v="${e.id}">${e.ativa===false?'Retomar':'Pausar'}</button><button class="btn sm" data-act="pt-est-abrir" data-v="${e.id}">Editar</button></div>`:''}</article>`).join('')}</div>`
   :'<p class="empty">Nenhuma estratégia ainda. Exemplo: “Corte da aula”, toda terça, Instagram Reels e TikTok.</p>'}`; }

/* ---------- banco de mídia ---------- */
function ptMidia(S){ const artes=[]; S.pecas.forEach(p=>p.artes.forEach(a=>artes.push({a,p}))); artes.sort((x,y)=>String(y.p.data||'').localeCompare(String(x.p.data||'')));
  return `<p class="muted pt-intro">Guarde aqui os links das pastas do Drive (fotos, vídeos, marca) para todo mundo achar no mesmo lugar. As artes enviadas nas peças aparecem logo abaixo, organizadas por peça.</p>
   ${ptPode()?`<form class="pt-mform" data-ptform="midia"><input name="nome" placeholder="Nome (ex.: Fotos do campus 2026)" required aria-label="Nome"><select name="tipo" aria-label="Tipo">${PT_MIDIA.map(([k,n])=>`<option value="${k}">${n}</option>`).join('')}</select><input name="url" type="url" placeholder="Link do Google Drive, Canva ou Dropbox" required aria-label="Link"><button class="btn primary" type="submit">Adicionar link</button></form>`:''}
   ${S.midia.length?`<div class="pt-mgrid">${S.midia.map(x=>`<div class="pt-mcard"><span class="pt-mt">${esc((PT_MIDIA.find(t=>t[0]===x.tipo)||PT_MIDIA[4])[1])}</span><b>${esc(x.nome)}</b><small>${esc(String(x.url).replace(/^https?:\/\//,'').slice(0,48))}</small>
     <div class="pt-mb"><a class="btn sm" href="${esc(x.url)}" target="_blank" rel="noopener">Abrir pasta</a>${ptPode()?`<button class="xbtn" data-act="pt-midia-del" data-v="${x.id}" aria-label="Remover ${esc(x.nome)}">×</button>`:''}</div></div>`).join('')}</div>`:'<p class="empty">Nenhum link ainda. Cole o link de uma pasta do Drive compartilhada com quem atende o cliente.</p>'}
   <h4 class="pt-sub">Artes das peças <span class="muted">${artes.length}</span></h4>
   ${artes.length?`<div class="pt-galeria">${artes.map(({a,p})=>`<button class="pt-gi" data-act="pt-abrir" data-v="${p.id}" title="${esc(p.titulo||'Peça')}">${ptThumb(a,'pt-gth')}<span><b>${esc(p.titulo||'Sem título')}</b><small>${p.data?ptDataBR(p.data)+' · ':''}${esc(a.nome||'')}</small></span></button>`).join('')}</div>`:'<p class="empty">As artes enviadas dentro de cada peça aparecem aqui.</p>'}`; }

/* ---------- painéis laterais ---------- */
function ptFmtPicker(sel,attr){ return `<div class="pt-fpick">${PT_CANAIS.map(([c,n,cor])=>{ const fs=PT_FORMATOS.filter(f=>f[1]===c); return `<div class="pt-fc"><span class="pt-fcn"><i style="background:${cor}"></i>${n}</span><span class="pt-fcb">${fs.map(f=>`<button type="button" class="pchip ${sel.includes(f[0])?'on':''}" data-act="pt-fmt" ${attr} data-v="${f[0]}" aria-pressed="${sel.includes(f[0])}">${esc(f[2])}</button>`).join('')}</span></div>`; }).join('')}</div>`; }
function ptDrawerPeca(S,p){ const e=S.estrategias.find(x=>x.id===p.est);
  return `<div class="drawer-back" data-act="pt-fechar"></div><aside class="drawer pt-drawer" role="dialog" aria-label="Peça"><div class="dh"><span class="eyebrow"><b>Peça</b>${e?` · ${esc(e.nome)}`:''}</span><button class="xbtn" data-act="pt-fechar" aria-label="Fechar">×</button></div>
   <textarea class="dtit" data-pt="titulo" rows="2" placeholder="Tema da peça (ex.: 3 erros na hora de escolher a pós)">${esc(p.titulo)}</textarea>
   <div class="dsec pt-aprovsec"><b>Aprovação do cliente</b><div class="pt-lap">${ptAprovCel(p)}</div>${ptDecForm(p)}
    ${(p.aprovHist||[]).length?`<ol class="pt-hist">${p.aprovHist.slice().reverse().map(h=>`<li class="h-${h.st}"><span><b>${esc(PT_DEC_NOME[h.st]||h.st)}</b> · ${esc(h.por||'')} · ${esc(ptDataHora(h.em))}</span>${h.coment?`<p>${esc(h.coment)}</p>`:''}</li>`).join('')}</ol>`:''}</div>
   <div class="dgrid"><label>Data<input type="date" data-pt="data" value="${esc(p.data||'')}"></label>
    <label>Etapa<select data-pt="status">${PT_ST.map(([k,n])=>`<option value="${k}" ${p.status===k?'selected':''}>${n}</option>`).join('')}</select></label>
    <label>Quem faz<select data-pt="quem">${PT_QUEM.map(([k,n])=>`<option value="${k}" ${p.quem===k?'selected':''}>${n}</option>`).join('')}</select></label>
    <label>Responsável<input data-pt="resp" value="${esc(p.resp||'')}" placeholder="Nome de quem produz"></label>
    <label>Estratégia<select data-pt="est"><option value="">Avulsa</option>${S.estrategias.map(x=>`<option value="${x.id}" ${p.est===x.id?'selected':''}>${esc(x.nome||'Sem nome')}</option>`).join('')}</select></label>
    <label>Hora<input type="time" data-pt="hora" value="${esc(p.hora||'')}"></label></div>
   <div class="dsec"><b>Onde vai sair</b>${ptFmtPicker(p.formatos,'data-alvo="peca"')}
    ${p.formatos.length?`<ul class="pt-specs">${p.formatos.map(k=>{ const f=ptFmt(k); return f?`<li><b>${esc(ptFmtNome(k))}</b>${esc(f[3])}</li>`:''; }).join('')}</ul>`:''}</div>
   <div class="dsec"><b>Artes</b>
    <div class="pt-artes">${p.artes.map((a,i)=>`<div class="pt-arte">${ptThumb(a,'pt-ath')}<span class="pt-an" title="${esc(a.nome)}">${esc(a.nome)}</span><span class="pt-ab"><button class="btn sm" data-act="pt-arte-baixar" data-i="${i}">Baixar</button>${ptPode()?`<button class="xbtn" data-act="pt-arte-del" data-i="${i}" aria-label="Apagar ${esc(a.nome)}">×</button>`:''}</span></div>`).join('')}</div>
    ${ptPode()?`<label class="pt-drop" data-pt-drop="1"><input type="file" id="pt-arq" multiple accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/quicktime,application/pdf"><span><b>Enviar artes</b> ou arraste os arquivos para cá</span><small>Imagens, vídeos e PDF de até 50 MB. Vídeos longos: use o link do Drive abaixo.</small></label>`:''}
    <label class="pt-lk">Link da arte ou da pasta (Drive, Canva)<input type="url" data-pt="link" value="${esc(p.link||'')}" placeholder="https://drive.google.com/…"></label>${p.link?`<a class="btn sm" href="${esc(p.link)}" target="_blank" rel="noopener">Abrir link</a>`:''}</div>
   <div class="dsec"><b>Legenda ou roteiro</b><textarea data-pt="legenda" rows="5" placeholder="Texto da legenda, roteiro do vídeo, CTA e hashtags">${esc(p.legenda||'')}</textarea></div>
   <div class="dsec"><b>Impulsionamento</b><div class="pt-imp"><label class="pt-ck"><input type="checkbox" data-pt="impulsionar" ${p.impulsionar?'checked':''}> Impulsionar esta peça</label>${p.impulsionar?`<label>Verba (R$)<input inputmode="decimal" data-pt="verba" value="${p.verba!=null?esc(String(p.verba)):''}" placeholder="0"></label>`:''}</div></div>
   <div class="dsec"><b>Publicação</b><label class="pt-lk">Link do post publicado<input type="url" data-pt="pub" value="${esc(p.pub||'')}" placeholder="Cole aqui quando for ao ar"></label></div>
   <div class="dfoot">${ptPode()?`<button class="btn ghost" data-act="pt-del" data-v="${p.id}">Excluir peça</button>`:'<span></span>'}<button class="btn primary" data-act="pt-fechar">Pronto</button></div></aside>`; }
function ptDrawerEst(S,e){
  return `<div class="drawer-back" data-act="pt-fechar"></div><aside class="drawer pt-drawer" role="dialog" aria-label="Estratégia"><div class="dh"><span class="eyebrow"><b>Estratégia recorrente</b></span><button class="xbtn" data-act="pt-fechar" aria-label="Fechar">×</button></div>
   <textarea class="dtit" data-pte="nome" rows="2" placeholder="Nome (ex.: Corte da aula, Depoimento de aluno)">${esc(e.nome)}</textarea>
   <div class="dsec"><b>Dias da semana</b><div class="pchips">${PT_DIAS.map((n,i)=>`<button class="pchip ${(e.dias||[]).includes(i)?'on':''}" data-act="pt-est-dia" data-v="${i}" aria-pressed="${(e.dias||[]).includes(i)}">${n}</button>`).join('')}</div><p class="muted pt-hint">${esc(ptEstTexto(e))}</p></div>
   <div class="dgrid"><label>Frequência<select data-pte="freq"><option value="semanal" ${e.freq!=='quinzenal'?'selected':''}>Toda semana</option><option value="quinzenal" ${e.freq==='quinzenal'?'selected':''}>A cada 15 dias</option></select></label>
    <label>Quem faz<select data-pte="quem">${PT_QUEM.map(([k,n])=>`<option value="${k}" ${e.quem===k?'selected':''}>${n}</option>`).join('')}</select></label>
    <label>Começa em<input type="date" data-pte="inicio" value="${esc(e.inicio||'')}"></label><label>Termina em<input type="date" data-pte="fim" value="${esc(e.fim||'')}"></label></div>
   <div class="dsec"><b>Onde vai sair</b>${ptFmtPicker(e.formatos||[],'data-alvo="est"')}</div>
   <div class="dsec"><b>Pilar ou objetivo</b><input class="pt-in" data-pte="pilar" value="${esc(e.pilar||'')}" placeholder="Ex.: autoridade, prova social, captação"></div>
   <div class="dsec"><b>Orientação para quem produz</b><textarea data-pte="obs" rows="3" placeholder="Como é a peça, referências, tom, CTA">${esc(e.obs||'')}</textarea></div>
   <div class="dfoot"><button class="btn ghost" data-act="pt-est-del" data-v="${e.id}">Excluir estratégia</button><button class="btn primary" data-act="pt-fechar">Pronto</button></div></aside>`; }

/* ---------- tela ---------- */
function renderPTC(){ const S=ptDoc(), f=ptUi(), tab=f.tab;
  if(f.aberta&&!S.pecas.some(p=>p.id===f.aberta)) f.aberta=null; if(f.est&&!S.estrategias.some(e=>e.id===f.est)) f.est=null;
  const filtros=tab==='calendario'||tab==='pecas'?`<div class="pt-filtros"><label>Canal<select data-ptf="canal"><option value="">Todos</option>${PT_CANAIS.map(([k,n])=>`<option value="${k}" ${f.canal===k?'selected':''}>${n}</option>`).join('')}</select></label>
     <label>Quem faz<select data-ptf="quem"><option value="">Todos</option>${PT_QUEM.map(([k,n])=>`<option value="${k}" ${f.quem===k?'selected':''}>${n}</option>`).join('')}</select></label>
     ${tab==='pecas'?`<label>Etapa<select data-ptf="st"><option value="">Todas</option>${PT_ST.map(([k,n])=>`<option value="${k}" ${f.st===k?'selected':''}>${n}</option>`).join('')}<option value="voltou" ${f.st==='voltou'?'selected':''}>Voltaram para ajuste</option></select></label>`:''}</div>`:'';
  const acao=!ptPode()?'':tab==='estrategias'?'<button class="btn primary" data-act="pt-est-nova">+ Nova estratégia</button>':tab==='midia'?'':'<button class="btn primary" data-act="pt-nova">+ Nova peça</button>';
  const corpo={calendario:ptCalendario,pecas:ptPecas,estrategias:ptEstrategias,midia:ptMidia}[tab]||ptCalendario;
  const pAb=f.aberta&&S.pecas.find(p=>p.id===f.aberta), eAb=f.est&&S.estrategias.find(e=>e.id===f.est);
  $('#main').innerHTML=`<section class="panel pt">
   <header class="ph" style="grid-template-columns:minmax(0,1fr) auto"><div><span class="eyebrow">Lançamento de curso · <b>PTC</b></span><h2 style="margin-top:8px">Plano tático de comunicação</h2><p class="lead">A comunicação do lançamento de ${esc(cur.nome)}: estratégias que se repetem, o calendário de posts e as artes de cada peça num lugar só. A LORSO e o cliente preenchem juntos.</p></div><div class="pt-hact">${acao}</div></header>
   <div class="pt-top"><nav class="subtabs" aria-label="Seções do PTC">${PT_TABS.map(([k,l])=>`<button class="${tab===k?'on':''}" data-act="pt-tab" data-v="${k}" ${tab===k?'aria-current="page"':''}>${l}</button>`).join('')}</nav>${filtros}</div>
   ${(()=>{ const n=ptAguardando(S).length, v=S.pecas.filter(ptVoltou).length; const cli=me&&me.papel==='cliente';
     if(n&&!(tab==='pecas'&&f.st==='aprovacao')) return `<div class="pt-aviso"><span><b>${n} ${n>1?'peças esperando':'peça esperando'} aprovação.</b> ${cli?'Veja cada uma e escolha Aprovado, Revisar ou Reprovado.':'O cliente ainda precisa decidir.'}</span><button class="btn sm primary" data-act="pt-ver-ag">Ver ${n>1?'as peças':'a peça'}</button></div>`;
     if(v&&!cli&&!(tab==='pecas'&&f.st==='voltou')) return `<div class="pt-aviso volta"><span><b>${v} ${v>1?'peças voltaram':'peça voltou'} do cliente</b> com pedido de ajuste.</span><button class="btn sm" data-act="pt-st" data-v="voltou" data-tab="pecas">Ver ${v>1?'as peças':'a peça'}</button></div>`;
     return ''; })()}
   ${corpo(S)}</section>${pAb?ptDrawerPeca(S,pAb):eAb?ptDrawerEst(S,eAb):''}`;
  ptCarregarThumbs(); }

/* ---------- artes no Storage ---------- */
const ptUrls={};
async function ptUrl(path){ const c=ptUrls[path]; if(c&&c.exp>Date.now()) return c.url;
  const r=await sb.storage.from('ptc').createSignedUrl(path,3600); if(r.error) throw r.error; ptUrls[path]={url:r.data.signedUrl,exp:Date.now()+3300e3}; return r.data.signedUrl; }
async function ptCarregarThumbs(){ const els=[...document.querySelectorAll('img[data-pt-arte]:not([src])')]; if(!els.length||!sb.storage) return;
  const falta=[...new Set(els.map(e=>e.dataset.ptArte).filter(p=>!(ptUrls[p]&&ptUrls[p].exp>Date.now())))];
  try{ if(falta.length){ const r=await sb.storage.from('ptc').createSignedUrls(falta,3600); (r.data||[]).forEach(x=>{ if(x.signedUrl) ptUrls[x.path]={url:x.signedUrl,exp:Date.now()+3300e3}; }); }
    els.forEach(e=>{ const c=ptUrls[e.dataset.ptArte]; if(c) e.src=c.url; else e.replaceWith(Object.assign(document.createElement('span'),{className:e.className+' pt-doc',textContent:'Imagem'})); }); }
  catch(e){ console.warn('artes do PTC',e); } }
const ptSlug=n=>String(n||'arte').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^\w.-]+/g,'-').replace(/-+/g,'-').slice(-80);
async function ptEnviar(files){ const S=ptDoc(), p=S.pecas.find(x=>x.id===ptUi().aberta); if(!p||!files||!files.length) return; if(!ptPode()){ toast('Modo leitura: você só visualiza este plano'); return; }
  let ok=0; toast(files.length>1?`Enviando ${files.length} arquivos…`:'Enviando arte…');
  for(const file of files){ if(file.size>50*1024*1024){ toast(`${file.name}: maior que 50 MB. Use o link do Drive.`); continue; }
    const path=`${cur.id}/${p.id}/${Date.now()}-${ptSlug(file.name)}`;
    const r=await sb.storage.from('ptc').upload(path,file,{contentType:file.type||undefined,upsert:false});
    if(r.error){ toast(`Não foi possível enviar ${file.name}: ${r.error.message}`); continue; }
    p.artes.push({path,nome:file.name,tipo:file.type||'',tam:file.size,em:new Date().toISOString(),por:me?(me.nome||me.email):''}); ok++; }
  if(ok){ ptMudou(true); toast(ok>1?`${ok} artes enviadas`:'Arte enviada'); } }
document.addEventListener('change',e=>{ if(e.target&&e.target.id==='pt-arq'){ ptEnviar([...e.target.files]); e.target.value=''; } });
document.addEventListener('dragover',e=>{ const z=e.target.closest&&e.target.closest('[data-pt-drop]'); if(z){ e.preventDefault(); z.classList.add('on'); } });
document.addEventListener('dragleave',e=>{ const z=e.target.closest&&e.target.closest('[data-pt-drop]'); if(z) z.classList.remove('on'); });
document.addEventListener('drop',e=>{ const z=e.target.closest&&e.target.closest('[data-pt-drop]'); if(!z) return; e.preventDefault(); z.classList.remove('on'); ptEnviar([...(e.dataTransfer&&e.dataTransfer.files||[])]); });

/* ---------- eventos ---------- */
function ptPecaAberta(){ return ptDoc().pecas.find(x=>x.id===ptUi().aberta); }
function ptEstAberta(){ return ptDoc().estrategias.find(x=>x.id===ptUi().est); }
document.addEventListener('input',e=>{ const t=e.target; if(!t||!t.dataset||ui.view!=='ptc'||!cur) return;
  if(t.dataset.pt!=null&&t.type!=='checkbox'&&t.tagName!=='SELECT'&&t.type!=='date'&&t.type!=='time'){ const p=ptPecaAberta(); if(!p) return; e.stopPropagation();
    p[t.dataset.pt]=t.dataset.pt==='verba'?(t.value.trim()===''?null:(Number(t.value.replace(/\./g,'').replace(',','.'))||0)):t.value; ptMudou(false); return; }
  if(t.dataset.pte!=null&&t.tagName!=='SELECT'&&t.type!=='date'){ const x=ptEstAberta(); if(!x) return; e.stopPropagation(); x[t.dataset.pte]=t.value; ptMudou(false); } },true);
document.addEventListener('change',e=>{ const t=e.target; if(!t||!t.dataset||ui.view!=='ptc'||!cur) return;
  if(t.dataset.ptf!=null){ e.stopPropagation(); ptUi()[t.dataset.ptf]=t.value; render(); return; }
  if(t.dataset.pt!=null){ const p=ptPecaAberta(); if(!p) return; e.stopPropagation();
    if(t.type==='checkbox'){ p[t.dataset.pt]=t.checked; ptMudou(true); return; }
    if(t.tagName==='SELECT'||t.type==='date'||t.type==='time'){ if(t.dataset.pt==='status'&&t.value==='aprovacao'&&p.status!=='aprovacao'){ ptEnviarAprov(p); ptMudou(true); return; } p[t.dataset.pt]=t.value||(t.dataset.pt==='est'?null:''); ptMudou(true); } return; }
  if(t.dataset.pte!=null&&(t.tagName==='SELECT'||t.type==='date')){ const x=ptEstAberta(); if(!x) return; e.stopPropagation(); x[t.dataset.pte]=t.value; ptMudou(true); } },true);
document.addEventListener('submit',e=>{ const f=e.target; if(!f||f.dataset.ptform!=='dec') return; e.preventDefault(); e.stopPropagation();
  if(!ptPode()){ toast('Modo leitura: você só visualiza este plano'); return; }
  const p=ptDoc().pecas.find(x=>x.id===f.dataset.id), st=f.dataset.st, c=String(new FormData(f).get('c')||'').trim(); if(!p) return;
  if(st!=='aprovado'&&c.length<3){ toast('Escreva o que precisa mudar antes de enviar'); const t=f.querySelector('textarea'); t&&t.focus(); return; }
  ptDecidir(p,st,c); ptUi().dec=null; ptMudou(true); toast(st==='aprovado'?'Peça aprovada':st==='revisar'?'Pedido de revisão enviado':'Peça reprovada'); },true);
document.addEventListener('input',e=>{ const t=e.target; if(t&&t.name==='c'&&t.closest&&t.closest('form[data-ptform="dec"]')){ e.stopPropagation(); const f=ptUi(); if(f.dec) f.dec.txt=t.value; } },true);
document.addEventListener('submit',e=>{ const f=e.target; if(!f||f.dataset.ptform!=='midia') return; e.preventDefault(); e.stopPropagation();
  const fd=new FormData(f), nome=String(fd.get('nome')||'').trim(), url=String(fd.get('url')||'').trim(); if(!nome||!url) return;
  ptDoc().midia.push({id:uid(),nome,tipo:String(fd.get('tipo')||'outro'),url,em:today()}); ptMudou(true); toast('Link adicionado ao banco de mídia'); },true);
function ptNovaPeca(o){ const S=ptDoc(); const p=Object.assign({id:uid(),titulo:'',data:'',hora:'',formatos:[],status:'ideia',quem:me&&me.papel==='cliente'?'cliente':'lorso',resp:'',est:null,legenda:'',artes:[],link:'',impulsionar:false,verba:null,pub:'',criado:today()},o||{});
  S.pecas.push(p); ptUi().aberta=p.id; ptUi().est=null; ptMudou(true); const el=document.querySelector('.pt-drawer .dtit'); el&&!p.titulo&&el.focus(); return p; }
function ptcClick(act,d){ const S=ptDoc(), f=ptUi();
  if(act==='pt-tab'){ f.tab=d.v; f.aberta=null; f.est=null; render(); window.scrollTo({top:0}); return true; }
  if(act==='pt-mes'){ if(d.v==='0'){ f.dia=today(); f.mes=f.dia.slice(0,7); }
    else if(f.vis==='semana'){ const x=new Date((f.dia||today())+'T12:00:00'); x.setDate(x.getDate()+7*Number(d.v)); f.dia=isoLocal(x); f.mes=f.dia.slice(0,7); }
    else { const [y,m]=f.mes.split('-').map(Number); const x=new Date(y,m-1+Number(d.v),1,12); f.mes=isoLocal(x).slice(0,7); f.dia=f.mes+'-01'; } render(); return true; }
  if(act==='pt-vis'){ f.vis=d.v; if(d.v==='semana'&&(f.dia||'').slice(0,7)!==f.mes) f.dia=f.mes===today().slice(0,7)?today():f.mes+'-01'; render(); return true; }
  if(act==='pt-semana'){ f.vis='semana'; f.dia=d.v; render(); return true; }
  if(act==='pt-st'){ f.st=d.v||''; if(d.tab) f.tab=d.tab; f.dec=null; render(); return true; }
  if(act==='pt-ver-ag'){ f.tab='pecas'; f.st='aprovacao'; f.aberta=null; f.est=null; render(); window.scrollTo({top:0}); return true; }
  if(act==='pt-dec-x'){ f.dec=null; render(); return true; }
  if(act==='pt-fechar'){ f.aberta=null; f.est=null; render(); return true; }
  if(act==='pt-abrir'){ f.aberta=d.v; f.est=null; render(); return true; }
  if(!ptPode()&&!['pt-arte-baixar'].includes(act)){ toast('Modo leitura: você só visualiza este plano'); return true; }
  if(act==='pt-dec'){ const p=S.pecas.find(x=>x.id===d.v); if(!p) return true; f.dec=f.dec&&f.dec.id===p.id&&f.dec.st===d.st?null:{id:p.id,st:d.st,txt:''}; render();
    const t=document.querySelector(`form[data-ptform="dec"][data-id="${p.id}"] textarea, form[data-ptform="dec"][data-id="${p.id}"] button[type=submit]`); t&&t.focus(); return true; }
  if(act==='pt-enviar'){ const p=S.pecas.find(x=>x.id===d.v); if(!p) return true; ptEnviarAprov(p); ptMudou(true); toast('Peça enviada para aprovação'); return true; }
  if(act==='pt-nova'){ ptNovaPeca({data:d.v||''}); return true; }
  if(act==='pt-gerar'){ const [,eid,data]=String(d.v).split(':'); const e=S.estrategias.find(x=>x.id===eid); if(!e) return true;
    ptNovaPeca({data,est:e.id,titulo:'',formatos:(e.formatos||[]).slice(),quem:e.quem||'lorso',legenda:e.obs?'Orientação: '+e.obs:''}); return true; }
  if(act==='pt-fmt'){ const alvo=d.alvo==='est'?ptEstAberta():ptPecaAberta(); if(!alvo) return true; alvo.formatos=alvo.formatos||[]; const i=alvo.formatos.indexOf(d.v); if(i>=0) alvo.formatos.splice(i,1); else alvo.formatos.push(d.v); ptMudou(true); return true; }
  if(act==='pt-del'){ const p=S.pecas.find(x=>x.id===d.v); if(!p) return true; if(!confirm('Excluir esta peça e as artes enviadas nela?')) return true;
    if(p.artes.length&&sb.storage) sb.storage.from('ptc').remove(p.artes.map(a=>a.path)).catch(()=>{});
    S.pecas=S.pecas.filter(x=>x.id!==d.v); f.aberta=null; ptMudou(true); toast('Peça excluída'); return true; }
  if(act==='pt-arte-baixar'){ const p=ptPecaAberta(); const a=p&&p.artes[+d.i]; if(!a) return true;
    sb.storage.from('ptc').createSignedUrl(a.path,600,{download:a.nome||true}).then(r=>{ if(r.error) throw r.error; const l=document.createElement('a'); l.href=r.data.signedUrl; l.rel='noopener'; document.body.appendChild(l); l.click(); l.remove(); }).catch(e=>toast('Não foi possível baixar: '+(e.message||e))); return true; }
  if(act==='pt-arte-del'){ const p=ptPecaAberta(); const a=p&&p.artes[+d.i]; if(!a) return true;
    sb.storage.from('ptc').remove([a.path]).then(r=>{ if(r.error){ toast('Não foi possível apagar: '+r.error.message); return; } p.artes.splice(+d.i,1); ptMudou(true); toast('Arte apagada'); }); return true; }
  if(act==='pt-est-nova'){ const e={id:uid(),nome:'',dias:[],freq:'semanal',formatos:[],quem:'lorso',inicio:today(),fim:'',pilar:'',obs:'',ativa:true}; S.estrategias.push(e); f.est=e.id; f.aberta=null; ptMudou(true); const el=document.querySelector('.pt-drawer .dtit'); el&&el.focus(); return true; }
  if(act==='pt-est-abrir'){ f.est=d.v; f.aberta=null; render(); return true; }
  if(act==='pt-est-pausa'){ const e=S.estrategias.find(x=>x.id===d.v); if(e){ e.ativa=e.ativa===false; ptMudou(true); toast(e.ativa?'Estratégia retomada':'Estratégia pausada: sai do calendário'); } return true; }
  if(act==='pt-est-dia'){ const e=ptEstAberta(); if(!e) return true; e.dias=e.dias||[]; const v=+d.v, i=e.dias.indexOf(v); if(i>=0) e.dias.splice(i,1); else e.dias.push(v); ptMudou(true); return true; }
  if(act==='pt-est-del'){ if(!confirm('Excluir esta estratégia? As peças já criadas continuam no calendário.')) return true; S.estrategias=S.estrategias.filter(x=>x.id!==d.v); S.pecas.forEach(p=>{ if(p.est===d.v) p.est=null; }); f.est=null; ptMudou(true); return true; }
  if(act==='pt-midia-del'){ S.midia=S.midia.filter(x=>x.id!==d.v); ptMudou(true); return true; }
  return false; }

/* Aviso ao entrar: cliente vê quantas peças esperam a decisão dele; a LORSO vê o que voltou com ajuste */
let ptAvisado='';
function ptAviso(){ if(!cur||typeof temPTC!=='function'||!temPTC()||ptAvisado===cur.id) return; const P=cur.mods&&cur.mods.ptc; if(!P||!Array.isArray(P.pecas)) return; ptAvisado=cur.id;
  const n=P.pecas.filter(p=>p.status==='aprovacao').length, v=P.pecas.filter(ptVoltou).length;
  if(me&&me.papel==='cliente'&&n) setTimeout(()=>toast(`${n} ${n>1?'peças do PTC esperando':'peça do PTC esperando'} a sua aprovação`),900);
  else if(me&&me.papel!=='cliente'&&v) setTimeout(()=>toast(`${v} ${v>1?'peças do PTC voltaram':'peça do PTC voltou'} do cliente com ajuste`),900); }
