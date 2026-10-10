/* =====================================================================
   Módulo DRE da Central · LORSO Digital
   Mesmo motor do Espaço ADM / DRE Online, com unidades configuráveis
   (UNs na educação, canais no varejo). Um documento por cliente na tabela
   modulos. Os números alimentam sozinhos o financeiro e as UNs do diagnóstico.
   Carregado antes de app.js: só define funções e constantes próprias.
   ===================================================================== */
const MD_MESES=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const MD_MESES_L=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const MD_GRUPOS=[['pessoal','Pessoal administrativo'],['mkt_time','Time de marketing'],['marketing','Mídia e marketing'],['ocupacao','Ocupação'],['adm','Administrativo e sistemas'],['outros','Outras despesas']];
const MD_PRESETS={
  educacao:{nome:'Instituição de ensino',rot:{un:'Unidade de negócio',uns:'Unidades de negócio',rec:'Mensalidades e receitas',ded:'Bolsas e descontos',inad:'Inadimplência',cus:'Custo docente e acadêmico'},
    unidades:[['colegio','Colégio','colegio',.0565,.12,.05,.40,0,.01],['graduacao','Graduação','graduacao',.0565,.25,.08,.32,0,.015],['pos','Pós-Graduação','pos',.0565,.10,.06,.26,.05,.02],['mestrado','Mestrado','mestrado',.0565,.05,.04,.35,0,.01]],
    categorias:[['Folha administrativa e encargos','pessoal'],['Benefícios do administrativo','pessoal'],['Time de marketing (folha e encargos)','mkt_time'],['Mídia paga','marketing'],['Agências, produção e fornecedores','marketing'],['Eventos, feiras e vestibular','marketing'],['Aluguel, condomínio e IPTU','ocupacao'],['Energia, água e internet','ocupacao'],['Manutenção e limpeza','ocupacao'],['Sistemas acadêmicos e TI','adm'],['Contabilidade e jurídico','adm'],['Outras despesas','outros']]},
  varejo:{nome:'Loja (varejo e atacado)',rot:{un:'Canal',uns:'Canais de venda',rec:'Vendas',ded:'Devoluções e descontos',inad:'Perdas e chargebacks',cus:'Custo da mercadoria (CMV)'},
    unidades:[['at','Atacado','',.095,.01,0,.625,.03,0],['lf','Loja física','',.11,.015,0,.435,.015,.025],['on','Loja online','',.11,.02,.005,.417,0,.12]],
    categorias:[['Pró-labore dos sócios','pessoal'],['Salários, encargos e benefícios','pessoal'],['Marketing e social media','mkt_time'],['Anúncios','marketing'],['Aluguel','ocupacao'],['Condomínio e IPTU','ocupacao'],['Energia, água e internet','ocupacao'],['Contabilidade','adm'],['Sistemas, ERP e plataforma da loja online','adm'],['Embalagens e materiais','outros'],['Outras despesas','outros']]},
  servicos:{nome:'Serviços',rot:{un:'Linha de receita',uns:'Linhas de receita',rec:'Receita',ded:'Descontos e cancelamentos',inad:'Inadimplência',cus:'Custo direto do serviço'},
    unidades:[['l1','Serviço principal','',.11,.02,.03,.35,.05,.02]],
    categorias:[['Pessoal administrativo','pessoal'],['Time de marketing','mkt_time'],['Mídia e marketing','marketing'],['Ocupação','ocupacao'],['Sistemas e administrativo','adm'],['Outras despesas','outros']]}
};
const mdUid=()=>Math.random().toString(36).slice(2,10);
const mdN=v=>(typeof v==='number'&&isFinite(v))?v:0;
const mdSum=a=>a.reduce((x,y)=>x+mdN(y),0);
const mdF0=new Intl.NumberFormat('pt-BR',{maximumFractionDigits:0}), mdFin=new Intl.NumberFormat('pt-BR',{maximumFractionDigits:2});
const mdR=v=>(!isFinite(v)||Math.abs(v)<0.5)?'–':(v<0?'−':'')+mdF0.format(Math.abs(Math.round(v)));
const mdRS=v=>(!isFinite(v)||Math.abs(v)<0.5)?'R$ 0':(v<0?'−R$ ':'R$ ')+mdF0.format(Math.abs(Math.round(v)));
const mdP=v=>(!isFinite(v)||Math.abs(v)<0.0005)?'–':(v*100).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})+'%';
const mdCls=v=>v<-0.5?'neg':'';
function mdMesVazio(){ return {lancado:false,rec:{},ded:{},inad:{},cus:{},desp:{},fin:null}; }
function mdNovo(seg){
  const P=MD_PRESETS[seg]||MD_PRESETS.educacao;
  return {v:1,segmento:seg||'educacao',ano:String(new Date().getFullYear()),ir:0,lucroDesejado:null,
    unidades:P.unidades.map(([id,nome,un,imp,ded,inad,cus,com,taxa])=>({id,nome,un,imp,ded,inad,cus,com,taxa})),
    categorias:P.categorias.map(([nome,grupo])=>({id:mdUid(),nome,grupo,padrao:null})),
    metas:Object.fromEntries(P.unidades.map(u=>[u[0],Array(12).fill(null)])),
    meses:Array.from({length:12},mdMesVazio),dividas:[],updatedAt:0};
}
function mdMigra(d){
  const b=mdNovo(d&&d.segmento); if(!d||!Array.isArray(d.unidades)) return b;
  const S=Object.assign(b,JSON.parse(JSON.stringify(d)));
  S.meses=Array.from({length:12},(_,i)=>Object.assign(mdMesVazio(),(d.meses||[])[i]||{}));
  ['rec','ded','inad','cus','desp'].forEach(k=>S.meses.forEach(M=>{ if(!M[k]||typeof M[k]!=='object')M[k]={}; }));
  S.metas=S.metas||{}; S.unidades.forEach(u=>{ if(!Array.isArray(S.metas[u.id]))S.metas[u.id]=Array(12).fill(null); });
  S.dividas=Array.isArray(S.dividas)?S.dividas:[]; S.categorias=Array.isArray(S.categorias)?S.categorias:[];
  return S;
}
const mdRot=S=>(MD_PRESETS[S.segmento]||MD_PRESETS.educacao).rot;

