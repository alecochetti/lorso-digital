/* =====================================================================
   Leitura de edital (Base de conhecimento)
   Quando a fonte é um edital de processo seletivo, lê o que importa para
   a captação: cursos e vagas por turno, reconhecimento e notas do MEC,
   regras de ingresso e o período do processo seletivo.
   Funciona com o texto do PDF em linhas ou numa linha só (fontes antigas).
   O sistema sugere, a pessoa decide: nada entra sem clique.
   Carregado depois de leitura.js.
   ===================================================================== */
const ED_MESES=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const ED_TURNOS=['Matutino','Vespertino','Noturno','Integral','Diurno'];
const edSemAcento=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'');
const edPlano=t=>String(t||'').replace(/\s+/g,' ').trim();

function edUn(cab){ const t=edSemAcento(cab).toLowerCase();
  if(/mestrado|doutorado|stricto/.test(t)) return 'mestrado';
  if(/pos-gradua|pos gradua|lato sensu|\bmba\b|especializa/.test(t)) return 'pos';
  if(/gradua|vestibular|\benem\b|bacharel|tecnolog/.test(t)) return 'graduacao';
  if(/colegio|ensino fundamental|educacao infantil/.test(t)) return 'colegio';
  return ''; }
function edSemestre(t){ let m=t.match(/PROCESSO SELETIVO\s+(\d{4})\s*[-./]\s*([12])/i); if(m) return `${m[1]}.${m[2]}`;
  m=t.match(/([12])\s*[oº°]\s*semestre do ano letivo de\s+(\d{4})/i); if(m) return `${m[2]}.${m[1]}`;
  m=t.match(/\b(20\d{2})[./-]([12])\b/); return m?`${m[1]}.${m[2]}`:''; }

/* nome do curso no edital → nome que já está na base, quando for o mesmo curso */
const edCore=n=>edSemAcento(n).toLowerCase().replace(/^(com\.?|comunicacao)\s+social\s+com\s+hab\.?\s+em\s+/,'').replace(/^(cst|curso superior de tecnologia)\s+em\s+/,'').replace(/^(bacharelado|licenciatura|tecnologia)\s+em\s+/,'').replace(/[^a-z0-9 ]+/g,' ').replace(/\s+/g,' ').trim();
function edNomeBase(nome,un){ const k=edCore(nome); if(!k) return nome;
  const L=cur.cursos.filter(c=>!un||c.un===un||!c.un); const ig=L.find(c=>edCore(c.nome)===k); if(ig) return ig.nome;
  const pc=L.filter(c=>{ const x=edCore(c.nome); return x.length>=6&&(x.includes(k)||k.includes(x)); }); return pc.length===1?pc[0].nome:nome; }

const ED_CAB=new Set(['campus','vagas','alunos','por','turma','curso','cursos','total','de','conceito','modalidade','ofertada','ato','legal','cpc','enade','legenda','r','sc','reconhecido']);
const edTiraCab=s=>{ const w=String(s).split(/\s+/).filter(Boolean); while(w.length&&(ED_CAB.has(edSemAcento(w[0]).toLowerCase().replace(/[^a-z]/g,''))||ED_TURNOS.includes(w[0])||/^liberdade$/i.test(w[0])||/^[-:–]+$/.test(w[0]))) w.shift(); return w.join(' ').trim(); };

