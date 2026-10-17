/* =====================================================================
   Leitura inteligente das fontes (Base de conhecimento)
   Lê o que foi colado do NotebookLM, arquivos (PDF, Word, Excel, CSV) e o
   site, e sugere o que preencher: cursos, alunos e metas por UN,
   calendário de captação, concorrentes e diferenciais.
   O sistema sugere, a pessoa decide: nada entra sem clique.
   Duas leituras:
   1) Automática, no navegador: entende listas, títulos, tópicos e planilhas.
   2) Com IA (se a chave estiver configurada no Supabase): lê texto corrido.
   ===================================================================== */
const LT_CAMPOS=[['calendario','base.calendario','Calendário de captação'],['concorrentes','base.concorrentes','Concorrentes'],['diferenciais','base.diferenciais','Diferenciais']];
const LT_SECAO={
  calendario:/calend[aá]rio|cronograma|vestibular|processo seletivo|inscri[cç]|matr[ií]cula|datas|prazos|ingresso|enem|capta[cç][aã]o/i,
  concorrentes:/concorr|competi|benchmark|mercado e concorr/i,
  diferenciais:/diferencia|vantage|destaque|reconhec|acredita|pr[eê]mi|ranking|selo|nota (no )?mec|enade|por que (a|o|escolher)|pontos fortes|proposta de valor/i
};
const LT_DATA=/\b\d{1,2}\/\d{1,2}(\/\d{2,4})?\b|\b\d{1,2} de (jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[a-zç]*\b|\b(janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\b|\b[12]º? ?semestre\b|\b20\d\d\.[12]\b/i;
const LT_CAPT=/vestibular|inscri[cç]|matr[ií]cula|processo seletivo|enem|prova|resultado|in[ií]cio das aulas|aulas come[cç]am|rematr[ií]cula|edital|transfer[eê]ncia|segunda gradua|bolsa|prouni|fies|campanha|capta[cç]/i;

const ltLimpa=t=>String(t||'').replace(/\*+|__|`/g,'').replace(/\s+/g,' ').trim();
function ltUn(t){ t=t||''; if(/mestrado|doutorado|stricto/i.test(t)) return 'mestrado'; if(/curta dura|extens[aã]o|educa[cç][aã]o (executiva|continuada)|corporate|livres?\b/i.test(t)) return ''; return (UN_ALIAS.find(([,re])=>re.test(t))||[])[0]||''; }
function ltMod(t){ return typeof modDe==='function'?modDe(t):''; }

/* Texto com títulos e tópicos (markdown do NotebookLM, Word, PDF) */
function ltParseTopicos(txt){
  const cursos=[], buckets={calendario:[],concorrentes:[],diferenciais:[]};
  let un='', topo='', grupo='', mod='', secao=''; let pilha=[];
  const ctx=()=>{ const t=pilha[pilha.length-1]; return {grupo:[topo,t?t.grupo:grupo].filter(Boolean).join(' · '), mod:(t&&t.mod)||mod, secao:(t&&t.secao)||secao}; };
  const addCurso=(nome,extra)=>{ nome=ltLimpa(nome).replace(/[.;:]$/,'').trim(); if(!nome||nome.length<3||nome.length>140) return;
    const c=ctx(); let obs=[c.grupo].filter(Boolean); let m=c.mod;
    const par=nome.match(/^(.*?)\s*\(([^)]*)\)\s*$/); if(par){ nome=par[1].trim(); const p=par[2]; if(ltMod(p)) m=m||ltMod(p); obs.push(p); }
    if(extra) obs.push(extra);
    cursos.push({id:uid(),un,nome,modalidade:m||'',turno:'',preco:'',vagas:'',matriculados:'',status:/lan[cç]amento|em breve|novo curso/i.test(nome+' '+(c.grupo||''))?'Lançamento':'Vigente',lancamento:'',obs:obs.filter((x,i,a)=>x&&a.indexOf(x)===i).join(' · ')}); };
  String(txt||'').split(/\r?\n/).forEach(raw=>{
    if(!raw.trim()||/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(raw)) return;
    const ind=raw.match(/^\s*/)[0].replace(/\t/g,'    ').length;
    const h=raw.match(/^\s*(#{1,6})\s+(.*)$/);
    if(h){ const t=ltLimpa(h[2]).replace(/^\d+[.)]\s*/,'').replace(/:$/,'').trim(); const lv=h[1].length; pilha=[];
      const sec=Object.keys(LT_SECAO).find(k=>LT_SECAO[k].test(t)&&!/curso|gradua|p[oó]s|mestrado|col[eé]gio/i.test(t))||'';
      if(lv<=3){ un=ltUn(t); topo=un?'':t.replace(/\s*\(.*\)\s*$/,''); grupo=''; mod=ltMod(t); secao=sec; }
      else { grupo=t; mod=ltMod(t)||(secao?'':mod); if(sec) secao=sec; }
      return; }
    const b=raw.match(/^\s*(?:[*\-•+]|\d+[.)])\s+(.*)$/);
    const linha=b?b[1]:raw.trim();
    while(pilha.length&&pilha[pilha.length-1].ind>=ind) pilha.pop();
    const c=ctx();
    // seção de calendário, concorrentes ou diferenciais: o item vai para o campo
    if(c.secao){ if(!b&&!LT_DATA.test(linha)) return; const t=ltLimpa(linha); if(t&&t.length>3&&!/^deseja que eu|^quer que eu/i.test(t)) buckets[c.secao].push(t); return; }
    if(!b) return; // parágrafo solto fora de seção: só serve de contexto
    // "**Rótulo**:" sozinho abre um subgrupo
    const so=linha.match(/^\*{0,2}([^*:]{2,120}?)\*{0,2}:\s*\*{0,2}\s*$/);
    if(so){ const t=ltLimpa(so[1]); const sec=Object.keys(LT_SECAO).find(k=>LT_SECAO[k].test(t)&&!/curso/i.test(t))||'';
      pilha.push({ind,grupo:t.replace(/^modalidade\s+/i,'').replace(/\s*\(.*\)$/,''),mod:ltMod(t),secao:sec}); return; }
    // "**Rótulo**: a; b; c" ou "*Rótulo*: curso"
    const rot=linha.match(/^\*{1,2}([^*]{2,120})\*{1,2}\s*:\s*(.+)$/);
    if(rot){ const t=ltLimpa(rot[1]), resto=rot[2];
      const partes=resto.split(/;\s*/).map(x=>x.trim()).filter(Boolean);
      pilha.push({ind:ind+0.5,grupo:t,mod:ltMod(t)||c.mod,secao:''});
      if(partes.length>1) partes.forEach(p=>addCurso(p)); else addCurso(resto);
      pilha.pop(); return; }
    addCurso(linha);
  });
  return {cursos,...buckets};
}

/* Planilha (Excel ou CSV) e texto de linhas soltas: procura datas de captação */
function ltLinhasCalendario(txt){
  const out=[];
  String(txt||'').split(/\r?\n/).forEach(l=>{ const t=ltLimpa(l.replace(/^[\s*\-•+]+/,'').replace(/\s*[|;\t]\s*/g,' · ').replace(/(· )+/g,'· ').replace(/^· |· $/g,''));
    if(t.length<6||t.length>220) return;
    if(LT_DATA.test(t)&&LT_CAPT.test(t)) out.push(t); });
  return out;
}

/* Leitura automática completa de uma fonte */
function lerFonteAuto(f){
  const txt=String(f.conteudo||'');
  const L=txt.split(/\r?\n/).filter(l=>l.trim());
  const topicos=L.filter(l=>/^\s*(#{1,6}\s|[*\-•+]\s|\d+[.)]\s)/.test(l)).length;
  let r;
  const abas=txt.split(/^## Aba: .*$/m).filter(t=>t.trim());
  if(typeof sepDe==='function'&&abas.some(t=>sepDe(t))) r={cursos:abas.flatMap(t=>sepDe(t)?cursoParseTabela(t,true):[]),calendario:[],concorrentes:[],diferenciais:[]};
  else if(topicos>=Math.max(3,L.length*0.25)) r=ltParseTopicos(txt);
  else { const cs=typeof cursoParse==='function'?cursoParse(txt):[]; r={cursos:cs.filter(c=>c.un||c.modalidade),calendario:[],concorrentes:[],diferenciais:[]}; }
  // datas de captação em qualquer lugar do texto (planilha de calendário, por exemplo)
  ltLinhasCalendario(txt).forEach(t=>{ if(!r.calendario.includes(t)) r.calendario.push(t); });
  // um arquivo de calendário não é lista de cursos
  if(/calend|cronograma|vestibular/i.test(f.titulo||'')&&r.calendario.length>=3) r.cursos=[];
  // diferenciais no site lido com IA
  const ia=f.dados&&f.dados.ia&&!f.dados.ia.erro?f.dados.ia:null;
  if(ia){ (ia.diferenciais||[]).forEach(t=>t&&!r.diferenciais.includes(t)&&r.diferenciais.push(t)); (ia.processos_seletivos||[]).forEach(t=>t&&!r.calendario.includes(t)&&r.calendario.push(t)); }
  return r;
}

/* Junta a leitura automática com a da IA (quando houver) */
function leituraDe(f){
  const a=lerFonteAuto(f), ia=f.dados&&f.dados.leitura&&!f.dados.leitura.erro?f.dados.leitura:null;
  if(!ia) return {...a,capacidade:[],resumo:'',via:'auto'};
  const cursosIA=(ia.cursos||[]).filter(c=>c&&c.nome).map(c=>({id:uid(),un:UNS.some(u=>u.id===c.un)?c.un:'',nome:String(c.nome).trim(),modalidade:['Presencial','EAD','Híbrido'].includes(c.modalidade)?c.modalidade:'',turno:['Diurno','Noturno','Integral','Flexível'].includes(c.turno)?c.turno:'',preco:c.preco||'',vagas:c.vagas||'',matriculados:c.matriculados||'',status:c.status==='Lançamento'?'Lançamento':'Vigente',lancamento:'',obs:c.obs||''}));
  const un=(x,y)=>[...x,...y.filter(t=>t&&!x.includes(t))];
  return {cursos:cursosIA.length>=a.cursos.length?cursosIA:a.cursos,calendario:un(ia.calendario||[],a.calendario),concorrentes:un(ia.concorrentes||[],a.concorrentes),diferenciais:un(ia.diferenciais||[],a.diferenciais),
    capacidade:(ia.capacidade||[]).filter(x=>x&&CAPROWS.some(r=>r[0]===x.linha)),resumo:ia.resumo||'',via:'ia'};
}

const ltChave=c=>[c.un,c.nome,c.modalidade,c.obs||''].join('|').toLowerCase();
const ltNovosCursos=L=>{ const ja=new Set(cur.cursos.map(c=>[c.un,c.nome].join('|').toLowerCase())); const vistos=new Set(); return L.filter(c=>{ const k=ltChave(c); if(ja.has([c.un,c.nome].join('|').toLowerCase())||vistos.has(k)) return false; vistos.add(k); return true; }); };
const ltNovasLinhas=(chave,L)=>{ const atual=String(cur.campos[chave]||'').toLowerCase(); return L.filter(t=>!atual.includes(t.toLowerCase().slice(0,60))); };
const ltCapNovas=L=>L.filter(x=>['alunos','meta','captados','ticket'].some(k=>x[k]!=null&&x[k]!==''&&!cur.campos[`base.cap.${x.linha}.${k==='alunos'?'vagas':k}`]));

let ltCache={};
function leituraHtml(f){
  const k=f.id+'|'+String(f.conteudo||'').length+'|'+(f.dados&&f.dados.leitura?1:0)+'|'+cur.cursos.length+'|'+LT_CAMPOS.map(x=>String(cur.campos[x[1]]||'').length).join(',');
  if(Object.keys(ltCache).length>40) ltCache={}; const r=ltCache[k]||(ltCache[k]=leituraDe(f));
  const cs=ltNovosCursos(r.cursos), mx=cursosMesclar(r.cursos,true), cap=ltCapNovas(r.capacidade||[]);
  const blocos=LT_CAMPOS.map(([id,ch,nm])=>[id,ch,nm,ltNovasLinhas(ch,r[id]||[])]).filter(x=>x[3].length);
  const lendo=ui.ltLendo===f.id, ia=f.dados&&f.dados.leitura;
  const porUn=[...UNS.map(u=>[u.nome,cs.filter(c=>c.un===u.id).length]),['sem UN',cs.filter(c=>!c.un).length]].filter(x=>x[1]).map(x=>`${x[0]} ${x[1]}`).join(' · ');
  const nada=!mx.novos&&!mx.atual&&!cap.length&&!blocos.length;
  return `<div class="lt">
    <div class="lt-h"><b>${nada?'Leitura feita':'O que a leitura encontrou'}</b><span class="muted">${r.via==='ia'?'Lido com IA e conferido pela leitura automática':'Leitura automática'}${nada?': nada novo para a base. O que já estava aqui foi aproveitado.':'. Confira e adicione o que fizer sentido.'}</span>
      <button class="btn sm" data-act="lt-ia" data-id="${f.id}" ${lendo?'disabled':''}>${lendo?'Lendo com IA…':ia?'Ler de novo com IA':'Ler com IA'}</button></div>
    ${ia&&ia.erro?`<p class="lt-aviso"><span class="i">!</span><span>${esc(ia.erro)}</span></p>`:''}
    ${r.resumo?`<p class="fres">${esc(r.resumo)}</p>`:''}
    ${mx.novos||mx.atual?`<div class="lt-b"><div><b>${[mx.novos?pl(mx.novos,'curso novo','cursos novos'):'',mx.atual?pl(mx.atual,'curso com números novos','cursos com números novos'):''].filter(Boolean).join(' e ')}</b><small>${esc(porUn)}</small><div class="lt-ex">${cs.slice(0,6).map(c=>`<span class="tag">${esc(c.nome)}</span>`).join('')}${cs.length>6?`<span class="muted">+ ${cs.length-6}</span>`:''}</div></div><button class="btn sm primary" data-act="lt-cursos" data-id="${f.id}">Levar para a tabela</button></div>`:''}
    ${cap.length?`<div class="lt-b"><div><b>Alunos e metas por UN</b><small>${cap.map(x=>{ const row=CAPROWS.find(r=>r[0]===x.linha); return `${row[2]} ${row[3]}: ${[x.alunos!=null&&x.alunos!==''?x.alunos+' alunos':'',x.meta?'meta '+x.meta:'',x.captados?x.captados+' captados':'',x.ticket?'R$ '+x.ticket:''].filter(Boolean).join(', ')}`; }).map(esc).join(' · ')}</small></div><button class="btn sm primary" data-act="lt-cap" data-id="${f.id}">Preencher capacidade</button></div>`:''}
    ${blocos.map(([id,ch,nm,L])=>`<div class="lt-b"><div><b>${nm}</b><small>${pl(L.length,'linha','linhas')} para o campo</small><ul class="lt-l">${L.slice(0,4).map(t=>`<li>${esc(t.length>140?t.slice(0,139)+'…':t)}</li>`).join('')}${L.length>4?`<li class="muted">+ ${L.length-4}</li>`:''}</ul></div><button class="btn sm primary" data-act="lt-campo" data-id="${f.id}" data-v="${id}">Adicionar ao campo</button></div>`).join('')}
  </div>`;
}

async function ltLerIA(f){
  ui.ltLendo=f.id; render();
  try{
    const r=await sb.functions.invoke('ler-fonte',{body:{titulo:f.titulo,texto:String(f.conteudo||'').slice(0,120000)}});
    let d=r.data; if(r.error){ let m=r.error.message||'erro'; try{ const b=await r.error.context.json(); if(b&&b.erro)m=b.erro; }catch(e){} throw new Error(m); }
    if(typeof d==='string'){ try{ d=JSON.parse(d); }catch(e){} }
    if(!d) throw new Error('resposta vazia');
    f.dados={...(f.dados||{}),leitura:d.erro?{erro:d.erro}:d}; touch(true);
    toast(d.erro?d.erro:'Leitura com IA pronta');
  }catch(e){ console.error(e); f.dados={...(f.dados||{}),leitura:{erro:/not found|404|Failed to send/i.test(String(e.message))?'A leitura com IA ainda não está ligada. A leitura automática continua valendo.':'Não foi possível ler com IA: '+(e.message||e)}}; touch(true); }
  ui.ltLendo=null; render();
}

function leituraClick(act,d){
  const f=cur&&cur.fontes.find(x=>x.id===d.id); if(!f) return false;
  const r=leituraDe(f);
  if(act==='lt-ia'){ ltLerIA(f); return true; }
  if(act==='lt-cursos'){ const x=cursosMesclar(r.cursos); toast(`${pl(x.novos,'curso novo','cursos novos')}${x.atual?` e ${pl(x.atual,'curso atualizado','cursos atualizados')}`:''} na tabela`); return true; }
  if(act==='lt-cap'){ let n=0; ltCapNovas(r.capacidade||[]).forEach(x=>[['alunos','vagas'],['meta','meta'],['captados','captados'],['ticket','ticket']].forEach(([a,b])=>{ const k=`base.cap.${x.linha}.${b}`; if(x[a]!=null&&x[a]!==''&&!cur.campos[k]){ cur.campos[k]=String(x[a]).replace(/[^\d,.]/g,''); n++; } })); touch(true); toast(`${n} números preenchidos na capacidade`); return true; }
  if(act==='lt-campo'){ const c=LT_CAMPOS.find(x=>x[0]===d.v); if(!c) return true; const L=ltNovasLinhas(c[1],r[c[0]]||[]); if(!L.length) return true;
    const atual=String(cur.campos[c[1]]||'').trim(); cur.campos[c[1]]=(atual?atual+'\n\n':'')+`De "${f.titulo||'fonte'}":\n`+L.map(t=>'- '+t).join('\n'); touch(true); toast(`${pl(L.length,'linha adicionada','linhas adicionadas')} em ${c[2]}`); return true; }
  return false;
}

/* ---------- Capacidade a partir dos cursos ---------- */
function capLinhaDoCurso(c){
  const m=c.modalidade, t=c.turno;
  if(c.un==='colegio') return 'colegio';
  if(c.un==='mestrado') return 'mestrado';
  if(c.un==='graduacao'){ if(m==='EAD') return 'grad_ead'; if(t==='Noturno') return 'grad_noturno'; if(t==='Diurno'||t==='Integral') return 'grad_diurno'; return ''; }
  if(c.un==='pos'){ if(m==='EAD') return 'pos_ead'; if(m==='Híbrido') return 'pos_hibrido'; if(m==='Presencial') return 'pos_noturno'; return ''; }
  return '';
}
function capDosCursos(un){
  const L={}; let semLinha=0, comNum=0;
  cur.cursos.filter(c=>c.status!=='Descontinuado'&&(!un||c.un===un)).forEach(c=>{
    const v=num(c.vagas), mt=num(c.meta), mat=num(c.matriculados), tu=num(c.turmas), pr=num(c.preco);
    if(v==null&&mt==null&&mat==null&&tu==null) return; comNum++;
    const k=capLinhaDoCurso(c); if(!k){ semLinha++; return; }
    const x=L[k]=L[k]||{vagas:null,meta:null,captados:null,turmas:null,pSoma:0,pPeso:0,n:0}; x.n++;
    const add=(f,val)=>{ if(val!=null) x[f]=(x[f]||0)+val; }; add('vagas',v); add('meta',mt); add('captados',mat); add('turmas',tu);
    if(pr!=null){ const w=mat||1; x.pSoma+=pr*w; x.pPeso+=w; }
  });
  Object.values(L).forEach(x=>{ x.ticket=x.pPeso?Math.round(x.pSoma/x.pPeso*100)/100:null; });
  return {L,semLinha,comNum};
}
function capCursosHtml(un){
  const {L,semLinha,comNum}=capDosCursos(un); const ks=Object.keys(L); if(!ks.length) return '';
  const tot=f=>ks.reduce((s,k)=>s+(L[k][f]||0),0);
  const dif=ks.some(k=>['vagas','meta','captados'].some(f=>L[k][f]!=null&&num(cur.campos[`base.cap.${k}.${f}`])!==L[k][f]));
  return `<div class="lt lt-cap"><div class="lt-h"><b>Somando os cursos</b><span class="muted">${pl(comNum,'curso tem','cursos têm')} números: ${[tot('vagas')?`${tot('vagas').toLocaleString('pt-BR')} alunos de capacidade${tot('turmas')?` em ${tot('turmas').toLocaleString('pt-BR')} turmas`:''}`:tot('turmas')?`${tot('turmas').toLocaleString('pt-BR')} turmas`:'',tot('meta')?`meta de ${tot('meta').toLocaleString('pt-BR')}`:'',tot('captados')?`${tot('captados').toLocaleString('pt-BR')} matriculados`:''].filter(Boolean).join(', ')}.${semLinha?` ${pl(semLinha,'curso ficou','cursos ficaram')} fora da soma por falta de UN, modalidade ou turno.`:''}</span>
    ${dif?`<button class="btn sm primary" data-act="cap-somar" data-v="${un||''}">Preencher a tabela com a soma</button>`:'<span class="tag ok">Tabela igual à soma dos cursos</span>'}</div></div>`;
}
function capSomar(un){
  const {L}=capDosCursos(un); let n=0;
  Object.entries(L).forEach(([k,x])=>{ [['vagas','vagas'],['meta','meta'],['captados','captados'],['ticket','ticket']].forEach(([a,b])=>{ if(x[a]!=null){ cur.campos[`base.cap.${k}.${b}`]=String(x[a]).replace('.',','); n++; } }); });
  touch(true); toast(`Capacidade preenchida com a soma dos cursos (${n} números)`);
}