/* ---------------- cálculo ---------------- */
function mdDividas(S){ let juros=0,parc=0,saldo=0; for(const d of S.dividas){ juros+=mdN(d.saldo)*mdN(d.taxa); parc+=Math.max(mdN(d.parcela),0); saldo+=mdN(d.saldo); } return {juros,parc,amort:Math.max(0,parc-juros),saldo}; }
function mdMes(S,m,modo){
  const M=S.meses[m], D=mdDividas(S), real=modo==='real', o={u:{},estimado:false};
  let rb=0,ded=0,imp=0,inad=0,cus=0,com=0,taxa=0;
  for(const u of S.unidades){
    const v=real?mdN(M.rec[u.id]):mdN(S.metas[u.id]&&S.metas[u.id][m]);
    const pega=(campo,pctv)=>{ const x=real?M[campo][u.id]:null; if(typeof x==='number')return [x,false]; return [v*mdN(pctv),v>0]; };
    const [d,e1]=pega('ded',u.ded), [n,e2]=pega('inad',u.inad), [c,e3]=pega('cus',u.cus);
    if(real&&(e1||e2||e3))o.estimado=true;
    const x={rb:v,ded:d,inad:n,imp:Math.max(0,v-d)*mdN(u.imp),cus:c,com:v*mdN(u.com),taxa:v*mdN(u.taxa),est:{ded:e1,inad:e2,cus:e3}};
    x.rl=x.rb-x.ded-x.imp-x.inad; x.mc=x.rl-x.cus-x.com-x.taxa; o.u[u.id]=x;
    rb+=x.rb; ded+=x.ded; imp+=x.imp; inad+=x.inad; cus+=x.cus; com+=x.com; taxa+=x.taxa;
  }
  Object.assign(o,{rb,ded,imp,inad,cus,com,taxa}); o.rl=rb-ded-imp-inad; o.lb=o.rl-cus; o.mc=o.lb-com-taxa;
  o.grupos={}; MD_GRUPOS.forEach(([g])=>o.grupos[g]=0);
  for(const c of S.categorias){ const v=real?mdN(M.desp[c.id]):mdN(c.padrao); o.grupos[c.grupo]=(o.grupos[c.grupo]||0)+v; }
  o.fixos=mdSum(Object.values(o.grupos)); o.ebitda=o.mc-o.fixos; o.juros=D.juros; o.fin=real?mdN(M.fin):0;
  o.lair=o.ebitda-o.juros-o.fin; o.ir=Math.max(0,o.lair)*mdN(S.ir); o.ll=o.lair-o.ir; o.amort=D.amort; o.caixa=o.ll-D.amort;
  o.mcp=rb?o.mc/rb:0; o.peCont=o.mcp>0?(o.fixos+o.juros+o.fin)/o.mcp:0; o.peFin=o.mcp>0?(o.fixos+o.juros+o.fin+D.amort)/o.mcp:0;
  return o;
}
function mdCalc(S){ const C={real:[],orc:[],proj:[]}; for(let m=0;m<12;m++){ C.real.push(mdMes(S,m,'real')); C.orc.push(mdMes(S,m,'orc')); C.proj.push(S.meses[m].lancado?C.real[m]:C.orc[m]); }
  C.lanc=S.meses.map((M,i)=>M.lancado?i:-1).filter(i=>i>=0); C.div=mdDividas(S); return C; }
const mdTot=(arr,f)=>arr.reduce((a,x)=>a+mdN(f(x)),0);

/* ---------------- ligação com o diagnóstico ---------------- */
function mdMapa(S){
  const C=mdCalc(S), O=C.orc, P=C.proj, out={};
  if(!S.unidades.some(u=>S.metas[u.id]&&S.metas[u.id].some(v=>typeof v==='number')) && !C.lanc.length) return out;
  const g=k=>x=>x.grupos[k]||0;
  out['financeiro.receita_orcada']=mdTot(O,x=>x.rb); out['financeiro.receita_realizada']=mdTot(P,x=>x.rb);
  out['financeiro.custo_orcado']=mdTot(O,x=>x.rb-x.ebitda); out['financeiro.custo_realizado']=mdTot(P,x=>x.rb-x.ebitda);
  out['financeiro.ebitda_orcado']=mdTot(O,x=>x.ebitda); out['financeiro.ebitda_realizado']=mdTot(P,x=>x.ebitda);
  out['financeiro.verba_orcada']=mdTot(O,g('marketing')); out['financeiro.verba_realizada']=mdTot(P,g('marketing'));
  out['financeiro.descontos']=mdTot(P,x=>x.ded); out['financeiro.inadimplencia']=mdTot(P,x=>x.inad);
  if(S.segmento==='educacao') out['financeiro.folha_docente']=mdTot(P,x=>x.cus);
  out['financeiro.folha_adm']=mdTot(P,g('pessoal')); out['financeiro.folha_mkt']=mdTot(P,g('mkt_time'))/12;
  S.unidades.forEach(u=>{ if(!u.un)return; out[u.un+'.meta_rec']=mdTot(O,x=>x.u[u.id]?x.u[u.id].rb:0); out[u.un+'.receita']=mdTot(P,x=>x.u[u.id]?x.u[u.id].rb:0); if(S.segmento==='educacao')out[u.un+'.folha']=mdTot(P,x=>x.u[u.id]?x.u[u.id].cus:0); });
  return out;
}
function mdAuto(){ try{ return new Set(JSON.parse((cur&&cur.campos['dre.auto'])||'[]')); }catch(e){ return new Set(); } }
function mdSync(){
  if(!cur||!cur.mods||!cur.mods.dre) return false;
  const mapa=mdMapa(mdMigra(cur.mods.dre)), auto=mdAuto(); let mudou=false;
  Object.entries(mapa).forEach(([k,v])=>{ const r=Math.round(v); const vazio=cur.campos[k]==null||cur.campos[k]==='';
    if(!(vazio||auto.has(k)))return;
    if(r>0){ if(cur.campos[k]!==String(r)){ cur.campos[k]=String(r); mudou=true; } if(!auto.has(k)){ auto.add(k); mudou=true; } }
    else if(auto.has(k)){ delete cur.campos[k]; auto.delete(k); mudou=true; } });
  [...auto].forEach(k=>{ if(!(k in mapa)){ auto.delete(k); delete cur.campos[k]; mudou=true; } });
  if(mudou){ if(auto.size)cur.campos['dre.auto']=JSON.stringify([...auto]); else delete cur.campos['dre.auto']; }
  return mudou;
}
function mdSoltarCampo(k){ const a=mdAuto(); if(a.has(k)){ a.delete(k); if(a.size)cur.campos['dre.auto']=JSON.stringify([...a]); else delete cur.campos['dre.auto']; } }