/* Tabela de vagas: "Curso  Matutino Noturno Total  Alunos por turma (Matutino Noturno)" */
function edVagas(T){
  const TR=ED_TURNOS.join('|'); const h=T.match(new RegExp(`((?:${TR})(?:\\s+(?:${TR}))*)\\s+Total(?: de vagas)?`,'i')); if(!h) return null;
  const turnos=[]; h[1].split(/\s+/).forEach(t=>{ const k=ED_TURNOS.find(x=>x.toLowerCase()===t.toLowerCase()); if(k&&!turnos.includes(k)) turnos.push(k); });
  const ini=h.index+h[0].length; const fim=T.slice(ini).search(/TOTAL DE VAGAS|Legenda/i); const seg=T.slice(ini,fim>0?ini+fim:ini+6000);
  const n=turnos.length*2+1; const tok=seg.split(/\s+/).filter(Boolean); const rows=[]; let nome=[];
  for(let i=0;i<tok.length;i++){
    const isNum=x=>/^(\d{1,5}|-|–)$/.test(x||'');
    if(isNum(tok[i])&&tok.slice(i,i+n).length===n&&tok.slice(i,i+n).every(isNum)){
      const v=tok.slice(i,i+n).map(x=>/^\d+$/.test(x)?+x:null); const nm=edTiraCab(nome.join(' '));
      if(nm&&nm.length>=3&&nm.length<=90) rows.push({nome:nm,vagas:turnos.map((t,j)=>v[j]),total:v[turnos.length],porTurma:turnos.map((t,j)=>v[turnos.length+1+j])});
      nome=[]; i+=n-1; }
    else nome.push(tok[i]); }
  const tot=(T.match(/TOTAL DE VAGAS\s+(\d{2,6})/i)||[])[1];
  return rows.length?{turnos,rows,total:tot?+tot:rows.reduce((a,r)=>a+(r.total||0),0)}:null; }