/* ---------------- salvar ---------------- */
let mdT=null, mdPend=false;
function mdSalvar(){ mdPend=true; clearTimeout(mdT); mdT=setTimeout(async()=>{ if(!cur||!cur.mods||!cur.mods.dre){ mdPend=false; return; }
  const id=cur.id, dados=cur.mods.dre; dados.updatedAt=Date.now();
  const r=await sb.from('modulos').upsert({diagnostico_id:id,modulo:'dre',dados,updated_at:new Date().toISOString()});
  mdPend=false; if(r.error) toast('Não foi possível salvar o DRE: '+r.error.message); },700); }
function mdMudou(){ if(mdSync()) touch(false); mdSalvar(); soon(); }

/* ---------------- componentes ---------------- */
function mdGet(o,p){ return p.split('.').reduce((a,k)=>a==null?undefined:a[k],o); }
function mdSet(o,p,v){ const ks=p.split('.'); let a=o; for(let i=0;i<ks.length-1;i++){ if(a[ks[i]]==null)a[ks[i]]={}; a=a[ks[i]]; } a[ks[ks.length-1]]=v; }
function mdIn(S,path,kind,ph,extra){ const v=mdGet(S,path); let shown='';
  if(typeof v==='number')shown=kind==='pct'?mdFin.format(v*100):mdFin.format(v); else if(kind==='text'&&v!=null)shown=v;
  return `<input class="mdin ${kind==='text'?'txt':''}" data-md="${path}" data-mk="${kind}" value="${esc(shown)}" ${ph!=null?`placeholder="${esc(ph)}"`:''} inputmode="${kind==='text'?'text':'decimal'}" ${extra||''}>`; }
function mdBars(series){ const W=760,H=220,all=series.flatMap(s=>s.v.map(mdN)),mx=Math.max(1,...all.map(Math.abs)),neg=all.some(v=>v<0);
  const zero=neg?H/2:H-28,sc=(neg?H/2-16:H-44)/mx,bw=(W-48)/12,w=bw*0.74/series.length;
  let s=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(series.map(x=>x.n).join(' e '))} por mês"><line x1="40" x2="${W}" y1="${zero}" y2="${zero}" stroke="var(--line-2)"/>`;
  for(let m=0;m<12;m++){ const x=44+m*bw; series.forEach((se,j)=>{ const v=mdN(se.v[m]),h=Math.abs(v)*sc,y=v>=0?zero-h:zero; if(h<=.3)return; const out=se.c==='none';
      s+=`<rect x="${(x+j*w).toFixed(1)}" y="${y.toFixed(1)}" width="${Math.max(2,w-3).toFixed(1)}" height="${h.toFixed(1)}" rx="4" fill="${out?'none':(v<0?'var(--n1)':se.c)}" ${out?'stroke="var(--accent-2)" stroke-width="1.5" stroke-dasharray="3 2"':''} data-tip="${MD_MESES[m]} · ${esc(se.n)}: ${mdRS(v)}"/>`; });
    s+=`<text x="${(x+bw*0.37).toFixed(1)}" y="${H-8}" text-anchor="middle" font-size="12" fill="var(--faint)">${MD_MESES[m]}</text>`; }
  return `<div class="chart">${s}</svg><div class="legend">${series.map(se=>`<span class="lg"><i style="${se.c==='none'?'background:transparent;border:1.5px dashed var(--accent-2)':'background:'+se.c}"></i>${esc(se.n)}</span>`).join('')}</div></div>`; }
const MD_COR=['var(--s1)','var(--s2)','var(--s3)','var(--s4)','var(--s5)','var(--s6)'];

/* ---------------- telas ---------------- */
const MD_TABS=[['painel','Painel'],['lancar','Lançar o mês'],['dre','DRE'],['orcamento','Orçamento'],['dividas','Dívidas'],['config','Configurar']];
function mdPainel(S,C){ const L=C.lanc, R1=L.map(i=>C.real[i]), O1=L.map(i=>C.orc[i]), rot=mdRot(S);
  const vendas=mdTot(R1,x=>x.rb), meta=mdTot(O1,x=>x.rb), metaAno=mdTot(C.orc,x=>x.rb), ll=mdTot(R1,x=>x.ll), llO=mdTot(O1,x=>x.ll), cx=mdTot(R1,x=>x.caixa); const ult=L.length?L[L.length-1]:null;
  const auto=[...mdAuto()];
  let h=`<div class="stats money">
   <div class="stat"><span class="si">${ico('dre',20)}</span><b>${mdRS(vendas)}</b><span>${esc(rot.rec.toLowerCase())} no ano</span>${meta?`<span class="sp"><i style="width:${Math.min(100,vendas/meta*100)}%"></i></span><small>${mdP(vendas/meta)} da meta do período · meta do ano ${mdRS(metaAno)}</small>`:'<small>Cadastre metas em Orçamento</small>'}</div>
   <div class="stat ${ll<-0.5?'bad':''}"><span class="si">${ico('resultados',20)}</span><b>${mdRS(ll)}</b><span>lucro líquido no ano</span><small>Previsto no período: ${mdRS(llO)}</small></div>
   <div class="stat ${cx<-0.5?'bad':''}"><span class="si">${ico('check',20)}</span><b>${mdRS(cx)}</b><span>sobra de caixa no ano</span><small>Lucro menos amortização das dívidas</small></div>
   <div class="stat"><span class="si">${ico('alerta',20)}</span><b>${mdRS(C.div.saldo)}</b><span>em dívidas</span><small>${mdRS(C.div.parc)} por mês em parcelas</small></div></div>`;
  if(!L.length) h+=`<div class="block"><p class="empty">Nenhum mês fechado ainda. Lance e feche o primeiro mês em <b>Lançar o mês</b> para o painel ganhar vida. O previsto já aparece a partir das metas do Orçamento.</p></div>`;
  h+=`<div class="rx-two"><section class="block"><div class="block-h"><h3>Lucro por mês</h3><p>Realizado x previsto</p></div>${mdBars([{n:'Realizado',v:C.real.map((x,i)=>S.meses[i].lancado?x.ll:0),c:'var(--accent)'},{n:'Previsto',v:C.orc.map(x=>x.ll),c:'none'}])}</section>
   <section class="block"><div class="block-h"><h3>${esc(rot.rec)} por ${esc(rot.un.toLowerCase())}</h3><p>Meses fechados</p></div>${mdBars(S.unidades.slice(0,6).map((u,j)=>({n:u.nome,v:C.real.map((x,i)=>S.meses[i].lancado&&x.u[u.id]?x.u[u.id].rb:0),c:MD_COR[j]})))}</section></div>
   <section class="block"><div class="block-h"><h3>Quanto cada ${esc(rot.un.toLowerCase())} deixa de margem</h3><p>Margem de contribuição = receita menos ${esc(rot.ded.toLowerCase())}, impostos, ${esc(rot.inad.toLowerCase())}, ${esc(rot.cus.toLowerCase())}, comissões e taxas.</p></div>
    <div class="untiles">${S.unidades.map((u,j)=>{ const src=L.length?R1:C.orc; const rb=mdTot(src,x=>x.u[u.id]?x.u[u.id].rb:0), mc=mdTot(src,x=>x.u[u.id]?x.u[u.id].mc:0), mp=rb?mc/rb:0;
      return `<div class="untile"><div class="rw">${ringSvgPct(mp,MD_COR[j%6])}<span class="rv" style="font-size:15px">${rb?Math.round(mp*100)+'%':'—'}</span></div><div><b>${esc(u.nome)}</b><small>${mdRS(rb)} de receita · ${mdRS(mc)} de margem${L.length?'':' (previsto)'}</small></div></div>`; }).join('')}</div></section>`;
  if(ult!=null){ const o=C.real[ult]; h+=`<section class="block"><div class="block-h"><h3>Equilíbrio em ${MD_MESES_L[ult]}</h3></div>
    <div class="mdlines"><div><span>Faturou</span><b>${mdRS(o.rb)}</b></div><div><span>Precisava faturar para lucro zero</span><b>${mdRS(o.peCont)}</b></div><div><span>Precisava faturar para empatar o caixa, com as parcelas</span><b>${mdRS(o.peFin)}</b></div>${S.lucroDesejado?`<div><span>Precisava faturar para lucrar ${mdRS(S.lucroDesejado)}</span><b>${mdRS(o.mcp>0?o.peCont+S.lucroDesejado/o.mcp:0)}</b></div>`:''}</div>
    <div class="verdict ${o.rb>=o.peFin?'ok':'bad'}">${o.rb>=o.peFin?'O caixa fechou positivo.':'O caixa fechou no vermelho: '+mdRS(o.caixa)+'.'}</div></section>`; }
  h+=`<section class="block"><div class="block-h"><h3>Ligado ao diagnóstico</h3><p>${auto.length?`${pl(auto.length,'campo preenchido','campos preenchidos')} sozinho no diagnóstico. Se você digitar outro valor lá, vale o que você digitou.`:'Assim que houver metas ou meses fechados, o financeiro e as UNs do diagnóstico se preenchem sozinhos.'}</p></div>
    ${auto.length?`<div class="mdauto">${auto.sort().map(k=>`<span class="tag ok">${esc(typeof CAMPO_NOME==='function'?CAMPO_NOME(k):k)}</span>`).join('')}</div>`:''}</section>`;
  return h; }