/* Tabela de reconhecimento: "Curso  Presencial  R  Port. 384 de 13/08/2024  4  4" */
function edMec(T){ const out=[]; const re=/([A-ZÀ-Ú][\wÀ-ú.,' ]{2,90}?)\s+(Presencial|EAD|A distância|Híbrido|Semipresencial)\s+([RA])\s+(Port(?:aria)?\.?\s*n?º?\s*\d+[^0-9]{1,6}\d{1,2}\/\d{1,2}\/\d{4})\s+(\S+)\s+(\S+)/g; let m;
  while((m=re.exec(T))){ const nome=edTiraCab(edPlano(m[1])); if(nome.length>=3) out.push({nome,modalidade:/dist|ead/i.test(m[2])?'EAD':m[2]==='Semipresencial'?'Híbrido':m[2],ato:m[3]==='R'?'reconhecido':'autorizado',portaria:edPlano(m[4]),cpc:m[5],enade:m[6]}); }
  return out; }

function edPeriodo(T){ const m=T.match(/(?:iniciar-se-[aá]|ter[aá] in[ií]cio|ocorrer[aã]o)[^.]{0,40}?em\s+([a-zç]+)\s+de\s+(\d{4})[^.]{0,160}?at[eé]\s+([a-zç]+)\s+de\s+(\d{4})/i)||T.match(/entre\s+([a-zç]+)\s+de\s+(\d{4})\s+e\s+([a-zç]+)\s+de\s+(\d{4})/i);
  if(!m) return null; const mi=ED_MESES.findIndex(x=>edSemAcento(x)===edSemAcento(m[1]).toLowerCase())+1, mf=ED_MESES.findIndex(x=>edSemAcento(x)===edSemAcento(m[3]).toLowerCase())+1; if(!mi||!mf) return null;
  const pad=n=>String(n).padStart(2,'0'), ult=new Date(+m[4],mf,0).getDate();
  return {ini:`${m[2]}-${pad(mi)}-01`,fim:`${m[4]}-${pad(mf)}-${pad(ult)}`,txt:`${m[1].toLowerCase()} de ${m[2]} a ${m[3].toLowerCase()} de ${m[4]}`}; }

/* Regras que mudam a captação, em frases curtas */
function edRegras(T,p){ const R=[]; const add=s=>s&&!R.includes(s)&&R.push(s); let m;
  if(p) add(`Processo seletivo de ${p.txt}${/cont[ií]nua/i.test(T)?', contínuo enquanto houver vagas':''}${/prorrogad/i.test(T)?' (pode ser prorrogado pela Reitoria)':''}.`);
  if((m=T.match(/oferecendo\s+(\d{2,6})/i))) add(`${(+m[1]).toLocaleString('pt-BR')} vagas no processo seletivo.`);
  if((m=T.match(/m[ií]nimo,?\s+(?:de\s+)?(\d{1,3})\s*\(\w+\)\s*alunos/i))) add(`Turma só abre com no mínimo ${m[1]} alunos matriculados no turno${/semestres subsequentes/i.test(T)?' (vale também nos semestres seguintes)':''}.`);
  if((m=T.match(/matutino migrar[aã]o[^.]{0,80}?(\d{1,2})\s*[ºo°]/i))) add(`Cursos do matutino migram para o noturno a partir do ${m[1]}º semestre.`);
  if((m=T.match(/taxa de inscri[cç][aã]o[^.]{0,80}?R\$\s?([\d.,]+)/i))) add(`Taxa de inscrição do vestibular: R$ ${m[1].replace(/,00$/,'')}${/n[aã]o ser[aá] cobrada[^.]{0,80}enem/i.test(T)?' (sem taxa para ENEM, transferência e portador de diploma)':''}.`);
  if((m=T.match(/(\d{1,3})%\s*das vagas para cada modalidade/i))) add(`Vagas divididas por modalidade de ingresso: ${m[1]}% para cada uma, por curso e turno.`);
  const en=T.match(/Enem a partir de\s+(\d{4})/i), nm=T.match(/nota m[ií]nima de\s+(\d{2,4})\s*pontos/i);
  if(en||nm) add(`ENEM${en?` a partir de ${en[1]}`:''}${nm?`, nota mínima ${nm[1]} na média${/diferente de zero na reda/i.test(T)?' e redação diferente de zero':''}`:''}${/treineiros/i.test(T)?'; sem treineiros':''}.`);
  const q=T.match(/composta de\s+(\d{1,3})\s*\(\w+\)\s*quest/i), h=T.match(/dura[cç][aã]o m[aá]xima de\s+(\d)/i);
  if(q||/reda[cç][aã]o/i.test(T)&&/vestibular/i.test(T)) add(`Vestibular: redação${q?` e ${q[1]} questões de múltipla escolha`:''}${h?`, até ${h[1]} horas`:''}${/datas e hor[aá]rios estabelecidos|agendar/i.test(T)?', presencial com agendamento':''}.`);
  if(/desconto conquistado|desconto.{0,40}desempenho/i.test(T)) add('O desempenho no vestibular gera desconto na mensalidade.');
  if((m=T.match(/at[eé]\s*,?\s*(\d{1,2}\/\d{1,2}\/\d{4})[^.]{0,300}?reembolso ser[aá] de\s+(\d{1,3})%/i))) add(`Desistência com reembolso de ${m[2]}% da 1ª parcela até ${m[1]}; depois, sem reembolso.`);
  if(/transfer[eê]ncia externa/i.test(T)&&/portador/i.test(T)) add(`Também entram por transferência externa, reingresso${(m=T.match(/menor do que\s+(\d+)\s*\(\w+\)\s*anos/i))?` (até ${m[1]} anos fora)`:''} e portador de diploma${/dispensados da realiza/i.test(T)?', sem prova quando houver vaga':''}.`);
  if(/fies/i.test(T)||/prouni/i.test(T)) add(`Aceita ${[/fies/i.test(T)?'FIES':'',/prouni/i.test(T)?'ProUni':''].filter(Boolean).join(' e ')}.`);
  const wpp=T.match(/WhatsApp\s*\(?(\d{2})\)?[\s-]*([\d][\d\s-]{7,11}\d)/i);
  if(/24 horas/i.test(T)||wpp) add(`Inscrições${/24 horas/i.test(T)?' online 24h':''}${wpp?`; atendimento pelo WhatsApp (${wpp[1]}) ${wpp[2].replace(/\s+/g,'').replace(/^(\d{5})-?(\d{4})$/,'$1-$2')}`:''}.`);
  return R; }

function editalDe(f){
  const T=edPlano(f&&f.conteudo); const tit=String(f&&f.titulo||'');
  if(!/edital/i.test(tit+' '+T.slice(0,1500))||!/processo seletivo|vestibular|inscri[cç]/i.test(T.slice(0,4000))) return null;
  if(typeof fonteAchado==='function'&&fonteAchado(f)) return null;
  const un=edUn(tit+' '+T.slice(0,1500)), sem=edSemestre(tit+' '+T.slice(0,1500));
  const vg=edVagas(T), mec=edMec(T), per=edPeriodo(T), regras=edRegras(T,per);
  const mecDe=n=>mec.find(x=>edCore(x.nome)===edCore(n));
  const cursos=[]; if(vg) vg.rows.forEach(r=>{ const mx=mecDe(r.nome); const nome=edNomeBase(r.nome,un);
    vg.turnos.forEach((t,j)=>{ const v=r.vagas[j]; if(!v) return; const pt=r.porTurma[j];
      cursos.push({id:uid(),un,nome,modalidade:(mx&&mx.modalidade)||'Presencial',turno:t,preco:'',turmas:pt?String(Math.ceil(v/pt)):'',vagas:String(v),meta:'',matriculados:'',status:'Vigente',lancamento:'',obs:''}); }); });
  const dif=mec.map(x=>`${edNomeBase(x.nome,un)}: ${x.ato} (${x.portaria})${/^\d/.test(x.cpc)?`, CPC ${x.cpc}`:x.cpc==='SC'?', sem CPC ainda':''}${/^\d/.test(x.enade)?`, Enade ${x.enade}`:''}.`);
  if(!cursos.length&&!regras.length&&!dif.length) return null;
  return {un,sem,vg,cursos,regras,dif,per}; }

const edUnNome=un=>(UNS.find(u=>u.id===un)||{}).nome||'';
function edCiclo(e){ if(!e.per||!e.un) return null; const nome=`Processo seletivo ${e.sem||''}`.trim();
  const ja=(typeof ciclosTodos==='function'?ciclosTodos():[]).some(c=>c.un===e.un&&(c.nome===nome||(c.insc_ini===e.per.ini&&c.camp_fim===e.per.fim)));
  return ja?null:{nome,ini:e.per.ini,fim:e.per.fim}; }
const edFmt=s=>s?s.split('-').reverse().join('/'):'';

function editalHtml(f,e){
  const mx=e.cursos.length?cursosMesclar(e.cursos,true):{novos:0,atual:0};
  const chR=e.un?`base.${e.un}.calendario`:'base.calendario', chD=e.un?`base.${e.un}.diferenciais`:'base.diferenciais';
  const R=ltNovasLinhas(chR,e.regras), Dd=ltNovasLinhas(chD,e.dif), ci=edCiclo(e);
  const nada=!mx.novos&&!mx.atual&&!R.length&&!Dd.length&&!ci;
  const onde=e.un?` de ${esc(edUnNome(e.un))}`:'';
  const vt=e.vg?e.vg.turnos.map((t,j)=>`${t} ${e.vg.rows.reduce((a,r)=>a+(r.vagas[j]||0),0).toLocaleString('pt-BR')}`).join(' · '):'';
  return `<div class="lt">
    <div class="lt-h"><b>${nada?'Edital lido':'O que o edital traz'}</b><span class="muted">Edital${e.un?' · '+esc(edUnNome(e.un)):''}${e.sem?' · '+esc(e.sem):''}${nada?': tudo já está na base.':'. Confira e leve cada parte para o lugar certo.'}</span></div>
    ${e.vg?`<div class="lt-b"><div><b>Cursos e vagas</b><small>${pl(e.vg.rows.length,'curso','cursos')} · ${e.vg.total.toLocaleString('pt-BR')} vagas${vt?' · '+vt:''}${mx.novos||mx.atual?` · ${[mx.novos?pl(mx.novos,'linha nova','linhas novas'):'',mx.atual?pl(mx.atual,'curso com números novos','cursos com números novos'):''].filter(Boolean).join(' e ')}`:' · já na tabela'}</small>
      <div class="lt-ex">${e.vg.rows.slice(0,6).map(r=>`<span class="chip">${esc(r.nome)} · ${r.vagas.map((v,j)=>v?`${e.vg.turnos[j].slice(0,3)}. ${v}`:'').filter(Boolean).join(' / ')}</span>`).join('')}${e.vg.rows.length>6?`<span class="muted">+ ${e.vg.rows.length-6}</span>`:''}</div></div>
      ${mx.novos||mx.atual?`<button class="btn sm primary" data-act="lt-ed-cursos" data-id="${f.id}">Levar para a tabela${onde}</button>`:''}</div>`:''}
    ${ci?`<div class="lt-b"><div><b>Ciclo de captação</b><small>${esc(ci.nome)}: inscrições de ${edFmt(ci.ini)} a ${edFmt(ci.fim)}</small></div><button class="btn sm primary" data-act="lt-ed-ciclo" data-id="${f.id}">Criar o ciclo${onde}</button></div>`:''}
    ${R.length?`<div class="lt-b"><div><b>Regras do edital</b><small>${pl(R.length,'regra','regras')} para as observações do calendário${onde}</small><ul class="lt-l">${R.slice(0,5).map(t=>`<li>${esc(t)}</li>`).join('')}${R.length>5?`<li class="muted">+ ${R.length-5}</li>`:''}</ul></div><button class="btn sm primary" data-act="lt-ed-campo" data-v="r" data-id="${f.id}">Adicionar às observações</button></div>`:''}
    ${Dd.length?`<div class="lt-b"><div><b>Reconhecimento e notas do MEC</b><small>${pl(Dd.length,'curso','cursos')} para os diferenciais${onde}</small><ul class="lt-l">${Dd.slice(0,4).map(t=>`<li>${esc(t)}</li>`).join('')}${Dd.length>4?`<li class="muted">+ ${Dd.length-4}</li>`:''}</ul></div><button class="btn sm primary" data-act="lt-ed-campo" data-v="d" data-id="${f.id}">Adicionar aos diferenciais</button></div>`:''}
  </div>`; }

/* liga a leitura de edital na Base sem mexer na leitura geral */
if(typeof leituraHtml==='function'){ const _lh=leituraHtml; leituraHtml=function(f){ const e=editalDe(f); return e?editalHtml(f,e):_lh(f); }; }
if(typeof leituraClick==='function'){ const _lc=leituraClick; leituraClick=function(act,d){
  if(!act.startsWith('lt-ed-')) return _lc(act,d);
  const f=cur&&cur.fontes.find(x=>x.id===d.id); const e=f&&editalDe(f); if(!e) return true;
  if(act==='lt-ed-cursos'){ const x=cursosMesclar(e.cursos); toast(`${pl(x.novos,'linha nova','linhas novas')}${x.atual?` e ${pl(x.atual,'curso atualizado','cursos atualizados')}`:''} na tabela${e.un?' de '+edUnNome(e.un):''}`); return true; }
  if(act==='lt-ed-ciclo'){ const ci=edCiclo(e); if(!ci) return true; const L=ciclosTodos(); L.push({id:uid(),un:e.un,nome:ci.nome,camp_ini:'',insc_ini:ci.ini,mat_ini:'',camp_fim:ci.fim,aulas:''}); ciclosSalvar(L); render(); toast('Ciclo criado no calendário de captação'); return true; }
  if(act==='lt-ed-campo'){ const ch=d.v==='r'?(e.un?`base.${e.un}.calendario`:'base.calendario'):(e.un?`base.${e.un}.diferenciais`:'base.diferenciais');
    const L=ltNovasLinhas(ch,d.v==='r'?e.regras:e.dif); if(!L.length) return true;
    const atual=String(cur.campos[ch]||'').trim(); cur.campos[ch]=(atual?atual+'\n\n':'')+`De "${f.titulo||'edital'}":\n`+L.map(t=>'- '+t).join('\n'); touch(true);
    toast(`${pl(L.length,'linha adicionada','linhas adicionadas')}`); return true; }
  return true; }; }