function ringSvgPct(f,cor){ const r=52,c=2*Math.PI*r; f=Math.max(0,Math.min(1,f||0)); return `<svg viewBox="0 0 128 128" aria-hidden="true"><circle cx="64" cy="64" r="${r}" fill="none" stroke="var(--surface)" stroke-width="14"/>${f>0?`<circle cx="64" cy="64" r="${r}" fill="none" stroke="${cor}" stroke-width="14" stroke-linecap="round" stroke-dasharray="${(c*f).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 64 64)"/>`:''}</svg>`; }
function mdLancar(S,C){ const m=ui.mdMes??Math.max(0,new Date().getMonth()-1), M=S.meses[m], o=C.real[m], rot=mdRot(S);
  const est=(x,k)=>x&&x.est&&x.est[k];
  let h=`<div class="months" role="group" aria-label="Mês">${MD_MESES.map((x,i)=>`<button class="mdmes ${S.meses[i].lancado?'ok':''}" data-act="md-mes" data-v="${i}" aria-pressed="${i===m}">${x}<small>${S.meses[i].lancado?'fechado':'aberto'}</small></button>`).join('')}</div>
   <div class="mdlayout"><div>
   <section class="block"><div class="block-h"><h3>${esc(rot.rec)} de ${MD_MESES_L[m]}</h3><p>Receita bruta, antes de ${esc(rot.ded.toLowerCase())}.</p></div><div class="mdrows">${S.unidades.map(u=>`<label class="mdrow"><span>${esc(u.nome)}<small>meta ${mdRS(mdN(S.metas[u.id]&&S.metas[u.id][m]))}</small></span>${mdIn(S,`meses.${m}.rec.${u.id}`,'money','0')}</label>`).join('')}</div></section>
   <section class="block"><div class="block-h"><h3>${esc(rot.ded)} e ${esc(rot.inad.toLowerCase())}</h3><p>Em branco, o valor é estimado pelos percentuais de Configurar.</p></div><div class="mdrows">${S.unidades.map(u=>{ const x=o.u[u.id]; return `<div class="mdrow2"><span>${esc(u.nome)}</span><label><small>${esc(rot.ded)}${est(x,'ded')?` <span class="tag hz-l">estimado ${mdR(x.ded)}</span>`:''}</small>${mdIn(S,`meses.${m}.ded.${u.id}`,'money',est(x,'ded')?mdR(x.ded):'0')}</label><label><small>${esc(rot.inad)}${est(x,'inad')?` <span class="tag hz-l">estimado ${mdR(x.inad)}</span>`:''}</small>${mdIn(S,`meses.${m}.inad.${u.id}`,'money',est(x,'inad')?mdR(x.inad):'0')}</label></div>`; }).join('')}</div></section>
   <section class="block"><div class="block-h"><h3>${esc(rot.cus)}</h3><p>${S.segmento==='educacao'?'Professores, coordenação acadêmica e materiais de cada unidade.':'Custo do que foi vendido no mês.'} Em branco, é estimado pelo percentual.</p></div><div class="mdrows">${S.unidades.map(u=>{ const x=o.u[u.id]; return `<label class="mdrow"><span>${esc(u.nome)}${est(x,'cus')?`<small><span class="tag hz-l">estimado ${mdRS(x.cus)}</span></small>`:''}</span>${mdIn(S,`meses.${m}.cus.${u.id}`,'money',est(x,'cus')?mdR(x.cus):'0')}</label>`; }).join('')}</div></section>
   <section class="block"><div class="block-h"><h3>Despesas do mês</h3><button class="btn sm" data-act="md-padrao">Preencher com os valores de sempre</button></div><div class="mdrows">${MD_GRUPOS.map(([g,gl])=>{ const cs=S.categorias.filter(c=>c.grupo===g); return cs.length?`<div class="mdg">${esc(gl)}</div>${cs.map(c=>`<label class="mdrow"><span>${esc(c.nome)}</span>${mdIn(S,`meses.${m}.desp.${c.id}`,'money',c.padrao?mdR(c.padrao):'0')}</label>`).join('')}`:''; }).join('')}
    <label class="mdrow"><span>Tarifas bancárias e outros juros<small>além das dívidas cadastradas</small></span>${mdIn(S,`meses.${m}.fin`,'money','0')}</label></div></section>
   <div class="block" style="flex-direction:row;align-items:center;flex-wrap:wrap"><button class="btn ${M.lancado?'':'primary'}" data-act="md-fechar">${M.lancado?'Reabrir '+MD_MESES_L[m]:'Fechar '+MD_MESES_L[m]}</button><span class="muted" style="font-size:13.5px">${M.lancado?'Mês fechado: entra no painel, na DRE e no diagnóstico.':'Feche o mês quando todos os números estiverem lançados.'}</span></div>
   </div><aside class="mdres"><section class="block"><span class="muted" style="font-size:13px;font-weight:700">Resultado de ${MD_MESES_L[m]}</span><div class="mdbig ${mdCls(o.ll)}">${mdRS(o.ll)}</div>
    <div class="mdlines"><div><span>${esc(rot.rec)}</span><b>${mdR(o.rb)}</b></div><div><span>(−) ${esc(rot.ded)}</span><span>${mdR(-o.ded)}</span></div><div><span>(−) Impostos</span><span>${mdR(-o.imp)}</span></div><div><span>(−) ${esc(rot.inad)}</span><span>${mdR(-o.inad)}</span></div>
     <div><span>(−) ${esc(rot.cus)}</span><span>${mdR(-o.cus)}</span></div><div><span>(−) Comissões e taxas</span><span>${mdR(-(o.com+o.taxa))}</span></div><div class="t"><span>Margem de contribuição</span><b>${mdR(o.mc)} <small class="muted">${mdP(o.mcp)}</small></b></div>
     <div><span>(−) Despesas do mês</span><span>${mdR(-o.fixos)}</span></div><div><span>(−) Juros e tarifas</span><span>${mdR(-(o.juros+o.fin))}</span></div>${o.ir?`<div><span>(−) IR e CSLL</span><span>${mdR(-o.ir)}</span></div>`:''}
     <div class="t"><span>Lucro líquido</span><b class="${mdCls(o.ll)}">${mdR(o.ll)}</b></div><div><span>(−) Amortização das dívidas</span><span>${mdR(-o.amort)}</span></div><div class="t"><span>Sobra de caixa</span><b class="${mdCls(o.caixa)}">${mdR(o.caixa)}</b></div></div>
    ${o.rb?`<div class="verdict ${o.rb>=o.peFin?'ok':'bad'}">${o.rb>=o.peFin?`Acima do equilíbrio: sobram ${mdRS(o.rb-o.peFin)} em receita.`:`Faltaram ${mdRS(o.peFin-o.rb)} em receita para empatar o caixa.`}</div>`:`<div class="verdict">Sem receita lançada.</div>`}</section></aside></div>`;
  return h; }
function mdDRE(S,C){ const modo=ui.mdModo||'real', cmp=modo==='cmp', src=modo==='orc'?C.orc:C.real, show=i=>modo==='orc'||S.meses[i].lancado, rot=mdRot(S);
  const linhas=[[rot.rec,x=>x.rb,'sub'],...S.unidades.map(u=>['   '+u.nome,x=>x.u[u.id]?x.u[u.id].rb:0,'']),['(−) '+rot.ded,x=>-x.ded,''],['(−) Impostos sobre a receita',x=>-x.imp,''],['(−) '+rot.inad,x=>-x.inad,''],['(=) Receita líquida',x=>x.rl,'tot'],
    ['(−) '+rot.cus,x=>-x.cus,''],['(=) Lucro bruto',x=>x.lb,'tot'],['(−) Comissões',x=>-x.com,''],['(−) Taxas de cartão e gateway',x=>-x.taxa,''],['(=) Margem de contribuição',x=>x.mc,'tot'],
    ...MD_GRUPOS.map(([g,l])=>['(−) '+l,x=>-x.grupos[g],'']),['(=) EBITDA',x=>x.ebitda,'tot'],['(−) Juros das dívidas',x=>-x.juros,''],['(−) Tarifas e outros juros',x=>-x.fin,''],['(−) IR e CSLL',x=>-x.ir,''],['(=) Lucro líquido',x=>x.ll,'ll']];
  let rbTot=0; for(let i=0;i<12;i++)if(show(i))rbTot+=cmp?C.real[i].rb-C.orc[i].rb:src[i].rb;
  let h=`<div class="seg" role="group" aria-label="Visão"><button class="${modo==='real'?'on':''}" data-act="md-modo" data-v="real">Realizado</button><button class="${modo==='orc'?'on':''}" data-act="md-modo" data-v="orc">Previsto</button><button class="${cmp?'on':''}" data-act="md-modo" data-v="cmp">Realizado x previsto</button></div>
   <div class="tblw mddre"><table class="tbl"><thead><tr><th>Conta</th>${MD_MESES.map(x=>`<th class="r">${x}</th>`).join('')}<th class="r">Total</th><th class="r">% receita</th></tr></thead><tbody>`;
  for(const [l,f,c] of linhas){ let t=0; const cells=MD_MESES.map((_,i)=>{ if((!show(i)&&!cmp)||(cmp&&!S.meses[i].lancado))return '<td></td>'; const v=cmp?f(C.real[i])-f(C.orc[i]):f(src[i]); t+=v; return `<td class="r ${cmp?(v>0.5?'pos':mdCls(v)):mdCls(v)}">${cmp&&v>0.5?'+':''}${mdR(v)}</td>`; }).join('');
    const base=cmp?C.lanc.reduce((a,i)=>a+C.orc[i].rb,0):rbTot; h+=`<tr class="md-${c}"><td>${esc(l)}</td>${cells}<td class="r ${mdCls(t)}"><b>${cmp&&t>0.5?'+':''}${mdR(t)}</b></td><td class="r">${mdP(base?t/base:0)}</td></tr>`; }
  return h+`</tbody></table></div><div><button class="btn" data-act="md-csv">Baixar DRE em planilha (CSV)</button></div>`; }
function mdOrcamento(S,C){ const rot=mdRot(S);
  return `<section class="block"><div class="block-h"><h3>Metas de ${esc(rot.rec.toLowerCase())} por mês</h3><button class="btn sm" data-act="md-repete">Repetir janeiro nos meses vazios</button></div>
   <div class="tblw"><table class="tbl mdgrid"><thead><tr><th>${esc(rot.un)}</th>${MD_MESES.map(x=>`<th class="r">${x}</th>`).join('')}<th class="r">Ano</th></tr></thead><tbody>
    ${S.unidades.map(u=>`<tr><td>${esc(u.nome)}</td>${MD_MESES.map((_,m)=>`<td>${mdIn(S,`metas.${u.id}.${m}`,'money')}</td>`).join('')}<td class="r"><b>${mdR(mdSum(S.metas[u.id]||[]))}</b></td></tr>`).join('')}
    <tr class="md-tot"><td>Total</td>${MD_MESES.map((_,m)=>`<td class="r">${mdR(S.unidades.reduce((a,u)=>a+mdN(S.metas[u.id]&&S.metas[u.id][m]),0))}</td>`).join('')}<td class="r">${mdR(S.unidades.reduce((a,u)=>a+mdSum(S.metas[u.id]||[]),0))}</td></tr></tbody></table></div></section>
   <section class="block"><div class="block-h"><h3>Despesas previstas por mês</h3><p>O valor de sempre vira sugestão ao lançar o mês e entra no previsto.</p></div>
    <div class="tblw"><table class="tbl"><thead><tr><th>Despesa</th><th>Grupo</th><th class="r">Valor por mês</th><th class="r">No ano</th><th></th></tr></thead><tbody>
     ${S.categorias.map((c,i)=>`<tr><td>${mdIn(S,`categorias.${i}.nome`,'text')}</td><td><select data-md="categorias.${i}.grupo" data-mk="sel">${MD_GRUPOS.map(([g,l])=>`<option value="${g}" ${c.grupo===g?'selected':''}>${l}</option>`).join('')}</select></td><td>${mdIn(S,`categorias.${i}.padrao`,'money','0')}</td><td class="r">${mdR(mdN(c.padrao)*12)}</td><td class="x"><button class="xbtn" data-act="md-del" data-l="categorias" data-i="${i}" aria-label="Remover">×</button></td></tr>`).join('')}
     <tr class="md-tot"><td>Total</td><td></td><td class="r">${mdR(mdSum(S.categorias.map(c=>c.padrao)))}</td><td class="r">${mdR(mdSum(S.categorias.map(c=>c.padrao))*12)}</td><td></td></tr></tbody></table></div>
    <div><button class="btn sm" data-act="md-addcat">+ Despesa</button></div></section>
   <section class="block"><div class="block-h"><h3>Resultado previsto no ano</h3></div><div class="stats">
    <div class="stat"><b>${mdRS(mdTot(C.orc,x=>x.rb))}</b><span>${esc(rot.rec.toLowerCase())}</span></div><div class="stat"><b>${mdRS(mdTot(C.orc,x=>x.mc))}</b><span>margem de contribuição</span></div><div class="stat"><b>${mdRS(mdTot(C.orc,x=>x.ebitda))}</b><span>EBITDA</span></div><div class="stat ${mdTot(C.orc,x=>x.ll)<0?'bad':''}"><b>${mdRS(mdTot(C.orc,x=>x.ll))}</b><span>lucro líquido</span></div></div></section>`; }
function mdDividasHtml(S,C){
  return `<section class="block"><div class="block-h"><h3>Dívidas</h3><p>Juros do mês = saldo × taxa e entram na DRE. O resto da parcela é amortização: sai do caixa, mas não é despesa.</p></div>
   <div class="tblw"><table class="tbl"><thead><tr><th>Credor</th><th class="r">Saldo hoje</th><th class="r">Juros ao mês (%)</th><th class="r">Parcela mensal</th><th class="r">Juros por mês</th><th class="r">Amortização</th><th></th></tr></thead><tbody>
    ${S.dividas.map((d,i)=>{ const j=mdN(d.saldo)*mdN(d.taxa), a=mdN(d.parcela)-j; return `<tr><td>${mdIn(S,`dividas.${i}.credor`,'text','Credor')}</td><td>${mdIn(S,`dividas.${i}.saldo`,'money')}</td><td>${mdIn(S,`dividas.${i}.taxa`,'pct')}</td><td>${mdIn(S,`dividas.${i}.parcela`,'money')}</td><td class="r">${mdR(j)}</td><td class="r">${a<=0&&mdN(d.saldo)>0?'<span class="tag alta">só juros</span>':mdR(a)}</td><td class="x"><button class="xbtn" data-act="md-del" data-l="dividas" data-i="${i}" aria-label="Remover">×</button></td></tr>`; }).join('')||'<tr><td colspan="7" class="muted">Nenhuma dívida cadastrada.</td></tr>'}
    <tr class="md-tot"><td>Total</td><td class="r">${mdR(C.div.saldo)}</td><td></td><td class="r">${mdR(C.div.parc)}</td><td class="r">${mdR(C.div.juros)}</td><td class="r">${mdR(C.div.amort)}</td><td></td></tr></tbody></table></div>
   <div><button class="btn sm" data-act="md-adddiv">+ Dívida</button></div></section>`; }
function mdConfig(S){ const rot=mdRot(S);
  return `<section class="block"><div class="block-h"><h3>Tipo de negócio</h3><p>Define os nomes das linhas e o modelo inicial.</p></div>
    <div class="seg" role="group" aria-label="Tipo de negócio">${Object.entries(MD_PRESETS).map(([k,p])=>`<button class="${S.segmento===k?'on':''}" data-act="md-seg" data-v="${k}">${esc(p.nome)}</button>`).join('')}</div>
    ${ui.mdSegArm?`<div class="verdict bad">Trocar para "${esc(MD_PRESETS[ui.mdSegArm].nome)}" substitui unidades e despesas pelo modelo. Os meses lançados ficam, mas podem perder a ligação. <button class="btn sm" data-act="md-seg-ok">Trocar mesmo assim</button> <button class="btn sm" data-act="md-seg-no">Cancelar</button></div>`:''}
    <div class="mdrows" style="max-width:640px"><label class="mdrow"><span>Ano</span>${mdIn(S,'ano','text')}</label><label class="mdrow"><span>IRPJ + CSLL sobre o lucro (%)<small>Simples Nacional: deixe 0</small></span>${mdIn(S,'ir','pct','0')}</label><label class="mdrow"><span>Lucro desejado por mês</span>${mdIn(S,'lucroDesejado','money','0')}</label></div></section>
   <section class="block"><div class="block-h"><h3>${esc(rot.uns)} e premissas</h3><p>Percentuais sobre a receita bruta de cada ${esc(rot.un.toLowerCase())}. Usados para estimar o que não for lançado.</p></div>
    <div class="tblw"><table class="tbl"><thead><tr><th>Nome</th>${S.segmento==='educacao'?'<th>UN do diagnóstico</th>':''}<th class="r">Impostos</th><th class="r">${esc(rot.ded)}</th><th class="r">${esc(rot.inad)}</th><th class="r">${esc(rot.cus)}</th><th class="r">Comissões</th><th class="r">Taxas</th><th></th></tr></thead><tbody>
     ${S.unidades.map((u,i)=>`<tr><td>${mdIn(S,`unidades.${i}.nome`,'text')}</td>${S.segmento==='educacao'?`<td><select data-md="unidades.${i}.un" data-mk="sel"><option value="">Nenhuma</option>${UNS.map(x=>`<option value="${x.id}" ${u.un===x.id?'selected':''}>${esc(x.nome)}</option>`).join('')}</select></td>`:''}
      ${['imp','ded','inad','cus','com','taxa'].map(k=>`<td>${mdIn(S,`unidades.${i}.${k}`,'pct','0')}</td>`).join('')}<td class="x">${S.unidades.length>1?`<button class="xbtn" data-act="md-delun" data-i="${i}" aria-label="Remover">×</button>`:''}</td></tr>`).join('')}</tbody></table></div>
    <div><button class="btn sm" data-act="md-addun">+ ${esc(rot.un)}</button></div></section>`; }
function renderDRE(){
  if(!cur.mods) cur.mods={};
  if(!cur.mods.dre) cur.mods.dre=mdNovo('educacao');
  const S=cur.mods.dre=mdMigra(cur.mods.dre), C=mdCalc(S), tab=ui.mdTab||'painel';
  const corpo={painel:mdPainel,lancar:mdLancar,dre:mdDRE,orcamento:mdOrcamento,dividas:mdDividasHtml,config:mdConfig}[tab]||mdPainel;
  $('#main').innerHTML=`<section class="panel">
   <header class="ph" style="grid-template-columns:minmax(0,1fr)"><div><span class="eyebrow">Módulo · <b>DRE</b></span><h2 style="margin-top:8px">DRE e orçamento</h2><p class="lead">${esc(MD_PRESETS[S.segmento].nome)} · ${esc(S.ano)}. Lance o mês, acompanhe orçado x realizado e o equilíbrio. Os números vão sozinhos para o diagnóstico.</p></div></header>
   <nav class="subtabs" aria-label="Seções do DRE">${MD_TABS.map(([k,l])=>`<button class="${tab===k?'on':''}" data-act="md-tab" data-v="${k}" ${tab===k?'aria-current="page"':''}>${l}</button>`).join('')}</nav>
   ${corpo(S,C)}</section>`;
}
function mdCsv(S){ const C=mdCalc(S), rot=mdRot(S); const rows=[['Mês','Situação',rot.rec,...S.unidades.map(u=>rot.rec+' '+u.nome),rot.ded,'Impostos',rot.inad,'Receita líquida',rot.cus,'Lucro bruto','Comissões','Taxas','Margem de contribuição',...MD_GRUPOS.map(g=>g[1]),'EBITDA','Juros','Tarifas','IR/CSLL','Lucro líquido','Equilíbrio de caixa']];
  C.real.forEach((x,i)=>rows.push([MD_MESES[i],S.meses[i].lancado?'Fechado':'Aberto',x.rb,...S.unidades.map(u=>x.u[u.id].rb),x.ded,x.imp,x.inad,x.rl,x.cus,x.lb,x.com,x.taxa,x.mc,...MD_GRUPOS.map(g=>x.grupos[g[0]]),x.ebitda,x.juros,x.fin,x.ir,x.ll,x.peFin].map(v=>typeof v==='number'?String(Math.round(v)):v)));
  return '﻿'+rows.map(r=>r.map(c=>/[;"\n]/.test(c)?`"${c.replace(/"/g,'""')}"`:c).join(';')).join('\n'); }
function mdParse(t){ if(t==null)return null; let s=String(t).trim().replace(/R\$|\s|%/gi,''); if(s==='')return null; if(s.includes(','))s=s.replace(/\./g,'').replace(',','.'); else if(/^-?\d{1,3}(\.\d{3})+$/.test(s))s=s.replace(/\./g,''); const n=Number(s); return isFinite(n)?n:null; }
/* eventos do módulo (chamados pelo app.js) */
function mdChange(t){ const S=cur.mods.dre, p=t.dataset.md, k=t.dataset.mk; let v;
  if(k==='text'||k==='sel')v=t.value; else { v=mdParse(t.value); if(v!==null&&k==='pct')v=v/100; }
  mdSet(S,p,v); mdMudou(); }
function mdClick(act,d){ const S=cur.mods.dre;
  if(act==='md-tab'){ ui.mdTab=d.v; render(); window.scrollTo({top:0}); return; }
  if(act==='md-mes'){ ui.mdMes=+d.v; render(); return; }
  if(act==='md-modo'){ ui.mdModo=d.v; render(); return; }
  if(act==='md-padrao'){ const M=S.meses[ui.mdMes??Math.max(0,new Date().getMonth()-1)]; S.categorias.forEach(c=>{ if(typeof M.desp[c.id]!=='number'&&typeof c.padrao==='number')M.desp[c.id]=c.padrao; }); mdMudou(); return; }
  if(act==='md-fechar'){ const M=S.meses[ui.mdMes??Math.max(0,new Date().getMonth()-1)]; M.lancado=!M.lancado; mdMudou(); return; }
  if(act==='md-repete'){ S.unidades.forEach(u=>{ const a=S.metas[u.id]; if(a&&typeof a[0]==='number')S.metas[u.id]=a.map(v=>typeof v==='number'?v:a[0]); }); mdMudou(); return; }
  if(act==='md-addcat'){ S.categorias.push({id:mdUid(),nome:'Nova despesa',grupo:'outros',padrao:null}); mdMudou(); return; }
  if(act==='md-adddiv'){ S.dividas.push({id:mdUid(),credor:'',saldo:null,taxa:null,parcela:null}); mdMudou(); return; }
  if(act==='md-del'){ S[d.l].splice(+d.i,1); mdMudou(); return; }
  if(act==='md-addun'){ const id='u'+mdUid().slice(0,5); S.unidades.push({id,nome:'Nova '+mdRot(S).un.toLowerCase(),un:'',imp:0,ded:0,inad:0,cus:0,com:0,taxa:0}); S.metas[id]=Array(12).fill(null); mdMudou(); return; }
  if(act==='md-delun'){ const u=S.unidades[+d.i]; S.unidades.splice(+d.i,1); if(u)delete S.metas[u.id]; mdMudou(); return; }
  if(act==='md-seg'){ if(d.v===S.segmento)return; const vazio=!S.meses.some(M=>M.lancado)&&!S.unidades.some(u=>(S.metas[u.id]||[]).some(v=>typeof v==='number'));
    if(vazio){ const n=mdNovo(d.v); n.ano=S.ano; cur.mods.dre=n; ui.mdSegArm=null; mdMudou(); } else { ui.mdSegArm=d.v; render(); } return; }
  if(act==='md-seg-ok'){ const n=mdNovo(ui.mdSegArm); n.ano=S.ano; n.meses=S.meses; n.dividas=S.dividas; cur.mods.dre=n; ui.mdSegArm=null; mdMudou(); return; }
  if(act==='md-seg-no'){ ui.mdSegArm=null; render(); return; }
  if(act==='md-csv'){ dlFile(`dre-${slugN(cur.nome)}-${S.ano}.csv`,mdCsv(S),'text/csv;charset=utf-8'); return; }
}
