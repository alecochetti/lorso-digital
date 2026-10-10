/* ================= UTILITÁRIOS ================= */
const $ = s=>document.querySelector(s);
const esc = s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dec = (x,d=1)=>x==null||isNaN(x)?'—':x.toFixed(d).replace('.',',');
const num = v=>{ if(v==null||v==='')return null; if(typeof v==='number')return isFinite(v)?v:null;
  let s=String(v).trim().replace(/\s/g,'').replace(/R\$/i,'').replace(/%/g,'');
  const neg=/^\(.*\)$/.test(s)||/^-/.test(s); s=s.replace(/[()\-]/g,'');
  if(s.includes(','))s=s.replace(/\./g,'').replace(',','.');          // 1.234.567,89
  else if(/^\d{1,3}(\.\d{3})+$/.test(s))s=s.replace(/\./g,'');       // 1.234.567 (milhar sem centavos)
  const n=Number(s); return isNaN(n)||s===''?null:(neg?-n:n); };
const brl = n=>n==null?'—':n.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0});
const pct = n=>n==null||!isFinite(n)?'—':(n*100).toFixed(1).replace('.',',')+'%';
const lvOf = s=>s==null?0:s<1.75?1:s<2.5?2:s<3.25?3:4;
const uid = ()=>(crypto.randomUUID?crypto.randomUUID():'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0;return (c==='x'?r:(r&3|8)).toString(16);}));
const pl=(n,a,b)=>`${n} ${n===1?a:b}`;
const today = ()=>new Date().toISOString().slice(0,10);
function lsGet(k){try{return localStorage.getItem(k)}catch(e){return null}}
function lsSet(k,v){try{localStorage.setItem(k,v)}catch(e){}}

/* ================= ESTADO ================= */
const MAPS=['resp','evid','notas','campos','fofa','dono_area'], ARRS=['entrevistas','acoes','testes','kpis','equipe','dores','sistemas','cursos','iniciativas'];
const COLS=['A fazer','Em andamento','Em revisão','Concluída'];
function blank(nome){return {id:uid(),nome:nome||'Novo diagnóstico',exemplo:false,resp:{},evid:{},notas:{},campos:{},fofa:{},dono_area:{},entrevistas:[],acoes:[],testes:[],kpis:[],equipe:[],dores:[],sistemas:[],cursos:[],iniciativas:[],criadoEm:new Date().toISOString(),atualizadoEm:null};}
function norm(d){
  const b=blank(); const o=Object.assign(b,JSON.parse(JSON.stringify(d||{})));
  MAPS.forEach(k=>{ if(!o[k]||typeof o[k]!=='object'||Array.isArray(o[k]))o[k]={}; Object.keys(o[k]).forEach(x=>{if(o[k][x]==null)delete o[k][x];}); });
  ARRS.forEach(k=>{if(!Array.isArray(o[k]))o[k]=[]});
  o.acoes.forEach(a=>{ if(!a.id)a.id=uid(); if(a.status==='Concluida')a.status='Concluída'; if(!COLS.includes(a.status))a.status='A fazer'; });
  o.equipe.forEach(m=>{ if(!m.id)m.id=uid(); }); o.dores.forEach(m=>{ if(!m.id)m.id=uid(); }); o.sistemas.forEach(m=>{ if(!m.id)m.id=uid(); });
  return o;
}
let cur = null;          // diagnóstico aberto
let all = {};            // lista de diagnósticos: id -> {id, nome, updated_at}
let ui = {view:'fases', stage:'diagnostico', area:'reitoria', dorF:{etapa:'',area:''}, dorDef:{area:'',etapa:'Produção',tipo:'Processo',sev:'2',freq:'Semanal',quem:'',sistema:''}, novo:false, copy:null, openTask:null, notesOpen:{}, kf:{dono:'',area:''}, fofaSug:{}, drePreview:null, dreTxt:'', dstep:'base', cursoPreview:null};
try{const u=JSON.parse(lsGet('cd.ui')||'{}'); if(['base','reitoria','entrevistas'].includes(u.dstep))ui.dstep=u.dstep; if(u.stage&&STG[u.stage])ui.stage=u.stage; if(u.area&&AREA[u.area])ui.area=u.area; if(['fases','dores','sistemas','tarefas','equipe'].includes(u.view))ui.view=u.view;}catch(e){}
const saveUi=()=>lsSet('cd.ui',JSON.stringify({stage:ui.stage,area:ui.area,view:ui.view,dstep:ui.dstep}));
const member=id=>cur.equipe.find(m=>m.id===id);
const initials=n=>String(n||'?').trim().split(/\s+/).slice(0,2).map(p=>p[0]||'').join('').toUpperCase()||'?';
const isLate=t=>t.prazo&&t.status!=='Concluída'&&t.prazo<today();

/* ================= CÁLCULO DE MATURIDADE ================= */
function scoreOf(qs){
  const pil={}; let ans=0, elim=false;
  qs.forEach(x=>{const n=cur.resp[x[0]]; if(!n)return; ans++; const p=x[2]; pil[p]=pil[p]||{s:0,w:0}; pil[p].s+=n*x[3]; pil[p].w+=x[3]; if(x[4]&&n===1)elim=true;});
  const ps={}; Object.keys(pil).forEach(p=>ps[p]=pil[p].s/pil[p].w);
  const vals=Object.values(ps); let s=null;
  if(ans>=Math.ceil(qs.length/2) && vals.length){ const mean=vals.reduce((a,b)=>a+b,0)/vals.length; s=Math.min(mean,Math.min(...vals)+1); if(elim)s=Math.min(s,2.49); }
  return {score:s,level:lvOf(s),pil:ps,ans,total:qs.length,elim};
}
let SC={};
function computeAll(){ SC={}; AREAS.forEach(a=>SC[a.id]=scoreOf(a.q)); STAGES.forEach(s=>{if(s.q)SC[s.id]=scoreOf(s.q)}); }
function unFin(id){ const g=k=>num(cur.campos[id+'.'+k]); return {meta_mat:g('meta_mat'),meta_rec:g('meta_rec'),receita:g('receita'),folha:g('folha'),orcamento:g('orcamento'),alunos:g('alunos')}; }
function overall(){
  // áreas centrais e operação com peso igual; UNs ponderadas pela receita realizada quando informada
  const core=AREAS.filter(a=>!a.un&&SC[a.id].score!=null).map(a=>SC[a.id].score);
  const uns=UNS.filter(a=>SC[a.id].score!=null);
  const recs=uns.map(a=>unFin(a.id).receita||0); const totR=recs.reduce((a,b)=>a+b,0);
  let unScore=null;
  if(uns.length){ unScore = totR>0 ? uns.reduce((acc,a,i)=>acc+SC[a.id].score*(recs[i]/totR),0) : uns.reduce((acc,a)=>acc+SC[a.id].score,0)/uns.length; }
  const parts=[...core]; if(unScore!=null) parts.push(...Array(Math.max(1,Math.round(UNS.length))).fill(unScore));
  if(!parts.length)return {score:null,level:0,ponderado:totR>0};
  const s=parts.reduce((a,b)=>a+b,0)/parts.length; return {score:s,level:lvOf(s),ponderado:totR>0};
}

/* ================= MOTOR DE CRUZAMENTO ================= */
const L=id=>SC[id]&&SC[id].score!=null?SC[id].level:null;
const R=q=>cur.resp[q];
const P=(id,p)=>SC[id]&&SC[id].pil[p]!=null?SC[id].pil[p]:null;
const V=(id,k)=>num(cur.campos[id+'.'+k]);
const ge=(x,v)=>x!=null&&x>=v, le=(x,v)=>x!=null&&x<=v;
const SEV={crit:'Crítica',alta:'Alta',media:'Média'}, SEVW={crit:3,alta:2,media:1};
const RULES=[
 {id:'CRZ-01',sev:'crit',pad:'Desperdício de capacidade',areas:['crm','colegio'],t:'CRM maduro, visitas do Colégio sem registro',
  test:()=>ge(L('crm'),3)&&R('col1')===1, txt:()=>`O CRM está no nível ${L('crm')}, mas as visitas do Colégio acontecem sem agendamento nem roteiro. A tecnologia existe e não enxerga a etapa que mais converte matrícula.`,
  rec:['Agendamento de visita por formulário integrado ao CRM','Roteiro padrão de visita com registro do interesse da família','Follow-up automático em até 48h após a visita']},
 {id:'CRZ-02',sev:'crit',pad:'Ruptura de passagem',areas:['captacao'],t:'Leads esfriam antes do primeiro contato',
  test:()=>ge(L('captacao'),3)&&R('cap3')===1, txt:()=>`A captação está no nível ${L('captacao')}, mas o primeiro contato com o lead leva mais de 24h. O investimento em mídia esfria antes do atendimento.`+(V('captacao','midia')?` Hoje são ${brl(V('captacao','midia'))} por mês em mídia nesse cenário.`:''),
  rec:['Distribuição automática de leads no CRM','SLA de primeiro contato em até 1h, com alerta','Mensagem automática de boas-vindas no WhatsApp']},
 {id:'CRZ-03',sev:'crit',pad:'Gargalo de fluxo',areas:['captacao','callcenter'],t:'A captação gera mais do que o call center absorve',
  test:()=>ge(L('captacao'),3)&&L('callcenter')===1, txt:()=>`Captação no nível ${L('captacao')} e call center no nível 1. A mídia gera volume que vira fila e abandono.`+(V('callcenter','abandono')!=null?` Abandono informado: ${dec(V('callcenter','abandono'))}%.`:''),
  rec:['Dimensionar o call center pelo calendário de captação','Bot e WhatsApp para dúvidas simples','Fila separada por UN nos picos']},
 {id:'CRZ-04',sev:'crit',pad:'Desperdício de capacidade',areas:['b2b','captacao'],t:'Comercial estruturado recebendo leads sem critério',
  test:()=>ge(L('b2b'),3)&&L('captacao')===1, txt:()=>`O comercial B2B está no nível ${L('b2b')}, mas a captação está no nível 1. O time perde tempo produtivo com leads fora do perfil.`,
  rec:['Travar a passagem de bastão com critérios de qualificação','Revisar o ICP junto com o comercial','Medir a taxa de leads descartados todo mês']},
 {id:'CRZ-05',sev:'alta',pad:'Gargalo de fluxo',areas:['growth','plataforma'],t:'Growth decide com rastreamento falho',
  test:()=>ge(L('growth'),3)&&R('plat1')===1, txt:()=>`Growth está no nível ${L('growth')}, mas o rastreamento de conversões não é confiável. Testes e otimizações se apoiam em dados incompletos.`,
  rec:['Plano de tagueamento via GTM','Eventos-chave padronizados por UN','Auditoria mensal de tags']},
 {id:'CRZ-06',sev:'alta',pad:'Teto de ferramenta',areas:['graduacao','crm'],t:'Graduação madura presa em CRM manual',
  test:()=>ge(L('graduacao'),3)&&le(P('crm','F'),1.5), txt:()=>`A Graduação está no nível ${L('graduacao')}, mas o CRM não automatiza réguas nem pontua leads. O vestibular depende de trabalho manual e não escala no pico.`,
  rec:['Réguas automáticas por etapa do processo seletivo','Lead scoring por curso','Recuperação automática de inscrição abandonada']},
 {id:'CRZ-07',sev:'alta',pad:'Assimetria entre UNs',areas:['pos','crm'],t:'Base de formados não vira aluno de Pós',
  test:()=>ge(L('crm'),3)&&R('pos2')===1, txt:()=>`O CRM está no nível ${L('crm')}, mas a base de ex-alunos da Graduação não é cruzada com a Pós. É LTV perdido com custo de aquisição quase zero.`,
  rec:['Cruzar a base de formandos com o funil da Pós','Régua de antecipação 6 meses antes da formatura','Condição exclusiva para ex-alunos']},
 {id:'CRZ-08',sev:'alta',pad:'Ruptura de passagem',areas:['eventos'],t:'Eventos engajam, mas leads não chegam ao comercial',
  test:()=>ge(R('eve3'),3)&&R('eve1')===1, txt:()=>`As inscrições dos eventos estão estruturadas, mas não há contato depois do evento.`+(V('eventos','na_mesa')?` Há ${brl(V('eventos','na_mesa'))} em oportunidades na mesa sem acompanhamento.`:''),
  rec:['Leads quentes para o comercial em até 24h','Régua pós-evento por nível de engajamento','Registrar presença e interesse no CRM']},
 {id:'CRZ-09',sev:'alta',pad:'Assimetria',areas:['captacao','colegio'],t:'Mídia otimizada num segmento que decide por indicação',
  test:()=>ge(R('cap5'),3)&&R('col4')===1, txt:()=>'O orçamento de mídia é gerido por CAC, mas o Colégio não tem programa de indicação. O CAC fica alto num público que decide pela recomendação de outros pais.',
  rec:['Programa de indicação de pais com benefício claro','Open house com convite de famílias atuais','Medir a % de matrículas por indicação']},
 {id:'CRZ-10',sev:'alta',pad:'Teto de ferramenta',areas:['plataforma'],t:'Plataforma limita UNs maduras',
  test:()=>L('plataforma')===1&&UNS.some(u=>ge(L(u.id),3)), txt:()=>`${UNS.filter(u=>ge(L(u.id),3)).map(u=>u.nome).join(', ')} já opera em nível 3 ou mais, mas a plataforma está no nível 1 e limita o crescimento.`,
  rec:['Priorizar rastreamento e integrações das UNs maduras','Construtor de LP com templates por UN','Roadmap técnico trimestral com o marketing']},
 {id:'CRZ-11',sev:'alta',pad:'Gargalo de fluxo',areas:['estrategia','growth'],t:'Metas definidas sem acompanhamento',
  test:()=>ge(R('est1'),3)&&R('gro3')===1, txt:()=>'Existem metas trimestrais por UN, mas os resultados são acompanhados em relatórios manuais esporádicos. Ninguém vê o desvio a tempo de corrigir.',
  rec:['Dashboard por UN com meta e realizado','Weekly de performance olhando o mesmo painel','Alertas de desvio de meta']},
 {id:'CRZ-12',sev:'media',pad:'Desperdício de capacidade',areas:['criacao','redes'],t:'Produção alta sem linha editorial',
  test:()=>ge(L('criacao'),3)&&R('red1')===1, txt:()=>`A criação está no nível ${L('criacao')}, mas as redes postam no improviso. É esforço de produção sem direção.`,
  rec:['Linha editorial por UN','Calendário mensal ligado ao ciclo de captação']},
 {id:'CRZ-13',sev:'media',pad:'Desperdício de capacidade',areas:['crm','mestrado'],t:'Funil do Mestrado cego na seleção',
  test:()=>ge(L('crm'),3)&&R('mes2')===1, txt:()=>'O CRM é maduro, mas a banca do Mestrado avalia em planilha ou papel. O funil fica cego da inscrição à aprovação.',
  rec:['Etapas da seleção como etapas do CRM','Comunicação automática a cada etapa da banca']},
 {id:'CRZ-14',sev:'media',pad:'Ruptura de passagem',areas:['b2b','atendimento'],t:'Atendimento recebe cliente B2B sem contexto',
  test:()=>ge(L('b2b'),2)&&R('b2b2')===1&&ge(L('atendimento'),2), txt:()=>'Comercial e atendimento estão estruturados, mas a passagem entre eles não existe. O atendimento não sabe o que foi prometido.',
  rec:['Reunião de handover obrigatória','Matriz de expectativas no CRM']},
 {id:'CRZ-15',sev:'media',pad:'Gargalo de fluxo',areas:['criacao'],t:'Fila de demandas maior que a capacidade de entrega',
  test:()=>{const f=V('criacao','fila'),e=V('criacao','entregas');return f!=null&&e!=null&&e>0&&f>e;}, txt:()=>`A criação tem ${V('criacao','fila')} demandas em fila para ${V('criacao','entregas')} entregas por mês. A fila cresce mais rápido do que sai.`,
  rec:['Priorizar demandas por impacto em matrícula','Templates para peças recorrentes','Capacidade extra nos picos de captação']},
 {id:'CRZ-16',sev:'media',pad:'Gargalo de fluxo',areas:['callcenter'],t:'Chamados em aberto acumulando',
  test:()=>{const a=V('callcenter','abertos'),t=V('callcenter','atend');return a!=null&&t!=null&&t>0&&a/t>=0.2;}, txt:()=>`São ${V('callcenter','abertos')} chamados em aberto para ${V('callcenter','atend')} atendimentos no mês (${pct(V('callcenter','abertos')/V('callcenter','atend'))}).`,
  rec:['Mutirão de fechamento de chamados','Tabulação de motivos para atacar a causa']},
 {id:'CRZ-17',sev:'alta',pad:'Contradição declarada',areas:['b2b'],t:'Pipeline relevante sem previsão',
  test:()=>{const p=V('b2b','pipeline');return p!=null&&p>0&&le(R('b2b4'),1);}, txt:()=>`Há ${brl(V('b2b','pipeline'))} em pipeline B2B${V('b2b','propostas')?` e ${V('b2b','propostas')} propostas ativas`:''}, mas não existe forecast. A receita corporativa não é previsível.`,
  rec:['Pipeline ponderado por etapa no CRM','Revisão semanal de forecast']},
 {id:'CRZ-18',sev:'alta',pad:'Desalinhamento financeiro',areas:[],dyn:true,t:'Verba concentrada onde a maturidade é baixa',
  test:()=>finRows().some(r=>r.share!=null&&r.share>=0.35&&le(r.level,2)) && finRows().some(r=>ge(r.level,3)),
  txt:()=>{const r=finRows().filter(r=>r.share!=null&&r.share>=0.35&&le(r.level,2)); const m=finRows().filter(x=>ge(x.level,3)).map(x=>x.nome); return `${r.map(x=>`${x.nome} recebe ${pct(x.share)} do orçamento de marketing`).join('; ')} e está no nível ${r.map(x=>x.level).join('/')}. Enquanto isso, ${m.join(', ')} opera em nível 3 ou mais. A verba compensa falta de processo em vez de acelerar quem já converte.`;},
  rec:['Condicionar aumento de verba a evolução de processo','Testar realocação parcial para a UN mais madura']},
 {id:'CRZ-19',sev:'alta',pad:'Desalinhamento financeiro',areas:[],dyn:true,t:'UN abaixo da meta de receita',
  test:()=>finRows().some(r=>r.ating!=null&&r.ating<0.85),
  txt:()=>finRows().filter(r=>r.ating!=null&&r.ating<0.85).map(r=>{const w=weakest(r.id); return `${r.nome} atingiu ${pct(r.ating)} da meta de receita${w?`; o ponto mais fraco é "${w}"`:''}.`;}).join(' '),
  rec:['Plano de recuperação por UN com meta semanal','Atacar primeiro a pergunta de pior nível da UN']},
 {id:'CRZ-20',sev:'media',pad:'Desalinhamento financeiro',areas:[],dyn:true,t:'Investimento alto para o nível de maturidade',
  test:()=>finRows().some(r=>r.orcRec!=null&&r.orcRec>0.15&&le(r.level,2)),
  txt:()=>finRows().filter(r=>r.orcRec!=null&&r.orcRec>0.15&&le(r.level,2)).map(r=>`${r.nome} investe ${pct(r.orcRec)} da receita em marketing e está no nível ${r.level}.`).join(' ')+' Limite de 15% a calibrar com o cliente.',
  rec:['Rever CAC e conversão por etapa antes de manter a verba']},
 {id:'CRZ-21',sev:'media',pad:'Assimetria entre UNs',areas:[],dyn:true,t:'Maturidade muito desigual entre UNs',
  test:()=>{const l=UNS.map(u=>L(u.id)).filter(x=>x!=null);return l.length>=2&&Math.max(...l)-Math.min(...l)>=2;},
  txt:()=>{const l=UNS.filter(u=>L(u.id)!=null).sort((a,b)=>L(b.id)-L(a.id));return `${l[0].nome} está no nível ${L(l[0].id)} e ${l[l.length-1].nome} no nível ${L(l[l.length-1].id)}. As práticas da UN mais madura podem ser replicadas.`;},
  rec:['Replicar o playbook da UN mais madura','Responsável de marketing compartilhado entre UNs']},
];
/* ---------- dores, gargalos e sistemas ---------- */
const FLUXO=['Solicitação','Briefing','Priorização','Produção','Aprovação','Publicação','Mensuração'];
const TIPOS=['Processo','Sistema','Pessoas','Comunicação','Prioridade','Capacidade'];
const FREQS=['Diária','Semanal','Mensal','Pontual'];
const FREQW={'Diária':3,'Semanal':2,'Mensal':1.5,'Pontual':1};
const SEVN={'1':'Baixa','2':'Média','3':'Alta'};
const dorScore=d=>(+d.sev||1)*(FREQW[d.freq]||1);
function gargalos(){
  const rows=FLUXO.map(e=>{const ds=cur.dores.filter(d=>d.etapa===e); return {etapa:e,n:ds.length,graves:ds.filter(d=>+d.sev===3).length,score:ds.reduce((a,d)=>a+dorScore(d),0),quem:[...new Set(ds.map(d=>d.quem).filter(Boolean))],areas:[...new Set(ds.map(d=>d.area).filter(Boolean))]};});
  return rows;
}
const sysDores=nome=>cur.dores.filter(d=>d.sistema&&nome&&d.sistema.toLowerCase()===String(nome).toLowerCase()).length;
const unSvc=u=>R(u.q[u.q.length-1][0]);
RULES.push(
 {id:'CRZ-23',sev:'crit',pad:'Disputa pelo marketing',areas:()=>['demandas',...UNS.filter(u=>le(unSvc(u),2)).map(u=>u.id)],t:'UNs disputam o marketing sem regra de prioridade',
  test:()=>R('dem2')===1&&UNS.some(u=>le(unSvc(u),2)), txt:()=>`Não há critério de priorização, e ${UNS.filter(u=>le(unSvc(u),2)).map(u=>u.nome).join(', ')} relatam atraso ou falta de retorno. Quem pressiona mais é atendido primeiro e o calendário de captação perde para urgências.`,
  rec:['Regra pública de priorização por impacto e calendário','Cota de capacidade reservada por UN','Formulário único de pedido com prazo mínimo por tipo de peça']},
 {id:'CRZ-24',sev:'alta',pad:'Gargalo de operação',areas:['demandas','fluxo','captacao'],t:'O gargalo é a operação interna, não a captação',
  test:()=>ge(L('captacao'),3)&&(le(L('demandas'),2)||le(L('fluxo'),2)), txt:()=>`A captação está no nível ${L('captacao')}, mas a operação interna está atrás: gestão de demandas em ${L('demandas')!=null?'N'+L('demandas'):'sem nota'} e fluxo em ${L('fluxo')!=null?'N'+L('fluxo'):'sem nota'}. A demanda existe; o que trava é a capacidade do marketing de atender coordenadores e UNs.`,
  rec:['Mapear o fluxo do pedido à publicação e medir o tempo de cada etapa','Atacar primeiro a etapa com mais dores graves','Tirar pedidos recorrentes do fluxo com templates e autosserviço']},
 {id:'CRZ-25',sev:'alta',pad:'Gargalo de fluxo',areas:['demandas'],t:'Backlog de demandas acumulando',
  test:()=>{const a=V('demandas','abertas'),r=V('demandas','recebidas');return a!=null&&r>0&&a/r>=0.5;}, txt:()=>`São ${V('demandas','abertas')} demandas em aberto para ${V('demandas','recebidas')} recebidas no mês. O backlog equivale a ${pct(V('demandas','abertas')/V('demandas','recebidas'))} de um mês inteiro de entrada.`,
  rec:['Triagem do backlog: cancelar, adiar ou fazer','Limite de trabalho em andamento por pessoa','Prazo mínimo por tipo de peça']},
 {id:'CRZ-26',sev:'crit',pad:'Gargalo de fluxo',areas:['demandas','fluxo'],t:'Urgência crônica sem gestão de capacidade',
  test:()=>le(R('flu4'),1)&&ge(V('demandas','urgentes'),30), txt:()=>`${dec(V('demandas','urgentes'),0)}% dos pedidos chegam como urgentes e o marketing não mede a própria capacidade. Quando tudo é urgente, nada é priorizado.`,
  rec:['Definir o que é urgência e quem pode declarar','Medir volume por pessoa e por semana','Reservar uma parte da capacidade para urgências reais']},
 {id:'CRZ-27',sev:'alta',pad:'Gargalo de fluxo',areas:['fluxo'],t:'Aprovações travam o fluxo',
  test:()=>le(R('flu2'),1)&&(ge(V('fluxo','rodadas'),3)||cur.dores.filter(d=>d.etapa==='Aprovação').length>=2), txt:()=>`Não há ordem nem limite de rodadas na aprovação${V('fluxo','rodadas')?` (média de ${dec(V('fluxo','rodadas'))} rodadas)`:''}${cur.dores.filter(d=>d.etapa==='Aprovação').length?`, e ${cur.dores.filter(d=>d.etapa==='Aprovação').length} dores foram relatadas nessa etapa`:''}.`,
  rec:['Um aprovador por demanda','Máximo de 2 rodadas','Aprovação tácita após o prazo de resposta']},
 {id:'CRZ-28',sev:'alta',pad:'Desperdício de capacidade',areas:['sistemas','crm'],t:'Tecnologia para fora, WhatsApp para dentro',
  test:()=>(ge(L('crm'),3)||ge(L('plataforma'),3))&&R('sis1')===1, txt:()=>'O marketing usa tecnologia madura com o público, mas controla o próprio trabalho por WhatsApp e e-mail. Pedidos se perdem e ninguém vê a fila.',
  rec:['Uma ferramenta de gestão de tarefas para todo o time','Solicitantes abrindo pedidos dentro dela','Fim de pedidos por WhatsApp individual']},
 {id:'CRZ-29',sev:'alta',pad:'Ruptura de passagem',areas:['demandas','fluxo'],t:'Pedidos chegam sem informação e por canais soltos',
  test:()=>R('dem1')===1&&le(R('flu3'),1), txt:()=>'Os pedidos chegam por vários canais e sem briefing. O marketing gasta tempo correndo atrás de informação antes de produzir.',
  rec:['Formulário de pedido com campos obrigatórios','Devolver pedido incompleto antes de entrar na fila']},
 {id:'CRZ-30',sev:'media',pad:'Assimetria entre UNs',areas:()=>UNS.filter(u=>{const a=V(u.id,'dem_atraso'),m=V(u.id,'dem_mkt');return a!=null&&m>0&&a/m>=0.3;}).map(u=>u.id),t:'UNs com muitas demandas atrasadas',
  test:()=>UNS.some(u=>{const a=V(u.id,'dem_atraso'),m=V(u.id,'dem_mkt');return a!=null&&m>0&&a/m>=0.3;}), txt:()=>UNS.filter(u=>{const a=V(u.id,'dem_atraso'),m=V(u.id,'dem_mkt');return a!=null&&m>0&&a/m>=0.3;}).map(u=>`${u.nome}: ${V(u.id,'dem_atraso')} de ${V(u.id,'dem_mkt')} demandas atrasadas (${pct(V(u.id,'dem_atraso')/V(u.id,'dem_mkt'))}).`).join(' '),
  rec:['Reunião quinzenal de fila com a coordenação','Calendário de demandas previsíveis da UN']},
 {id:'CRZ-31',sev:'crit',pad:'Ralo de mídia',areas:['smarketing','captacao'],t:'Volume de leads sem qualidade (ralo de mídia)',
  test:()=>{const c=V('smarketing','conv_insc')??V('graduacao','conv_insc');return le(R('sma1'),2)&&le(R('sma2'),2)&&c!=null&&c<10;}, txt:()=>`Sem definição de lead qualificado nem feedback do comercial, e a conversão inscrito → matrícula está em ${dec(V('smarketing','conv_insc')??V('graduacao','conv_insc'))}%. O marketing otimiza volume, o comercial se afoga em contatos sem perfil e o CAC sobe.`,
  rec:['Matriz de SLA com 3 critérios obrigatórios para o lead ir ao comercial','Travar a passagem automática de leads fora do padrão','Comitê semanal de motivos de perda']},
 {id:'CRZ-32',sev:'crit',pad:'Ruptura de passagem',areas:['smarketing'],t:'Leads esfriam na fila (lead cadáver)',
  test:()=>{const sp=V('smarketing','speed')??V('captacao','speed');return le(R('sma4'),2)&&ge(sp,240);}, txt:()=>`A distribuição é manual ou livre e o primeiro contato leva ${dec((V('smarketing','speed')??V('captacao','speed'))/60)}h. No mercado educacional, o interesse esfria em minutos.`,
  rec:['Primeiro contato automático por WhatsApp em até 2 minutos','Distribuição automática por especialidade','Alerta para leads quentes']},
 {id:'CRZ-33',sev:'alta',pad:'Desperdício de capacidade',areas:['smarketing'],t:'Tecnologia sem processo',
  test:()=>R('sma3')===4&&R('sma2')===1, txt:()=>'A integração entre marketing e vendas é completa e em tempo real, mas não há feedback do comercial. As campanhas continuam aprendendo com dados incompletos.',
  rec:['Reunião semanal de 30 minutos entre marketing e comercial','Top 20 motivos de recusa da semana alimentando públicos e palavras negativas']},
 {id:'CRZ-34',sev:'alta',pad:'Gargalo relatado',areas:()=>{const g=gargalos().sort((a,b)=>b.score-a.score)[0];return g?g.areas:[];},t:'Etapa do fluxo com mais dores relatadas',
  test:()=>{const g=gargalos().sort((a,b)=>b.score-a.score)[0];return g&&g.score>=8;}, txt:()=>{const g=gargalos().sort((a,b)=>b.score-a.score)[0];return `${g.etapa} concentra ${g.n} dores relatadas (${g.graves} graves)${g.quem.length?`, citadas por ${g.quem.slice(0,4).join(', ')}`:''}. É o principal ponto onde o trabalho trava.`;},
  rec:['Medir o tempo parado nesta etapa','Definir dono e regra para a etapa','Revisar em 30 dias se as dores diminuíram']},
 {id:'CRZ-35',sev:'alta',pad:'Teto de ferramenta',areas:['sistemas'],t:'Sistemas mal avaliados pelo time',
  test:()=>cur.sistemas.some(x=>x.nome&&le(num(x.satisf),2)), txt:()=>cur.sistemas.filter(x=>x.nome&&le(num(x.satisf),2)).map(x=>`${x.nome}: nota ${x.satisf}/5${sysDores(x.nome)?`, citado em ${sysDores(x.nome)} ${sysDores(x.nome)===1?'dor':'dores'}`:''}.`).join(' '),
  rec:['Decidir manter, treinar ou substituir cada sistema mal avaliado','Ouvir quem usa antes de trocar']},
 {id:'CRZ-36',sev:'media',pad:'Ruptura de passagem',areas:['sistemas'],t:'Sistemas que não conversam entre si',
  test:()=>cur.sistemas.filter(x=>x.nome&&x.integra==='Não').length>=3, txt:()=>`${cur.sistemas.filter(x=>x.nome&&x.integra==='Não').length} sistemas não integram com nenhum outro (${cur.sistemas.filter(x=>x.nome&&x.integra==='Não').map(x=>x.nome).join(', ')}). Cada um vira digitação manual.`,
  rec:['Mapear qual informação passa de um para outro','Priorizar a integração que mais economiza horas']}
);

RULES.push(
 {id:'CRZ-37',sev:'crit',pad:'Mandato insuficiente',areas:['reitoria','mandato'],t:'Sem patrocínio da reitoria, o plano não sai do papel',
  test:()=>le(R('rei3'),1)||(le(R('rei3'),2)&&le(R('man5'),1)), txt:()=>R('rei3')===1?'A reitoria quer resultado sem mudar nada. Qualquer nova regra com coordenadores e UNs vai ser contestada caso a caso.':'O apoio da reitoria é só no discurso e o marketing não pode mudar regras com coordenadores e UNs. As mudanças de fluxo vão travar na primeira resistência.',
  rec:['Pactuar com a reitoria um mandato por escrito: escopo, prazo e o que muda','Comunicação oficial da reitoria às UNs sobre as novas regras','Comitê mensal com a reitoria para remover barreiras']},
 {id:'CRZ-38',sev:'alta',pad:'Mandato insuficiente',areas:['mandato','fluxo'],t:'Equipe intocável com gargalo de capacidade',
  test:()=>R('man1')===1&&(le(R('flu4'),2)||le(L('fluxo'),2)), txt:()=>'Não há liberdade para mexer na equipe, e o fluxo de trabalho já mostra falta de capacidade. O ganho vai ter que vir de processo, priorização e ferramentas, não de pessoas.',
  rec:['Priorizar mudanças de processo e de regra de pedidos','Automatizar tarefas repetitivas antes de pedir pessoas','Levar à reitoria o custo da capacidade atual com números']},
 {id:'CRZ-39',sev:'alta',pad:'Gargalo de capacidade',areas:['demandas','financeiro'],t:'Demandas por pessoa acima do que o time absorve',
  test:()=>{const d=V('demandas','recebidas'),h=V('financeiro','headcount');return d!=null&&h>0&&d/h>=25;}, txt:()=>`São ${dec(V('demandas','recebidas')/V('financeiro','headcount'),0)} demandas por pessoa no mês (${V('demandas','recebidas')} para ${V('financeiro','headcount')} pessoas). Referência inicial de alerta: 25 por pessoa, a calibrar pelo tipo de peça.`,
  rec:['Classificar demandas por esforço (P, M, G)','Cota por UN proporcional à capacidade real','Kit de autosserviço para pedidos simples']},
 {id:'CRZ-40',sev:'alta',pad:'Desalinhamento financeiro',areas:['financeiro'],t:'Receita abaixo do orçado',
  test:()=>{const o=V('financeiro','receita_orcada'),r=V('financeiro','receita_realizada');return o>0&&r!=null&&r/o<0.95;}, txt:()=>`A receita realizada ou projetada (${brl(V('financeiro','receita_realizada'))}) está em ${pct(V('financeiro','receita_realizada')/V('financeiro','receita_orcada'))} do orçado (${brl(V('financeiro','receita_orcada'))}).`+(V('financeiro','verba_orcada')&&V('financeiro','verba_realizada')!=null&&V('financeiro','verba_realizada')<V('financeiro','verba_orcada')?` A verba de marketing também está abaixo do orçado (${pct(V('financeiro','verba_realizada')/V('financeiro','verba_orcada'))}).`:''),
  rec:['Mostrar quais UNs explicam o desvio','Proteger a verba das UNs com melhor retorno','Plano de recuperação com metas semanais']},
 {id:'CRZ-41',sev:'media',pad:'Desalinhamento financeiro',areas:['financeiro'],t:'Verba de marketing cortada no meio do ano',
  test:()=>{const o=V('financeiro','verba_orcada'),r=V('financeiro','verba_realizada');return o>0&&r!=null&&r/o<0.8;}, txt:()=>`A verba de marketing realizada está em ${pct(V('financeiro','verba_realizada')/V('financeiro','verba_orcada'))} do orçado. Sem prova de retorno, o marketing é o primeiro a ser cortado.`,
  rec:['Apresentar CAC e retorno por UN ao financeiro','Acordar verba mínima protegida para captação']},
 {id:'CRZ-42',sev:'alta',pad:'Gargalo de fluxo',areas:['proreitoria','demandas'],t:'Calendário chega tarde e tudo vira urgência',
  test:()=>le(R('pro2'),1)&&(le(R('dem5'),2)||ge(V('demandas','urgentes'),30)), txt:()=>'O calendário acadêmico chega em cima da hora e as UNs não planejam com antecedência. As urgências que travam o marketing nascem antes dele, nas pró-reitorias.',
  rec:['Calendário de lançamentos com 6 meses de antecedência, aprovado pela reitoria','Prazo mínimo de divulgação por edital ou curso novo']},
 {id:'CRZ-43',sev:'media',pad:'Régua de sucesso',areas:['reitoria','financeiro'],t:'Sucesso do marketing sem régua objetiva',
  test:()=>le(R('rei5'),2)&&le(R('fin4'),2), txt:()=>'A reitoria mede o marketing por percepção e o retorno não é apresentado ao financeiro. Sem régua combinada, o trabalho vai ser julgado por opinião.',
  rec:['Pactuar 3 a 5 indicadores de sucesso com a reitoria no início do projeto','Relatório mensal com matrícula, receita e CAC por UN']}
);

RULES.push(
 {id:'CRZ-44',sev:'alta',pad:'Expectativa sem estrutura',areas:()=>['reitoria',...UNS.filter(u=>/Crescer|Recuperar/.test(unxGet(u.id,'expect'))&&(le(L(u.id),2)||le(unSvc(u),2))).map(u=>u.id)],t:'Reitoria quer crescer onde a UN não está pronta',
  test:()=>UNS.some(u=>/Crescer|Recuperar/.test(unxGet(u.id,'expect'))&&(le(L(u.id),2)||le(unSvc(u),2))),
  txt:()=>UNS.filter(u=>/Crescer|Recuperar/.test(unxGet(u.id,'expect'))&&(le(L(u.id),2)||le(unSvc(u),2))).map(u=>{ const motivos=[le(L(u.id),2)?`a UN está no nível ${L(u.id)}`:null, le(unSvc(u),2)?`a coordenação avalia o atendimento do marketing em N${unSvc(u)}`:null].filter(Boolean).join(' e '); return `A reitoria espera ${unxGet(u.id,'expect').toLowerCase()} ${u.nome}${unxGet(u.id,'crescimento')?` (${unxGet(u.id,'crescimento')}% em matrículas)`:''}, mas ${motivos}.`; }).join(' ')+' A meta vai depender de estrutura que ainda não existe.',
  rec:['Plano de crescimento por UN com marcos de processo antes de aumentar a meta','Capacidade do marketing reservada para a UN prioritária']},
 {id:'CRZ-45',sev:'alta',pad:'Gargalo de capacidade',areas:()=>['demandas',...UNS.filter(u=>unxGet(u.id,'foco').includes('Novos cursos e frentes')).map(u=>u.id)],t:'Novas frentes vão disputar a mesma fila do marketing',
  test:()=>UNS.some(u=>unxGet(u.id,'foco').includes('Novos cursos e frentes'))&&(le(L('demandas'),2)||le(L('fluxo'),2)),
  txt:()=>`A reitoria quer novos cursos e frentes em ${UNS.filter(u=>unxGet(u.id,'foco').includes('Novos cursos e frentes')).map(u=>u.nome).join(', ')}, mas a gestão de demandas e o fluxo do marketing ainda estão em nível baixo. Cada lançamento novo vai aumentar a fila que já atrasa.`,
  rec:['Organizar a fila e o SLA antes dos lançamentos','Calendário de lançamentos com 6 meses de antecedência','Pacote padrão de lançamento (páginas, peças e régua) reutilizável']},
 {id:'CRZ-46',sev:'media',pad:'Contradição declarada',areas:()=>['reitoria',...UNS.filter(u=>unxGet(u.id,'expect')==='Crescer'&&unxGet(u.id,'esforco')==='Reduzir').map(u=>u.id)],t:'Crescer reduzindo investimento',
  test:()=>UNS.some(u=>unxGet(u.id,'expect')==='Crescer'&&unxGet(u.id,'esforco')==='Reduzir'),
  txt:()=>`${UNS.filter(u=>unxGet(u.id,'expect')==='Crescer'&&unxGet(u.id,'esforco')==='Reduzir').map(u=>u.nome).join(', ')}: a reitoria espera crescimento com redução de investimento. Só fecha a conta com ganho de eficiência (CAC, conversão, retenção) comprovado.`,
  rec:['Mostrar o CAC atual e a conversão por etapa da UN','Definir quanto do crescimento virá de eficiência e quanto de verba']}
);

RULES.push(
 {id:'CRZ-47',sev:'alta',pad:'Capacidade de vagas',areas:()=>['reitoria',...[...new Set(capRows().filter(r=>r.ocup!=null&&r.ocup<0.7&&/Crescer|Recuperar/.test(unxGet(r.un,'expect'))).map(r=>r.un))]],t:'Vagas ociosas onde a reitoria quer crescer',
  test:()=>capRows().some(r=>r.ocup!=null&&r.ocup<0.7&&/Crescer|Recuperar/.test(unxGet(r.un,'expect'))),
  txt:()=>capRows().filter(r=>r.ocup!=null&&r.ocup<0.7&&/Crescer|Recuperar/.test(unxGet(r.un,'expect'))).map(r=>`${r.nm} (${r.mod}): ${pct(r.ocup)} das vagas ocupadas (${r.captados} de ${r.vagas}).`).join(' ')+' Antes de abrir cursos novos, há turma para encher nos cursos que já existem.',
  rec:['Plano de ocupação por curso com meta mensal','Priorizar cursos com mais vagas ociosas e melhor margem','Rever preço e condição nos cursos abaixo de 50% de ocupação']},
 {id:'CRZ-48',sev:'alta',pad:'Gargalo de fluxo',areas:['proreitoria','demandas'],t:'Lançamentos sem antecedência de divulgação',
  test:()=>cur.cursos.some(c=>c.status==='Lançamento')&&le(R('pro2'),2), txt:()=>`Há ${cur.cursos.filter(c=>c.status==='Lançamento').length} cursos em lançamento (${cur.cursos.filter(c=>c.status==='Lançamento').slice(0,4).map(c=>c.nome).join(', ')}${cur.cursos.filter(c=>c.status==='Lançamento').length>4?'…':''}), e o calendário acadêmico chega ao marketing com pouca antecedência. Cada lançamento vira urgência na fila.`,
  rec:['Pacote padrão de lançamento com prazo mínimo de 90 dias','Calendário de lançamentos aprovado pela reitoria']},
 {id:'CRZ-49',sev:'media',pad:'Contradição declarada',areas:()=>['captacao',...[...new Set(capRows().filter(r=>r.ating!=null&&r.ating<0.8).map(r=>r.un))]],t:'Captação bem avaliada, mas abaixo da meta',
  test:()=>ge(L('captacao'),3)&&capRows().some(r=>r.ating!=null&&r.ating<0.8),
  txt:()=>`A captação está no nível ${L('captacao')}, mas ${capRows().filter(r=>r.ating!=null&&r.ating<0.8).map(r=>`${r.nm} (${r.mod}) está em ${pct(r.ating)} da meta`).join('; ')}. Vale checar se a meta é realista ou se a conversão trava depois do lead.`,
  rec:['Funil por curso: lead, inscrito, matriculado','Comparar a meta com a capacidade e o histórico']}
);

RULES.push(
 {id:'CRZ-50',sev:'crit',pad:'Gargalo de fluxo',areas:['demandas','fluxo'],t:'Boa parte da fila fura o fluxo (urgência e gohorse)',
  test:()=>{const t=trelloStats();return t&&t.pFuram!=null&&t.pFuram>=0.3;}, txt:()=>{const t=trelloStats();return `${t.furam} dos ${t.abertos} projetos abertos no Trello (${pct(t.pFuram)}) estão em urgência ou gohorse. Com essa proporção, o planejado sempre perde para o que grita mais alto.`;},
  rec:['Critério escrito do que é urgência e quem pode pedir','Cota semanal fixa para urgências; o resto entra na fila','Revisão semanal dos gohorse: virar processo ou recusar']},
 {id:'CRZ-51',sev:'alta',pad:'Gargalo de fluxo',areas:['demandas','fluxo'],t:'Projetos parados ocupando a fila',
  test:()=>{const t=trelloStats();return t&&t.pParados!=null&&t.pParados>=0.2;}, txt:()=>{const t=trelloStats();return `${t.v.parados} projetos parados (${pct(t.pParados)} do que está aberto)${num(cur.campos['demandas.trello_dias_parado'])?`, parados em média há ${cur.campos['demandas.trello_dias_parado']} dias`:''}. Parado ainda consome atenção e esconde a fila real.`;},
  rec:['Mutirão para cancelar ou destravar os parados','Regra: parado há 15 dias volta para o solicitante']},
 {id:'CRZ-52',sev:'alta',pad:'Gargalo de capacidade',areas:['demandas','financeiro'],t:'A fila leva semanas para zerar',
  test:()=>{const t=trelloStats();return t&&t.semanas!=null&&t.semanas>=6;}, txt:()=>{const t=trelloStats();return `No ritmo atual (${t.concl} projetos concluídos por mês), a fila de ${t.abertos} projetos abertos leva cerca de ${dec(t.semanas,0)} semanas para zerar, sem contar o que ainda vai chegar.`;},
  rec:['Limitar o que entra por semana à capacidade real','Cortar ou adiar o backlog sem dono','Medir a vazão semanal e mostrar à reitoria']}
);
function finRows(){
  const rows=UNS.map(u=>{const f=unFin(u.id);return {id:u.id,nome:u.nome,level:L(u.id),score:SC[u.id].score,...f};});
  const totO=rows.reduce((a,r)=>a+(r.orcamento||0),0), totR=rows.reduce((a,r)=>a+(r.receita||0),0);
  rows.forEach(r=>{r.share=totO>0&&r.orcamento!=null?r.orcamento/totO:null; r.recShare=totR>0&&r.receita!=null?r.receita/totR:null; r.ating=r.meta_rec&&r.receita!=null?r.receita/r.meta_rec:null; r.orcRec=r.receita&&r.orcamento!=null?r.orcamento/r.receita:null; r.folhaRec=r.receita&&r.folha!=null?r.folha/r.receita:null; r.cpm=r.meta_mat&&r.orcamento!=null?r.orcamento/r.meta_mat:null;});
  return rows;
}
function weakest(id){const a=AREA[id]; let w=null; a.q.forEach(x=>{const n=cur.resp[x[0]]; if(n&&(!w||n<w.n||(n===w.n&&x[3]>w.i)))w={n,i:x[3],t:x[1]};}); return w&&w.n<=2?w.t:null;}
function eloFraco(){
  const out=[]; AREAS.concat(STAGES.filter(s=>s.q)).forEach(a=>{const s=SC[a.id]; if(s&&ge(s.score,3)&&le(s.pil.E,1.5))out.push({id:'CRZ-22',sev:'media',pad:'Elo fraco de pilar',areas:[a.id],t:`${a.nome}: resultado depende de poucas pessoas`,txt:`${a.nome} está no nível ${s.level}, mas o pilar Pessoas está em ${dec(s.pil.E)}. Se alguém sair, a maturidade cai junto.`,rec:['Documentar a operação em playbook','Treinar um segundo responsável'],gap:2});});
  return out;
}
function runEngine(){
  const out=[];
  RULES.forEach(r=>{let ok=false; try{ok=r.test();}catch(e){} if(ok){ let txt=''; try{txt=r.txt();}catch(e){} const areas=typeof r.areas==='function'?r.areas():(r.dyn?finAreas(r.id):r.areas); out.push({id:r.id,sev:r.sev,pad:r.pad,areas,t:r.t,txt,rec:r.rec,gap:gapOf(areas)});}});
  out.push(...eloFraco());
  out.sort((a,b)=>SEVW[b.sev]-SEVW[a.sev]||b.gap-a.gap);
  return out;
}
function finAreas(rid){ if(rid==='CRZ-21')return UNS.filter(u=>L(u.id)!=null).map(u=>u.id); return UNS.filter(u=>unFin(u.id).receita!=null||unFin(u.id).orcamento!=null).map(u=>u.id); }
function gapOf(ids){const l=ids.map(L).filter(x=>x!=null); return l.length>=2?Math.max(...l)-Math.min(...l):1;}

/* ================= FOFA ================= */
const FQ=[['f','Forças'],['w','Fraquezas'],['o','Oportunidades'],['a','Ameaças']];
function autoFofa(id, INS){
  const box=STG[id]&&!AREA[id]?STG[id]:AREA[id]; const r={f:[],w:[],o:[],a:[]};
  (box.q||[]).forEach(x=>{const n=cur.resp[x[0]]; if(!n)return;
    if(n>=3) r.f.push({t:`${x[1]}: ${x[6][n-1]}`,i:x[3]});
    else if(n===1) r.w.push({t:`${x[1]}: ${x[6][0]}`,i:x[3]});
    else r.o.push({t:`Evoluir ${x[1].toLowerCase()}: ${x[6][2]}`,i:x[3]});
    if(n===1&&x[4]) r.a.push({t:`${x[1]} em nível 1 trava a área no máximo em Estruturado`,i:3});
  });
  INS.filter(s=>s.areas.includes(id)).forEach(s=>r.a.push({t:s.t,i:SEVW[s.sev]}));
  return r;
}

/* ================= RENDER ================= */
function lvChip(l){return `<span class="lv l${l}" title="${l?LVL_DESC[l]:''}">${l?'N'+l+' · '+LVL[l]:'Sem nota'}</span>`;}
function stageProgress(s){
  if(s.id==='diagnostico'){let t=0,a=0;AREAS.forEach(x=>{t+=x.q.length;a+=x.q.filter(q=>cur.resp[q[0]]).length;});return (a/t)*0.9+baseProgress()*0.1;}
  const q=s.q||[]; return q.length?q.filter(x=>cur.resp[x[0]]).length/q.length:0;
}
function renderRail(){
  $('#rail').innerHTML=STAGES.map(s=>{const p=Math.round(stageProgress(s)*100);return `<button class="phase ${ui.stage===s.id?'on':''}" data-act="stage" data-v="${s.id}" aria-current="${ui.stage===s.id?'step':'false'}">
   <div class="ph-top"><span class="nb">${String(s.n).padStart(2,'0')}</span><span class="fase">FASE ${s.n}</span></div>
   <span class="tt">${s.nome}</span><span class="ds">${s.ds}</span>
   <span class="pg" aria-hidden="true"><span style="width:${p}%"></span></span><span class="pct">${p}% respondido</span></button>`;}).join('');
}
function statusHtml(){
  if(saveErr) return `<span class="status err"><i></i>${esc(saveErr)}</span>`;
  if(ver!==savedVer) return `<span class="status busy"><i></i>Salvando…</span>`;
  return `<span class="status"><i></i>Salvo</span>`;
}
function renderBar(){
  const list=Object.values(all).sort((a,b)=>(b.updated_at||'').localeCompare(a.updated_at||''));
  const who=me?`<span class="who"><span class="av" title="${esc(me.email)}">${esc(initials(me.nome||me.email))}</span><span>${esc((me.nome||me.email).split(' ')[0])}</span><button data-act="sair">Sair</button></span>`:'';
  $('#diagbar').innerHTML = ui.novo ? `
    <form id="f-novo" class="diag"><label class="lbl" for="novo-nome">Cliente</label><input id="novo-nome" placeholder="Nome do grupo ou instituição" required style="width:min(260px,100%)">
    <button class="btn primary" type="submit">Criar diagnóstico</button><button class="btn ghost" type="button" data-act="novo-cancel">Cancelar</button></form>${who}` : `
    ${cur?`<label class="lbl" for="sel-diag">Diagnóstico</label>
    <select id="sel-diag">${list.map(d=>`<option value="${esc(d.id)}" ${d.id===cur.id?'selected':''}>${esc(d.id===cur.id?cur.nome:d.nome)}</option>`).join('')}</select>
    <input id="nome-diag" value="${esc(cur.nome)}" aria-label="Nome do cliente">`:''}
    ${cur?`<button class="btn" data-act="dre-go">Importar DRE</button>`:''}
    ${me&&me.papel!=='cliente'?`<button class="btn" data-act="novo">+ Novo</button>`:''}
    ${cur?`<span id="status">${statusHtml()}</span>`:''}${who}`;
}
function renderStatus(){const s=$('#status'); if(s)s.innerHTML=statusHtml();}

function fieldHtml(key,label,type){
  const v=cur.campos[key]??'';
  if(type==='t') return `<div class="field ${label.length>34?'wide':''}"><label for="c-${esc(key)}">${esc(label)}</label><textarea id="c-${esc(key)}" data-campo="${esc(key)}" rows="2">${esc(v)}</textarea></div>`;
  const u={'R$':'R$','%':'%','min':'min','d':'dias','n':''}[type]||''; const pre=type==='R$';
  return `<div class="field"><label for="c-${esc(key)}">${esc(label)}</label><div class="inu ${pre?'pre':''}"><input id="c-${esc(key)}" data-campo="${esc(key)}" inputmode="decimal" value="${esc(v)}" placeholder="0">${u?`<span class="u">${u}</span>`:''}</div></div>`;
}
function qHtml(x){
  const n=cur.resp[x[0]];
  return `<article class="q" id="q-${x[0]}">
   <div class="qmeta"><span class="tag">${PIL[x[2]]}</span><span class="tag">${IMP[x[3]]}</span>${x[4]?'<span class="tag warn">Eliminatória</span>':''}<span class="code">${x.code}</span></div>
   <h4>${esc(x[5])}</h4>
   <div class="opts" role="radiogroup" aria-label="${esc(x[1])}">${x[6].map((o,i)=>`<button class="opt ${n===i+1?'on n'+(i+1):''}" role="radio" aria-checked="${n===i+1}" data-act="opt" data-q="${x[0]}" data-n="${i+1}"><span class="on-n"><span>N${i+1}</span><span>${LVL[i+1]}</span></span><span>${esc(o)}</span></button>`).join('')}</div>
   <div class="qfoot">${cur.notas[x[0]]||ui.notesOpen[x[0]]?`<textarea data-nota="${x[0]}" rows="1" placeholder="Evidências e observações da entrevista" aria-label="Observações sobre ${esc(x[1])}">${esc(cur.notas[x[0]]||'')}</textarea>`:`<button class="addnote" data-act="note" data-q="${x[0]}">+ Adicionar observação</button>`}
   <label class="evid"><input type="checkbox" data-evid="${x[0]}" ${cur.evid[x[0]]?'checked':''}>Comprovado com evidência</label></div>
  </article>`;
}
function pillarsHtml(s){
  return `<div class="pillars">${Object.entries(PIL).map(([k,nm])=>{const v=s.pil[k]; const l=lvOf(v); return `<div class="pill"><div class="pl"><span>${nm}</span><span class="num">${v==null?'—':dec(v)}</span></div><div class="bar4"><span style="width:${v==null?0:((v-1)/3*100).toFixed(1)}%;background:var(--n${l||1})"></span></div></div>`;}).join('')}</div>`;
}
function headHtml(eyebrow,title,lead,s){
  const sc = s&&s.score!=null;
  return `<header class="ph"><div><span class="eyebrow">${eyebrow}</span><h2 style="margin-top:8px">${esc(title)}</h2>${lead?`<p class="lead">${esc(lead)}</p>`:''}</div>
   <div class="scorebox">${lvChip(sc?s.level:0)}<div class="big">${sc?dec(s.score):'—'}<small> / 4</small></div><span class="muted mono" style="font-size:12px">${s?`${s.ans} de ${s.total} respondidas`:''}${s&&s.elim?' · travado por eliminatória':''}</span></div>
   ${s?pillarsHtml(s):''}</header>`;
}
function interviewsHtml(areaId){
  const rows=cur.entrevistas.map((e,i)=>({e,i})).filter(r=>r.e.area===areaId);
  return `<section class="block"><div class="block-h"><h3>Entrevistados</h3><p>Quem você ouviu nesta área, 1 a 1.</p></div>
   ${rows.length?`<div class="tblw"><table class="tbl"><thead><tr><th>Nome</th><th>Cargo</th><th>Departamento</th><th>Data</th><th></th></tr></thead><tbody>${rows.map(({e,i})=>`<tr>
     <td><input data-ent="${i}" data-f="nome" value="${esc(e.nome)}" placeholder="Nome" aria-label="Nome"></td>
     <td><input data-ent="${i}" data-f="cargo" value="${esc(e.cargo)}" placeholder="Cargo" aria-label="Cargo"></td>
     <td><input data-ent="${i}" data-f="depto" value="${esc(e.depto)}" placeholder="Departamento" aria-label="Departamento"></td>
     <td><input type="date" data-ent="${i}" data-f="data" value="${esc(e.data)}" aria-label="Data"></td>
     <td class="x"><button class="xbtn" data-act="ent-del" data-i="${i}" aria-label="Remover entrevistado">×</button></td></tr>`).join('')}</tbody></table></div>`:'<p class="empty">Nenhum entrevistado registrado nesta área.</p>'}
   <div><button class="btn sm" data-act="ent-add" data-area="${areaId}">+ Adicionar entrevistado</button></div></section>`;
}
function fofaHtml(key, auto, title, note){
  const man=cur.fofa[key]||{}; const lib=FOFA_LIB[key]||{};
  const nomeArea=key==='geral'?'o diagnóstico geral':nameOf(key);
  return `<section class="block"><div class="block-h"><h3>${title||'Matriz FOFA'}</h3><p>${note||'Itens automáticos vêm das respostas e do motor de cruzamento. Inclua os seus ou escolha entre as sugestões estratégicas.'}</p></div>
  <div class="fofa">${FQ.map(([k,nm])=>{const a=(auto[k]||[]); const m=man[k]||[]; const sug=(lib[k]||[]).filter(t=>!m.includes(t)); const open=ui.fofaSug[key+'.'+k];
   return `<div class="fq ${k}"><h4>${nm}<small>${a.length+m.length} itens</small></h4>
   <ul>${a.map(it=>`<li><span class="src">${it.src?esc(it.src):'auto'}</span><span class="t">${esc(it.t)}</span></li>`).join('')}
   ${m.map((t,i)=>`<li><span class="src man">${(lib[k]||[]).includes(t)?'sugestão':'seu'}</span><span class="t">${esc(t)}</span><button class="xbtn" data-act="fofa-del" data-key="${esc(key)}" data-k="${k}" data-i="${i}" aria-label="Remover">×</button></li>`).join('')}
   ${!a.length&&!m.length?'<li class="muted" style="font-size:13px">Nada ainda.</li>':''}</ul>
   ${sug.length?`<button class="sugtoggle" data-act="fofa-sug" data-key="${esc(key)}" data-k="${k}" aria-expanded="${!!open}">${open?'Esconder sugestões':`Sugestões para ${esc(nomeArea)} (${sug.length})`}</button>
   ${open?`<div class="sugchips">${sug.map(t=>`<button class="sugchip" data-act="fofa-pick" data-key="${esc(key)}" data-k="${k}" data-t="${esc(t)}">+ ${esc(t)}</button>`).join('')}</div>`:''}`:''}
   <form data-fofa="${esc(key)}" data-k="${k}"><input placeholder="Escrever em ${nm.toLowerCase()}" aria-label="Adicionar em ${nm}"><button class="btn sm" type="submit">Incluir</button></form></div>`;}).join('')}</div></section>`;
}
function insightHtml(s, withPlan){
  return `<article class="insight ${s.sev}"><span class="stripe"></span><div>
   <div class="ih"><span class="sev">${SEV[s.sev]}</span><span class="ttl">${esc(s.t)}</span><span class="cd">${s.id} · ${esc(s.pad)}</span></div>
   <p>${esc(s.txt)}</p>
   <ul>${s.rec.map(r=>`<li>${esc(r)}</li>`).join('')}</ul>
   <div class="ia">${s.areas.map(a=>`<button class="chip" data-act="goto" data-v="${a}">${esc(nameOf(a))}</button>`).join('')}
   ${withPlan?`<button class="btn sm" data-act="plan-ins" data-id="${s.id}" data-t="${esc(s.t)}" style="margin-left:auto">Levar ao plano de ação</button>`:''}</div></div></article>`;
}

function renderAreaPanel(INS, LIST, override){
  if(override==null&&!LIST.some(x=>x.id===ui.area)) ui.area=LIST[0].id;
  const a=AREA[override!=null?LIST[0].id:ui.area], s=SC[a.id];
  const pri=jornadaIds();
  const groups=[...new Set(LIST.map(x=>x.g))];
  const nav=groups.map(g=>`<div class="grp"><span class="eyebrow">${g}</span>${LIST.filter(x=>x.g===g).map(x=>{const sx=SC[x.id];return `<button class="anav ${x.id===ui.area?'on':''}" data-act="area" data-v="${x.id}"><span>${pri.includes(x.id)?'<b class="star" title="Prioridade da reitoria">★</b> ':''}${x.nome}</span>${sx.score!=null?`<span class="lv l${sx.level}">N${sx.level}</span>`:`<span class="cnt">${sx.ans}/${sx.total}</span>`}</button>`;}).join('')}</div>`).join('');
  const sel=`<select class="anav-sel" id="area-sel" aria-label="Área">${groups.map(g=>`<optgroup label="${g}">${LIST.filter(x=>x.g===g).map(x=>`<option value="${x.id}" ${x.id===a.id?'selected':''}>${x.nome} (${SC[x.id].ans}/${SC[x.id].total})</option>`).join('')}</optgroup>`).join('')}</select>`;
  const ORD=ui.dstep==='entrevistas'?jornadaLista():LIST; const idx=ORD.indexOf(a), prev=ORD[idx-1], next=ORD[idx+1];
  const avaliadas=AREAS.filter(x=>SC[x.id].score!=null).length, crit=INS.filter(i=>i.sev==='crit').length;
  const myIns=INS.filter(i=>i.areas.includes(a.id));
  const volTitle=a.volTitle||(a.un?'Números da UN':'Volume operacional e KPIs');
  const volNote=a.roteiro?'Perguntas abertas para conduzir a conversa. Os números entram nos cruzamentos do motor.':a.un?'Meta, receita, folha e orçamento entram no cruzamento financeiro entre UNs.':'Números do período. Entram nos cruzamentos do motor.';
  const volBlock=`<section class="block"><div class="block-h"><h3>${volTitle}</h3><p>${volNote}</p></div><div class="fields">${a.vol.map(v=>fieldHtml(a.id+'.'+v[0],v[1],v[2])).join('')}${fieldHtml(a.id+'.contexto','Contexto da entrevista: dores, citações, o que chamou atenção','t')}</div></section>`;
  const pend=ORD.find(x=>SC[x.id].ans<x.q.length);
  const areaTasks=cur.acoes.filter(t=>t.area===a.id);
  const dono=cur.dono_area[a.id];
  const html=`
   <div class="banner"><span><b>${avaliadas}</b> de ${AREAS.length} áreas com nota · <b>${INS.length}</b> incongruências${crit?` · <b style="color:var(--n1)">${crit} críticas</b>`:''}</span>
    <span style="display:flex;gap:8px;flex-wrap:wrap">${pend&&pend.id!==a.id?`<button class="btn sm" data-act="area" data-v="${pend.id}">Continuar de onde parei</button>`:''}<button class="btn sm" data-act="stage" data-v="resultados">Ver resultados →</button></span></div>
   <div class="work" style="margin-top:16px">
    <aside class="side" aria-label="Áreas">${ui.dstep==='entrevistas'&&pri.length?`<div class="grp"><span class="eyebrow">Jornada priorizada</span>${jornadaLista().filter(x=>pri.includes(x.id)).map((x,i)=>`<button class="anav ${x.id===a.id?'on':''}" data-act="area" data-v="${x.id}"><span>${i+1}. ${x.nome}</span>${SC[x.id].score!=null?`<span class="lv l${SC[x.id].level}">N${SC[x.id].level}</span>`:`<span class="cnt">${SC[x.id].ans}/${SC[x.id].total}</span>`}</button>`).join('')}</div>`:''}${nav}${ui.dstep==='reitoria'?`<div class="grp"><span class="eyebrow">Saída da reitoria</span><button class="anav ${ui.area==='direcionamentos'?'on':''}" data-act="area" data-v="direcionamentos"><span>Direcionamentos</span><span class="cnt">${pri.length}</span></button></div>`:''}</aside>
    <section class="panel">${sel}
     ${headHtml(`// ${a.g} · <b>${String(idx+1).padStart(2,'0')}/${ORD.length}</b>`,a.nome,a.desc,s)}
     ${a.un&&unExpResumo(a.id)?`<div class="banner"><span><b>Reitoria:</b> ${esc(unExpResumo(a.id))}</span><button class="chip" data-act="area" data-v="reitoria">Ver na Reitoria</button></div>`:''}
     <div class="ivcta"><button class="btn primary" data-act="iv-start" data-v="${a.id}">▶ Modo entrevista: ${esc(a.nome)}</button><span class="muted">Uma pergunta por tela, com o roteiro ao lado.</span></div>
     <div class="collector"><span>Coleta desta área:</span><select data-dono-area="${a.id}" aria-label="Responsável pela coleta"><option value="">Sem responsável</option>${cur.equipe.map(m=>`<option value="${m.id}" ${dono===m.id?'selected':''}>${esc(m.nome||'Sem nome')}</option>`).join('')}</select>
      ${!cur.equipe.length?`<button class="chip" data-act="view" data-v="equipe">+ Cadastrar equipe</button>`:''}
      <span style="margin-left:auto">${areaTasks.length?`<button class="chip" data-act="tasks-area" data-v="${a.id}">${areaTasks.filter(t=>t.status!=='Concluída').length} tarefas abertas nesta área</button>`:`<button class="chip" data-act="task-new" data-area="${a.id}">+ Tarefa para esta área</button>`}</span></div>
     ${interviewsHtml(a.id)}
     ${a.roteiro?volBlock:''}
     ${a.id==='financeiro'?dreHtmlImport():''}
     ${a.id==='reitoria'?unExpHtml():''}
     ${a.id==='demandas'?trelloHtml():''}
     ${a.q.map(qHtml).join('')}
     <section class="block"><div class="block-h"><h3>Dores relatadas nesta área</h3><p>${cur.dores.filter(d=>d.area===a.id).length} registradas · alimentam o mapa de gargalos</p></div>
      ${cur.dores.some(d=>d.area===a.id)?`<div class="tblw"><table class="tbl"><thead><tr><th>Dor</th><th>Etapa</th><th>Tipo</th><th>Gravidade</th><th>Frequência</th><th>Relatado por</th><th></th></tr></thead><tbody>${cur.dores.filter(d=>d.area===a.id).map(d=>dorRow(d,true)).join('')}</tbody></table></div>`:''}
      ${dorFormHtml(a.id)}</section>
     ${a.roteiro?'':volBlock}
     ${myIns.length?`<section class="block"><div class="block-h"><h3>Incongruências desta área</h3></div><div class="ins">${myIns.map(i=>insightHtml(i,false)).join('')}</div></section>`:''}
     ${fofaHtml(a.id, autoFofa(a.id,INS))}
     <div class="pager">${prev?`<button class="btn" data-act="area" data-v="${prev.id}">← ${prev.nome}</button>`:'<span></span>'}${next?`<button class="btn primary" data-act="area" data-v="${next.id}">${next.nome} →</button>`:ui.dstep==='reitoria'?`<button class="btn primary" data-act="area" data-v="direcionamentos">Direcionamentos →</button>`:`<button class="btn primary" data-act="stage" data-v="estrategia">Ir para Estratégia →</button>`}</div>
    </section></div>`;
  if(override!=null){ const i=html.indexOf('<section class="panel">'); return html.slice(0,i)+'<section class="panel">'+override+'</section></div>'; }
  return html;
}

/* ---------- Fase 1 em 3 passos ---------- */
const LID=AREAS.filter(a=>a.g==='Liderança e governança'), ENT=AREAS.filter(a=>a.g!=='Liderança e governança');
const DSTEPS=[['base','Base de conhecimento','Cursos, preços, vagas e capacidade'],['reitoria','Reitoria e direcionamentos','Dores, metas, DRE, autonomia e foco'],['entrevistas','Entrevistas','Jornada 1 a 1 pelas áreas e UNs']];
const stepOf=id=>id==='direcionamentos'||LID.some(a=>a.id===id)?'reitoria':'entrevistas';
const jornadaIds=()=>(cur.campos['jornada.ordem']||'').split('|').filter(id=>ENT.some(a=>a.id===id));
const jornadaLista=()=>{ const p=jornadaIds(); return [...p.map(id=>AREA[id]), ...ENT.filter(a=>!p.includes(a.id))]; };
const CAPROWS=[['colegio','colegio','Colégio','Ano letivo'],['grad_diurno','graduacao','Graduação','Presencial diurno'],['grad_noturno','graduacao','Graduação','Presencial noturno'],['grad_ead','graduacao','Graduação','EAD'],['pos_noturno','pos','Pós-Graduação','Noturno'],['pos_ead','pos','Pós-Graduação','EAD'],['pos_hibrido','pos','Pós-Graduação','Híbrido'],['mestrado','mestrado','Mestrado','Presencial']];
function capRows(){ return CAPROWS.map(([k,un,nm,mod])=>{ const g=f=>num(cur.campos[`base.cap.${k}.${f}`]); const r={k,un,nm,mod,vagas:g('vagas'),meta:g('meta'),captados:g('captados'),ticket:g('ticket')}; r.ocup=r.vagas>0&&r.captados!=null?r.captados/r.vagas:null; r.ating=r.meta>0&&r.captados!=null?r.captados/r.meta:null; return r; }); }
function baseProgress(){ const filled=capRows().filter(r=>r.vagas!=null).length; return Math.min(1,(filled/CAPROWS.length)*0.6+(cur.cursos.length?0.4:0)); }
function stepProgress(id){ if(id==='base')return baseProgress(); const L=id==='reitoria'?LID:ENT; let t=0,a=0; L.forEach(x=>{t+=x.q.length;a+=x.q.filter(q=>cur.resp[q[0]]).length;}); return t?a/t:0; }
function stepperHtml(){ return `<nav class="dsteps" aria-label="Passos do diagnóstico">${DSTEPS.map(([id,nm,ds],i)=>`<button class="dstep ${ui.dstep===id?'on':''}" data-act="dstep" data-v="${id}"><span class="dn">${i+1}</span><span class="dt"><b>${nm}</b><small>${ds}</small></span><span class="dp">${Math.round(stepProgress(id)*100)}%</span></button>`).join('')}</nav>`; }
function renderDiagnostico(INS){
  let inner;
  if(ui.dstep==='base') inner=baseHtml(INS);
  else if(ui.dstep==='reitoria'&&ui.area==='direcionamentos') inner=renderAreaPanel(INS,LID,direcHtml());
  else inner=renderAreaPanel(INS, ui.dstep==='reitoria'?LID:ENT);
  $('#main').innerHTML=stepperHtml()+inner;
}
function cap$(k,f,unit){ const key=`base.cap.${k}.${f}`; return `<div class="inu ${unit==='R$'?'pre':''}"><input data-campo="${key}" id="c-${key}" inputmode="decimal" value="${esc(cur.campos[key]||'')}" placeholder="0" aria-label="${f}">${unit?`<span class="u">${unit}</span>`:''}</div>`; }
function baseHtml(INS){
  const rows=capRows(); const tot=k=>{const v=rows.map(r=>r[k]).filter(x=>x!=null);return v.length?v.reduce((a,b)=>a+b,0):null;};
  const vig=cur.cursos.filter(c=>c.status==='Vigente').length, lan=cur.cursos.filter(c=>c.status==='Lançamento').length;
  const tv=tot('vagas'), tc=tot('captados'), tm=tot('meta');
  const pctCell=(x,warn)=>x==null?'<td class="r muted">—</td>':`<td class="r" style="${x<warn?'color:var(--n1);font-weight:600':''}">${pct(x)}</td>`;
  const opt=(v,list)=>list.map(o=>`<option ${v===o?'selected':''}>${o}</option>`).join('');
  const pv=ui.cursoPreview;
  return `<section class="panel">
   <header class="ph" style="grid-template-columns:minmax(0,1fr)"><div><span class="eyebrow">// Passo 1 · <b>Base de conhecimento</b></span><h2 style="margin-top:8px">Base de conhecimento</h2><p class="lead">Antes das entrevistas: o que a instituição vende, por quanto, com quantas vagas e quanto já captou. Esses números entram nos cruzamentos com as expectativas da reitoria.</p></div></header>
   <div class="stats"><div class="stat"><b>${vig}</b><span>cursos vigentes</span></div><div class="stat"><b>${lan}</b><span>lançamentos previstos</span></div><div class="stat"><b>${tv!=null?tv.toLocaleString('pt-BR'):'—'}</b><span>vagas no ciclo</span></div><div class="stat ${tv&&tc!=null&&tc/tv<0.7?'warn':''}"><b>${tv&&tc!=null?pct(tc/tv):'—'}</b><span>ocupação das vagas</span></div><div class="stat ${tm&&tc!=null&&tc/tm<0.8?'bad':''}"><b>${tm&&tc!=null?pct(tc/tm):'—'}</b><span>da meta de captação</span></div></div>
   <section class="block"><div class="block-h"><h3>Capacidade de captação por UN e turno</h3><p>Vagas do ciclo, meta, quantos já captou e a mensalidade média.</p></div>
    <div class="tblw"><table class="tbl cap"><thead><tr><th>UN</th><th>Turno ou modalidade</th><th class="r">Vagas</th><th class="r">Meta de captação</th><th class="r">Captados</th><th class="r">Mensalidade média</th><th class="r">Ocupação</th><th class="r">Da meta</th></tr></thead><tbody>
     ${rows.map(r=>`<tr><td>${r.nm}</td><td class="muted">${r.mod}</td><td>${cap$(r.k,'vagas')}</td><td>${cap$(r.k,'meta')}</td><td>${cap$(r.k,'captados')}</td><td>${cap$(r.k,'ticket','R$')}</td>${pctCell(r.ocup,0.7)}${pctCell(r.ating,0.8)}</tr>`).join('')}
     <tr><td><b>Total</b></td><td></td><td class="r"><b>${tv!=null?tv.toLocaleString('pt-BR'):'—'}</b></td><td class="r"><b>${tm!=null?tm.toLocaleString('pt-BR'):'—'}</b></td><td class="r"><b>${tc!=null?tc.toLocaleString('pt-BR'):'—'}</b></td><td></td>${pctCell(tv&&tc!=null?tc/tv:null,0.7)}${pctCell(tm&&tc!=null?tc/tm:null,0.8)}</tr>
    </tbody></table></div></section>
   <section class="block"><div class="block-h"><h3>Cursos vigentes e lançamentos</h3><p>${cur.cursos.length} cursos cadastrados</p></div>
    ${cur.cursos.length?`<div class="tblw"><table class="tbl"><thead><tr><th>UN</th><th style="min-width:200px">Curso</th><th>Modalidade</th><th>Turno</th><th>Mensalidade</th><th>Vagas</th><th>Matriculados</th><th>Status</th><th>Lançamento</th><th></th></tr></thead><tbody>${cur.cursos.map(c=>`<tr>
      <td><select data-curso="${c.id}" data-f="un" aria-label="UN"><option value=""></option>${UNS.map(u=>`<option value="${u.id}" ${c.un===u.id?'selected':''}>${u.nome}</option>`).join('')}</select></td>
      <td><input data-curso="${c.id}" data-f="nome" value="${esc(c.nome)}" aria-label="Curso"></td>
      <td><select data-curso="${c.id}" data-f="modalidade" aria-label="Modalidade"><option value=""></option>${opt(c.modalidade,['Presencial','EAD','Híbrido'])}</select></td>
      <td><select data-curso="${c.id}" data-f="turno" aria-label="Turno"><option value=""></option>${opt(c.turno,['Diurno','Noturno','Integral','Flexível'])}</select></td>
      <td><input data-curso="${c.id}" data-f="preco" value="${esc(c.preco)}" inputmode="decimal" aria-label="Mensalidade" style="width:110px"></td>
      <td><input data-curso="${c.id}" data-f="vagas" value="${esc(c.vagas)}" inputmode="decimal" aria-label="Vagas" style="width:80px"></td>
      <td><input data-curso="${c.id}" data-f="matriculados" value="${esc(c.matriculados)}" inputmode="decimal" aria-label="Matriculados" style="width:90px"></td>
      <td><select data-curso="${c.id}" data-f="status" aria-label="Status">${opt(c.status,['Vigente','Lançamento','Descontinuado'])}</select></td>
      <td><input data-curso="${c.id}" data-f="lancamento" value="${esc(c.lancamento)}" placeholder="mês/ano" aria-label="Lançamento" style="width:90px"></td>
      <td class="x"><button class="xbtn" data-act="curso-del" data-id="${c.id}" aria-label="Remover curso">×</button></td></tr>`).join('')}</tbody></table></div>`:'<p class="empty">Nenhum curso ainda. Adicione um por um ou cole a lista da planilha da instituição.</p>'}
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn sm" data-act="curso-add">+ Curso</button></div>
    <details class="paste" ${pv?'open':''}><summary>Colar lista de cursos da planilha</summary>
     <p class="muted" style="font-size:13px">Colunas, nesta ordem: UN · Curso · Modalidade · Turno · Mensalidade · Vagas · Matriculados · Status · Lançamento. Copie direto do Excel.</p>
     <textarea id="curso-txt" rows="5" style="width:100%;font-family:var(--mono);font-size:13px" placeholder="Graduação	Administração	Presencial	Noturno	1.290	120	96	Vigente">${esc(ui.cursoTxt||'')}</textarea>
     <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn sm" data-act="curso-ler">Ler lista</button>${pv&&pv.length?`<button class="btn sm primary" data-act="curso-aplicar">Adicionar ${pv.length} cursos</button>`:''}</div>
     ${pv?`<p class="muted" style="font-size:13px">${pv.length} cursos reconhecidos${pv.filter(c=>!c.un).length?`, ${pv.filter(c=>!c.un).length} sem UN reconhecida (ajuste depois na tabela)`:''}.</p>`:''}
    </details></section>
   <section class="block"><div class="block-h"><h3>Contexto do mercado</h3></div><div class="fields">${fieldHtml('base.calendario','Calendário de captação: períodos, vestibulares, editais e marcos do ano','t')}${fieldHtml('base.concorrentes','Principais concorrentes por UN e como se posicionam','t')}${fieldHtml('base.diferenciais','Diferenciais da instituição por UN (o que ela tem e o concorrente não)','t')}</div></section>
   <div class="pager"><span></span><button class="btn primary" data-act="dstep" data-v="reitoria">Ir para Reitoria →</button></div>
  </section>`;
}
const UN_ALIAS=[['pos',/p[oó]s|mba|especializa/i],['mestrado',/mestrado|doutorado|stricto/i],['colegio',/col[eé]gio|b[aá]sica|fundamental|m[eé]dio|infantil/i],['graduacao',/gradua|bacharel|licenciatura|tecn[oó]logo/i]];
function cursoParse(txt){
  return txt.split(/\r?\n/).map(l=>l.trim()).filter(Boolean).map(l=>{ const c=l.split(/\t|;/).map(x=>x.trim());
    if(/^un$|^unidade/i.test(c[0]||''))return null;
    const un=(UN_ALIAS.find(([,re])=>re.test(c[0]||''))||[])[0]||'';
    const st=/lan[cç]/i.test(c[7]||'')?'Lançamento':/descon/i.test(c[7]||'')?'Descontinuado':'Vigente';
    const mod=/ead|dist/i.test(c[2]||'')?'EAD':/h[ií]br/i.test(c[2]||'')?'Híbrido':(c[2]?'Presencial':'');
    const tur=/not/i.test(c[3]||'')?'Noturno':/diur|manh|tarde/i.test(c[3]||'')?'Diurno':/integ/i.test(c[3]||'')?'Integral':(c[3]?'Flexível':'');
    return {id:uid(),un,nome:c[1]||'',modalidade:mod,turno:tur,preco:c[4]||'',vagas:c[5]||'',matriculados:c[6]||'',status:st,lancamento:c[8]||'',obs:''};
  }).filter(x=>x&&x.nome);
}
function direcHtml(){
  const pri=jornadaIds();
  return `<header class="ph" style="grid-template-columns:minmax(0,1fr)"><div><span class="eyebrow">// Passo 2 · <b>Saída da reitoria</b></span><h2 style="margin-top:8px">Direcionamentos</h2><p class="lead">Com o que a reitoria contou, escolha por onde começar as entrevistas. A ordem dos cliques é a ordem da jornada.</p></div></header>
   ${UNS.some(u=>unExpResumo(u.id))?`<section class="block"><div class="block-h"><h3>O que a reitoria espera de cada UN</h3></div><div class="xlist">${UNS.filter(u=>unExpResumo(u.id)).map(u=>`<div class="xitem media"><span class="t">${esc(u.nome)}<small>${esc(unExpResumo(u.id))}</small></span></div>`).join('')}</div></section>`:''}
   <section class="block"><div class="block-h"><h3>Áreas e UNs para entrevistar</h3><p>${pri.length} escolhidas</p></div>
    <div class="areachips">${ENT.map(a=>{const i=pri.indexOf(a.id);return `<button class="achip ${i>=0?'on':''}" data-act="jornada-toggle" data-v="${a.id}">${i>=0?`<b>${i+1}</b> · `:''}${esc(a.nome)}</button>`;}).join('')}</div>
    ${pri.length?`<div class="tblw"><table class="tbl"><thead><tr><th>#</th><th>Área ou UN</th><th style="min-width:200px">Quem entrevistar</th><th>Data prevista</th><th>Responsável pela coleta</th><th></th></tr></thead><tbody>${pri.map((id,i)=>`<tr><td class="mono">${i+1}</td><td>${esc(AREA[id].nome)}</td>
      <td><input data-campo="jornada.${id}.quem" value="${esc(cur.campos['jornada.'+id+'.quem']||'')}" placeholder="Nome e cargo" aria-label="Quem entrevistar"></td>
      <td><input type="date" data-campo="jornada.${id}.data" value="${esc(cur.campos['jornada.'+id+'.data']||'')}" aria-label="Data prevista"></td>
      <td><select data-dono-area="${id}" aria-label="Responsável"><option value="">Sem responsável</option>${cur.equipe.map(m=>`<option value="${m.id}" ${cur.dono_area[id]===m.id?'selected':''}>${esc(m.nome||'Sem nome')}</option>`).join('')}</select></td>
      <td style="white-space:nowrap"><button class="xbtn" data-act="jornada-up" data-v="${id}" aria-label="Subir" ${i?'':'disabled'}>↑</button></td></tr>`).join('')}</tbody></table></div>`:'<p class="empty">Toque nas áreas acima na ordem em que quer entrevistar.</p>'}
    <div style="display:flex;gap:8px;flex-wrap:wrap">${pri.length?`<button class="btn" data-act="jornada-tarefas">Criar entrevistas no kanban</button>`:''}<button class="btn primary" data-act="dstep" data-v="entrevistas">Começar entrevistas →</button></div>
   </section>
   ${fieldHtml('jornada.notas','Direcionamentos da reitoria para a consultoria (o que olhar com mais atenção, quem ouvir, o que evitar)','t')}`;
}
function stageHead(st){return headHtml(`// ${String(st.n).padStart(2,'0')} · <b>Fase ${st.n}</b>`,st.nome,st.intro,SC[st.id]);}
function stageQs(st){return `${st.q.map(qHtml).join('')}${st.vol&&st.vol.length?`<section class="block"><div class="block-h"><h3>Campos abertos</h3><p>Anotações e números desta fase.</p></div><div class="fields">${st.vol.map(v=>fieldHtml(st.id+'.'+v[0],v[1],v[2])).join('')}</div></section>`:''}`;}
function nextBtn(st){const n=STAGES[st.n]; return n?`<div class="pager"><button class="btn" data-act="stage" data-v="${STAGES[st.n-2].id}">← ${STAGES[st.n-2].nome}</button><button class="btn primary" data-act="stage" data-v="${n.id}">${n.nome} →</button></div>`:'';}

function renderEstrategia(INS){
  const st=STG.estrategia;
  $('#main').innerHTML=`<section class="panel">${stageHead(st)}${stageQs(st)}${fofaHtml('estrategia',autoFofa('estrategia',INS),'FOFA da estratégia')}${nextBtn(st)}</section>`;
}
function suggestions(INS){
  const out=[]; const seen=new Set(cur.acoes.map(a=>a.txt));
  INS.forEach(i=>i.rec.forEach(r=>out.push({txt:r,area:i.areas[0]||'',src:i.id})));
  AREAS.forEach(a=>a.q.forEach(x=>{const n=cur.resp[x[0]]; if(n&&n<=2&&x[3]===3) out.push({txt:`${x[1]}: ${x[6][n]}`,area:a.id,src:x.code});}));
  const uniq=[]; const u=new Set(); out.forEach(o=>{if(!u.has(o.txt)){u.add(o.txt);uniq.push({...o,in:seen.has(o.txt)});}});
  return uniq.slice(0,16);
}
/* ---------- Tarefas (kanban) ---------- */
const areaOptsAll=sel=>`<option value="">Geral</option>`+AREAS.concat(STAGES.slice(1,4)).map(x=>`<option value="${x.id}" ${sel===x.id?'selected':''}>${esc(x.nome)}</option>`).join('');
const donoOpts=sel=>`<option value="">Sem responsável</option>`+cur.equipe.map(m=>`<option value="${m.id}" ${sel===m.id?'selected':''}>${esc(m.nome||'Sem nome')}</option>`).join('');
function fmtDate(d){ if(!d)return ''; const [y,m,dd]=d.split('-'); return `${dd}/${m}`; }
function cardHtml(t){
  const m=member(t.dono);
  if(ui.openTask===t.id) return `<article class="kcard open" data-task="${t.id}">
    <div class="kedit">
     <textarea data-task-f="txt" data-id="${t.id}" aria-label="Tarefa" placeholder="O que precisa ser feito">${esc(t.txt)}</textarea>
     <select data-task-f="area" data-id="${t.id}" aria-label="Área">${areaOptsAll(t.area)}</select>
     <select data-task-f="dono" data-id="${t.id}" aria-label="Responsável">${donoOpts(t.dono)}</select>
     <input type="date" data-task-f="prazo" data-id="${t.id}" value="${esc(t.prazo)}" aria-label="Prazo">
     <select data-task-f="status" data-id="${t.id}" aria-label="Coluna">${COLS.map(c=>`<option ${t.status===c?'selected':''}>${c}</option>`).join('')}</select>
     <div class="row"><button class="btn sm ghost" data-act="task-del" data-id="${t.id}">Excluir</button><button class="btn sm primary" data-act="task-close">Pronto</button></div>
    </div></article>`;
  return `<button class="kcard" draggable="true" data-task="${t.id}" data-act="task-open" data-id="${t.id}">
    <span class="kt">${esc(t.txt||'Sem título')}</span>
    <span class="km">${t.area?`<span class="chip">${esc(nameOf(t.area))}</span>`:''}${t.origem&&t.origem.startsWith('CRZ')?`<span class="chip">${esc(t.origem)}</span>`:''}${t.prazo?`<span class="due ${isLate(t)?'late':''}">${isLate(t)?'Atrasada · ':''}${fmtDate(t.prazo)}</span>`:''}${m?`<span class="av" title="${esc(m.nome)}" style="margin-left:auto">${esc(initials(m.nome))}</span>`:''}</span></button>`;
}
function kanbanHtml(){
  const f=ui.kf; const list=cur.acoes.filter(t=>(!f.dono||t.dono===f.dono||(f.dono==='-'&&!t.dono))&&(!f.area||t.area===f.area));
  return `<div class="kfilters"><select id="kf-dono" aria-label="Filtrar por responsável"><option value="">Todos os responsáveis</option><option value="-" ${f.dono==='-'?'selected':''}>Sem responsável</option>${cur.equipe.map(m=>`<option value="${m.id}" ${f.dono===m.id?'selected':''}>${esc(m.nome||'Sem nome')}</option>`).join('')}</select>
    <select id="kf-area" aria-label="Filtrar por área"><option value="">Todas as áreas</option>${AREAS.concat(STAGES.slice(1,4)).map(x=>`<option value="${x.id}" ${f.area===x.id?'selected':''}>${esc(x.nome)}</option>`).join('')}</select>
    ${f.dono||f.area?`<button class="chip" data-act="kf-clear">Limpar filtros</button>`:''}
    <span class="muted" style="font-size:13px;margin-left:auto">Arraste os cartões entre colunas</span></div>
   <div class="kanban">${COLS.map(c=>{const items=list.filter(t=>t.status===c);return `<section class="kcol" data-col="${c}"><div class="kcol-h"><b>${c}</b><span class="ct">${items.length}</span></div>${items.map(cardHtml).join('')}<button class="kadd" data-act="task-new" data-col="${c}">+ Tarefa</button></section>`;}).join('')}</div>`;
}
function crossTasks(INS){
  const open=cur.acoes.filter(t=>t.status!=='Concluída');
  const late=open.filter(isLate);
  const semTarefa=INS.filter(i=>i.sev!=='media'&&!cur.acoes.some(t=>t.origem===i.id||i.rec.includes(t.txt)));
  const fracas=AREAS.filter(a=>SC[a.id].score!=null&&SC[a.id].level<=2&&!open.some(t=>t.area===a.id));
  const semDono=AREAS.filter(a=>!cur.dono_area[a.id]&&SC[a.id].ans<a.q.length);
  return {open,late,semTarefa,fracas,semDono};
}
function renderTarefas(INS){
  const x=crossTasks(INS);
  $('#main').innerHTML=`<section class="panel">
   <header class="ph" style="grid-template-columns:minmax(0,1fr) auto"><div><span class="eyebrow">// <b>Tarefas</b></span><h2 style="margin-top:8px">Kanban do diagnóstico</h2><p class="lead">Tarefas de coleta e de ação, cruzadas com as áreas e as incongruências. Tarefas de coleta se concluem sozinhas quando a área fica completa.</p></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" data-act="gen-coleta">Gerar tarefas de coleta</button><button class="btn primary" data-act="gen-ins">Gerar tarefas das incongruências</button></div></header>
   <div class="stats">
    <div class="stat"><b>${x.open.length}</b><span>tarefas abertas</span></div>
    <div class="stat ${x.late.length?'bad':''}"><b>${x.late.length}</b><span>atrasadas</span></div>
    <div class="stat ${x.semTarefa.length?'bad':''}"><b>${x.semTarefa.length}</b><span>incongruências graves sem tarefa</span></div>
    <div class="stat ${x.fracas.length?'warn':''}"><b>${x.fracas.length}</b><span>áreas N1–N2 sem tarefa aberta</span></div>
   </div>
   ${kanbanHtml()}
   ${x.semTarefa.length||x.fracas.length||x.semDono.length?`<section class="block"><div class="block-h"><h3>Cruzamento de tarefas</h3><p>O que o diagnóstico aponta e ainda não tem tarefa.</p></div><div class="xlist">
    ${x.semTarefa.map(i=>`<div class="xitem ${i.sev}"><span class="t">${esc(i.t)}<small>${i.id} · ${SEV[i.sev]} · ${i.areas.map(nameOf).join(', ')}</small></span><button class="chip" data-act="plan-ins" data-id="${i.id}" data-t="${esc(i.t)}">Criar tarefas</button></div>`).join('')}
    ${x.fracas.map(a=>`<div class="xitem alta"><span class="t">${esc(a.nome)} está no nível ${SC[a.id].level} sem nenhuma tarefa aberta<small>${weakest(a.id)?'Ponto mais fraco: '+esc(weakest(a.id)):''}</small></span><button class="chip" data-act="task-new" data-area="${a.id}" data-txt="${esc(weakest(a.id)?'Evoluir '+weakest(a.id).toLowerCase()+' em '+a.nome:'Plano de evolução: '+a.nome)}">Criar tarefa</button></div>`).join('')}
    ${x.semDono.length?`<div class="xitem media"><span class="t">${x.semDono.length} áreas sem responsável pela coleta<small>${x.semDono.map(a=>a.nome).join(', ')}</small></span><button class="chip" data-act="view" data-v="equipe">Distribuir na equipe</button></div>`:''}
   </div></section>`:''}
  </section>`;
  bindDnD();
}
function renderExecucao(INS){
  const st=STG.execucao; const sg=suggestions(INS);
  $('#main').innerHTML=`<section class="panel">${stageHead(st)}
   <section class="block"><div class="block-h"><h3>Plano de ação</h3><p>${cur.acoes.length} tarefas · ${cur.acoes.filter(a=>a.status==='Concluída').length} concluídas</p></div>${kanbanHtml()}</section>
   <section class="block"><div class="block-h"><h3>Sugestões do diagnóstico</h3><p>Vindas das incongruências e das perguntas de alto impacto com nota baixa.</p></div>
   ${sg.length?`<div class="sugs">${sg.map(s=>`<div class="sug"><span class="t">${esc(s.txt)}<small>${esc(s.src)} · ${esc(nameOf(s.area)||'Geral')}</small></span>${s.in?'<span class="chip">No kanban</span>':`<button class="chip" data-act="acao-add" data-txt="${esc(s.txt)}" data-area="${esc(s.area)}" data-src="${esc(s.src)}">+ Adicionar</button>`}</div>`).join('')}</div>`:'<p class="empty">Responda o diagnóstico para receber sugestões.</p>'}</section>
   ${stageQs(st)}${nextBtn(st)}</section>`;
  bindDnD();
}
function bindDnD(){
  document.querySelectorAll('.kcard[draggable]').forEach(c=>{
    c.addEventListener('dragstart',e=>{e.dataTransfer.setData('text/plain',c.dataset.task);e.dataTransfer.effectAllowed='move';c.classList.add('dragging');});
    c.addEventListener('dragend',()=>c.classList.remove('dragging'));
  });
  document.querySelectorAll('.kcol').forEach(col=>{
    col.addEventListener('dragover',e=>{e.preventDefault();col.classList.add('drop');});
    col.addEventListener('dragleave',()=>col.classList.remove('drop'));
    col.addEventListener('drop',e=>{e.preventDefault();col.classList.remove('drop');const id=e.dataTransfer.getData('text/plain');const t=cur.acoes.find(x=>x.id===id);if(t&&t.status!==col.dataset.col){t.status=col.dataset.col;mark('acoes');touch(true);}});
  });
}
/* ---------- Equipe ---------- */
const PAPEIS={admin:'Administrador',equipe:'Equipe LORSO',cliente:'Cliente'};
function conviteTexto(c){ return `Olá${c.nome?', '+c.nome.split(' ')[0]:''}! Você foi convidado para a Central de Diagnóstico da LORSO Digital.\n\n1. Acesse ${location.origin}${location.pathname}\n2. Clique em "Primeiro acesso"\n3. Use o e-mail ${c.email} e crie sua senha.`; }
function renderEquipe(){
  const isAdm=me&&me.papel==='admin';
  const mem=cur?cur.equipe:equipeList();
  $('#main').innerHTML=`<section class="panel">
   <header class="ph" style="grid-template-columns:minmax(0,1fr)"><div><span class="eyebrow">// <b>Equipe</b></span><h2 style="margin-top:8px">Quem coleta com você</h2><p class="lead">Cada pessoa entra com o próprio e-mail e senha. Só quem foi convidado consegue criar acesso. Distribua as áreas de coleta e as tarefas entre a equipe.</p></div></header>
   ${isAdm?`<section class="block"><div class="block-h"><h3>Convidar pessoa</h3><p>Depois de convidar, envie o texto do convite para a pessoa.</p></div>
    <form id="f-convite" class="invite">
     <label>Nome<input name="nome" required placeholder="Nome completo"></label>
     <label>E-mail<input name="email" type="email" required placeholder="pessoa@empresa.com"></label>
     <label>Função<input name="funcao" placeholder="Ex.: analista de marketing"></label>
     <label>Acesso<select name="papel"><option value="equipe">Equipe LORSO (vê todos os diagnósticos)</option><option value="admin">Administrador (também convida pessoas)</option><option value="cliente">Cliente (só diagnósticos liberados)</option></select></label>
     <button class="btn primary" type="submit">Convidar</button>
    </form></section>`:''}
   ${convites.length?`<section class="block"><div class="block-h"><h3>Convites pendentes</h3><p>${convites.length} pessoa(s) ainda não criaram a senha</p></div><div class="xlist">${convites.map(c=>`<div class="xitem media"><span class="t">${esc(c.nome||c.email)}<small>${esc(c.email)} · ${PAPEIS[c.papel]||c.papel}${c.funcao?' · '+esc(c.funcao):''}</small></span><span style="display:flex;gap:6px;flex-wrap:wrap"><button class="chip" data-act="conv-copy" data-email="${esc(c.email)}">Copiar convite</button>${isAdm?`<button class="chip" data-act="conv-del" data-email="${esc(c.email)}">Cancelar</button>`:''}</span></div>`).join('')}</div></section>`:''}
   ${mem.length?`<div class="team">${mem.map(m=>{
     const self=me&&m.id===me.id, can=self||isAdm;
     const mine=cur?AREAS.filter(a=>cur.dono_area[a.id]===m.id):[];
     const tot=mine.reduce((s,a)=>s+a.q.length,0), ans=mine.reduce((s,a)=>s+SC[a.id].ans,0);
     const tasks=cur?cur.acoes.filter(t=>t.dono===m.id&&t.status!=='Concluída'):[];
     return `<article class="member"><div class="mh"><span class="av">${esc(initials(m.nome))}</span><input data-mem="${m.id}" data-f="nome" value="${esc(m.nome)}" placeholder="Nome" aria-label="Nome" ${can?'':'readonly'}>${isAdm&&!self?`<button class="xbtn" data-act="mem-off" data-id="${m.id}" title="Desativar acesso" aria-label="Desativar acesso">×</button>`:''}</div>
      <div class="mf"><input data-mem="${m.id}" data-f="papel" value="${esc(m.papel)}" placeholder="Função" aria-label="Função" ${can?'':'readonly'}><input data-mem="${m.id}" data-f="contato" value="${esc(m.contato)}" placeholder="Telefone" aria-label="Contato" ${can?'':'readonly'}></div>
      <div class="mstats"><span>${esc(m.email)}</span><span>${PAPEIS[m.role]||''}</span></div>
      ${cur?`<div class="mstats"><span><b>${mine.length}</b> áreas</span><span><b>${tot?Math.round(ans/tot*100):0}%</b> coletado</span><span><b>${tasks.length}</b> tarefas abertas</span>${tasks.filter(isLate).length?`<span style="color:var(--n1)"><b style="color:inherit">${tasks.filter(isLate).length}</b> atrasadas</span>`:''}</div>
      <div><span class="lbl">Áreas sob responsabilidade neste diagnóstico</span><div class="areachips" style="margin-top:6px">${AREAS.map(a=>{const owner=cur.dono_area[a.id];return `<button class="achip ${owner===m.id?'on':owner?'taken':''}" data-act="mem-area" data-id="${m.id}" data-v="${a.id}" title="${owner&&owner!==m.id?'Hoje com '+esc((member(owner)||{}).nome||''):''}">${esc(a.nome)}</button>`;}).join('')}</div></div>
      ${tasks.length?`<button class="chip" data-act="tasks-mem" data-id="${m.id}" style="align-self:flex-start">Ver tarefas de ${esc((m.nome||'').split(' ')[0]||'')}</button>`:''}`:''}
     </article>`;}).join('')}</div>`:'<p class="empty">Ninguém com acesso ainda.</p>'}
  </section>`;
}
function renderOtimizacao(INS){
  const st=STG.otimizacao;
  const rows=cur.testes.map((t,i)=>({t,i,ice:((+t.i||0)+(+t.c||0)+(+t.f||0))/3})).sort((a,b)=>b.ice-a.ice);
  $('#main').innerHTML=`<section class="panel">${stageHead(st)}${stageQs(st)}
   <section class="block"><div class="block-h"><h3>Backlog de experimentos</h3><p>ICE: impacto, confiança e facilidade de 1 a 10. Ordenado pela média.</p></div>
   ${rows.length?`<div class="tblw"><table class="tbl"><thead><tr><th style="min-width:260px">Hipótese</th><th>Área</th><th>Impacto</th><th>Confiança</th><th>Facilidade</th><th class="r">ICE</th><th></th></tr></thead><tbody>${rows.map(({t,i,ice})=>`<tr>
    <td><input data-teste="${i}" data-f="hip" value="${esc(t.hip)}" placeholder="Se fizermos X, Y aumenta porque Z" aria-label="Hipótese"></td>
    <td><input data-teste="${i}" data-f="area" value="${esc(t.area)}" placeholder="UN ou canal" aria-label="Área"></td>
    ${['i','c','f'].map(k=>`<td style="width:96px"><input type="number" min="1" max="10" data-teste="${i}" data-f="${k}" value="${esc(t[k])}" aria-label="${k}"></td>`).join('')}
    <td class="r mono">${dec(ice)}</td><td class="x"><button class="xbtn" data-act="teste-del" data-i="${i}" aria-label="Remover">×</button></td></tr>`).join('')}</tbody></table></div>`:'<p class="empty">Nenhum experimento ainda.</p>'}
   <div><button class="btn sm" data-act="teste-new">+ Novo experimento</button></div></section>
   ${fofaHtml('otimizacao',autoFofa('otimizacao',INS),'FOFA da otimização')}${nextBtn(st)}</section>`;
}
function dreHtml(){
  const L2=[['Receita','receita_orcada','receita_realizada',1],['Custos e despesas','custo_orcado','custo_realizado',-1],['Resultado (EBITDA)','ebitda_orcado','ebitda_realizado',1],['Verba de marketing','verba_orcada','verba_realizada',0]];
  const rows=L2.map(([n,o,r,dir])=>({n,o:V('financeiro',o),r:V('financeiro',r),dir})).filter(x=>x.o!=null||x.r!=null);
  const folha=V('financeiro','folha_mkt'), terc=V('financeiro','terceiros'), hc=V('financeiro','headcount');
  if(!rows.length&&folha==null&&terc==null) return '';
  return `<section class="block"><div class="block-h"><h3>DRE orçado x realizado</h3><button class="chip" data-act="area" data-v="financeiro">Editar em Orçamento e DRE</button></div>
   ${rows.length?`<div class="tblw"><table class="tbl"><thead><tr><th>Linha</th><th class="r">Orçado</th><th class="r">Realizado ou projetado</th><th class="r">Desvio</th></tr></thead><tbody>${rows.map(x=>{const dv=x.o&&x.r!=null?(x.r-x.o)/Math.abs(x.o):null; const bad=dv!=null&&(x.dir===1?dv<-0.05:x.dir===-1?dv>0.05:false);return `<tr><td>${x.n}</td><td class="r">${brl(x.o)}</td><td class="r">${brl(x.r)}</td><td class="r" style="${bad?'color:var(--n1);font-weight:600':''}">${dv==null?'—':(dv>0?'+':'')+pct(dv)}</td></tr>`;}).join('')}</tbody></table></div>`:''}
   ${folha!=null||terc!=null?`<div class="stats"><div class="stat"><b>${brl(folha)}</b><span>folha mensal do marketing</span></div><div class="stat"><b>${brl(terc)}</b><span>agências e fornecedores por mês</span></div><div class="stat"><b>${hc!=null?hc:'—'}</b><span>pessoas no time</span></div><div class="stat"><b>${folha!=null&&terc!=null?brl((folha+terc)*12):'—'}</b><span>custo anual da operação (equipe + terceiros)</span></div></div>`:''}
  </section>`;
}
/* ---------- Blocos de causa raiz e plano por horizonte ---------- */
const BLOCOS=[
 {id:'prioridade',t:'Sem regra de prioridade, tudo vira urgência',r:'O marketing atende quem pressiona mais. Pedidos chegam por vários canais, sem prazo nem critério, e o calendário acadêmico chega tarde.',
  rules:['CRZ-23','CRZ-26','CRZ-29','CRZ-42','CRZ-48','CRZ-50','CRZ-51','CRZ-11'],kpi:'% de pedidos urgentes · prazo médio de entrega',
  h:{c:['Formulário único de pedidos com prazo mínimo por tipo de peça','Critério escrito de urgência e de quem pode declarar','Comunicado da reitoria com as novas regras'],m:['Cota de capacidade por UN e reunião quinzenal de fila','Calendário de lançamentos com 6 meses de antecedência'],l:['Planejamento trimestral conjunto com as UNs','SLA por tipo de demanda medido e publicado']}},
 {id:'capacidade',t:'A capacidade do marketing não acompanha a demanda',r:'A fila cresce mais rápido do que sai, as aprovações travam o fluxo e o time trabalha sem limite de tarefas.',
  rules:['CRZ-24','CRZ-25','CRZ-27','CRZ-34','CRZ-38','CRZ-39','CRZ-45','CRZ-52','CRZ-15','CRZ-16','CRZ-22','CRZ-03','CRZ-12'],kpi:'projetos abertos · semanas para zerar a fila · entregas no prazo',
  h:{c:['Triagem do backlog: cancelar, adiar ou fazer','Aprovador único e no máximo 2 rodadas','Limite de tarefas em andamento por pessoa'],m:['Templates e autosserviço para pedidos recorrentes','Kanban único com vazão semanal medida','Redesenho de papéis do time'],l:['Capacidade planejada por período, com reserva por UN','Squads por UN ou objetivo']}},
 {id:'sistemas',t:'Sistemas e dados que não conversam',r:'O trabalho passa por WhatsApp, planilhas e ferramentas soltas. Ninguém vê a fila inteira e os dados de resultado não fecham.',
  rules:['CRZ-28','CRZ-35','CRZ-36','CRZ-05','CRZ-06','CRZ-10','CRZ-13','CRZ-33'],kpi:'horas de trabalho manual por semana · sistemas integrados',
  h:{c:['Uma ferramenta de gestão de tarefas para todo o time','Inventário de sistemas: manter, treinar ou trocar'],m:['Pedidos integrados à ferramenta de tarefas','Rastreamento e atribuição até a matrícula','Painel único de indicadores por UN'],l:['Base unificada de marketing, CRM e acadêmico','Réguas automatizadas por UN']}},
 {id:'receita',t:'Receita, vagas e investimento desalinhados',r:'Há UNs abaixo da meta, vagas ociosas e verba distribuída sem relação com o retorno, enquanto a reitoria espera crescer.',
  rules:['CRZ-40','CRZ-41','CRZ-18','CRZ-19','CRZ-20','CRZ-47','CRZ-49','CRZ-44','CRZ-46','CRZ-21','CRZ-07','CRZ-09','CRZ-30'],kpi:'ocupação de vagas · receita x meta · CAC por UN',
  h:{c:['Mapa de ocupação de vagas por curso','Meta e verba por UN revisadas com o financeiro'],m:['Plano de ocupação dos cursos com vagas ociosas','Modelo de CAC e retorno por UN','Régua de ex-alunos da graduação para a pós'],l:['Orçamento base zero por meta e retorno','Portfólio de cursos orientado por demanda']}},
 {id:'mandato',t:'Mandato e régua de sucesso indefinidos',r:'Sem patrocínio formal e sem indicadores combinados, as mudanças dependem de aval caso a caso e o trabalho é julgado por percepção.',
  rules:['CRZ-37','CRZ-43'],kpi:'indicadores pactuados acompanhados em comitê',
  h:{c:['Mandato por escrito: escopo, prazo e o que muda','3 a 5 indicadores de sucesso pactuados com a reitoria'],m:['Comitê mensal de resultados com a reitoria'],l:['Novo diagnóstico de maturidade a cada 12 meses']}},
 {id:'funil',t:'Funil comercial e relacionamento com o aluno',r:'Leads, visitas e eventos viram menos matrícula do que poderiam por falta de qualificação, velocidade e acompanhamento.',
  rules:['CRZ-01','CRZ-02','CRZ-04','CRZ-08','CRZ-14','CRZ-17','CRZ-31','CRZ-32'],kpi:'tempo até o primeiro contato · conversão inscrito → matrícula',
  h:{c:['Primeiro contato automático em até 2 minutos','Definição de lead qualificado entre marketing e comercial'],m:['Réguas por curso e etapa','Pós-evento com leads quentes ao comercial em 24h'],l:['Lead scoring baseado em matrículas reais','Programa de indicação e retenção']}}
];
const HZ=[['c','Curto prazo','0 a 3 meses'],['m','Médio prazo','3 a 6 meses'],['l','Longo prazo','6 a 12 meses']];
function blocosDe(INS){
  return BLOCOS.map(b=>{ const ins=INS.filter(i=>b.rules.includes(i.id)); const peso=ins.reduce((a,i)=>a+({crit:5,alta:2,media:1}[i.sev]||1),0); const areas=[...new Set(ins.flatMap(i=>i.areas))];
    return {...b,ins,peso,areas,crit:ins.filter(i=>i.sev==='crit').length}; }).filter(b=>b.ins.length).sort((a,b)=>b.peso-a.peso);
}
function leituraAuto(INS){
  const ov=overall(), B=blocosDe(INS), t=trelloStats();
  const fracos=AREAS.filter(a=>SC[a.id].score!=null).sort((a,b)=>SC[a.id].score-SC[b.id].score).slice(0,3).map(a=>a.nome);
  const fortes=AREAS.filter(a=>SC[a.id].score!=null&&SC[a.id].level>=3).sort((a,b)=>SC[b.id].score-SC[a.id].score).slice(0,2).map(a=>a.nome);
  const L=[];
  if(ov.score!=null) L.push(`A maturidade geral de marketing está em ${dec(ov.score)} de 4 (N${ov.level} · ${LVL[ov.level]}).`);
  if(B.length) L.push(`Principal causa raiz: ${B[0].t.charAt(0).toLowerCase()+B[0].t.slice(1)}.${B[1]?` Em seguida: ${B[1].t.charAt(0).toLowerCase()+B[1].t.slice(1)}.`:''}`);
  if(fortes.length&&fracos.length) L.push(`Os pontos mais fortes são ${fortes.join(' e ')}; os mais frágeis, ${fracos.join(', ')}.`);
  if(t) L.push(`Hoje há ${t.abertos} projetos abertos no Trello${t.semanas!=null?`, o que leva cerca de ${dec(t.semanas,0)} semanas para zerar no ritmo atual`:''}.`);
  return L;
}
function blocosHtml(INS){
  const B=blocosDe(INS).slice(0,5);
  if(!B.length) return '<p class="empty">Os blocos aparecem quando o motor encontra incongruências.</p>';
  return `<div class="blocos">${B.map((b,k)=>`<article class="bloco"><div class="bh"><span class="bn">${k+1}</span><div><h4>${esc(b.t)}</h4><p>${esc(b.r)}</p></div></div>
    <div class="bm"><span class="chip">${pl(b.ins.length,'incongruência','incongruências')}</span>${b.crit?`<span class="chip" style="color:var(--n1);border-color:color-mix(in srgb,var(--n1) 45%,transparent)">${pl(b.crit,'crítica','críticas')}</span>`:''}<span class="muted" style="font-size:12.5px">Indicador: ${esc(b.kpi)}</span></div>
    <div class="bareas">${b.areas.slice(0,8).map(a=>`<button class="chip" data-act="goto" data-v="${a}">${esc(nameOf(a))}</button>`).join('')}</div>
    <details><summary>Ver as evidências</summary><ul>${b.ins.map(i=>`<li><b>${esc(i.t)}.</b> ${esc(i.txt)}</li>`).join('')}</ul></details></article>`).join('')}</div>`;
}
function planoHtml(INS){
  const B=blocosDe(INS).slice(0,5);
  if(!B.length) return '';
  return `<div class="plano">${HZ.map(([k,nm,pr])=>`<div class="hz"><div class="hzh"><b>${nm}</b><span>${pr}</span></div><ul>${B.flatMap((b,i)=>(b.h[k]||[]).map(a=>`<li><span class="bnum">${i+1}</span>${esc(a)}</li>`)).join('')}</ul></div>`).join('')}</div>
   <p class="muted" style="font-size:12.5px">O número indica o bloco de causa raiz. As ações específicas de cada incongruência estão nas evidências e viram tarefas no kanban.</p>`;
}
function unScoreHtml(){
  const rows=UNS.map(u=>{ const caps=capRows().filter(r=>r.un===u.id); const sum=k=>{const v=caps.map(r=>r[k]).filter(x=>x!=null);return v.length?v.reduce((a,b)=>a+b,0):null;}; const vg=sum('vagas'),cp=sum('captados'),mt=sum('meta'); const f=unFin(u.id);
    return {u,exp:unxGet(u.id,'expect'),s:SC[u.id],ocup:vg&&cp!=null?cp/vg:null,ating:mt&&cp!=null?cp/mt:null,rec:f.meta_rec&&f.receita!=null?f.receita/f.meta_rec:null,svc:unSvc(u)}; });
  const cell=(x,w)=>x==null?'<td class="r muted">—</td>':`<td class="r" style="${x<w?'color:var(--n1);font-weight:600':''}">${pct(x)}</td>`;
  return `<div class="tblw"><table class="tbl"><thead><tr><th>UN</th><th>A reitoria espera</th><th style="min-width:180px">Maturidade</th><th class="r">Ocupação de vagas</th><th class="r">Captação x meta</th><th class="r">Receita x meta</th><th class="r">Atendimento do marketing</th></tr></thead><tbody>
   ${rows.map(r=>`<tr><td>${esc(r.u.nome)}</td><td>${r.exp?`<span class="chip">${esc(r.exp)}</span>`:'<span class="muted">—</span>'}</td>
    <td><div class="minibar"><span style="width:${r.s.score!=null?((r.s.score-1)/3*100).toFixed(0):0}%;background:var(--n${r.s.level||1})"></span></div><span class="mono" style="font-size:12px">${r.s.score!=null?dec(r.s.score)+' · N'+r.s.level:'sem nota'}</span></td>
    ${cell(r.ocup,0.7)}${cell(r.ating,0.8)}${cell(r.rec,0.9)}<td class="r">${r.svc?`<span class="lv l${r.svc}" title="${LVL[r.svc]}">N${r.svc}</span>`:'—'}</td></tr>`).join('')}</tbody></table></div>`;
}
function renderResultados(INS){
  const st=STG.resultados, ov=overall();
  const rows=AREAS.map(a=>({a,s:SC[a.id]}));
  const avaliadas=rows.filter(r=>r.s.score!=null).length;
  const fin=finRows(); const anyFin=fin.some(r=>r.receita!=null||r.orcamento!=null||r.meta_rec!=null||r.folha!=null);
  const tot=k=>{const v=fin.map(r=>r[k]).filter(x=>x!=null);return v.length?v.reduce((a,b)=>a+b,0):null;};
  // FOFA consolidada: itens de maior impacto de todas as áreas
  const cons={f:[],w:[],o:[],a:[]};
  AREAS.concat(STAGES.filter(s=>s.q)).forEach(a=>{const f=autoFofa(a.id,[]); FQ.forEach(([k])=>f[k].forEach(it=>cons[k].push({...it,src:a.nome})));});
  INS.forEach(i=>cons.a.push({t:i.t,i:SEVW[i.sev]+1,src:i.id}));
  FQ.forEach(([k])=>{cons[k].sort((x,y)=>y.i-x.i); cons[k]=cons[k].slice(0,8);});
  const chart=`<div class="chart" role="img" aria-label="Maturidade por área de 1 a 4">${rows.map(({a,s})=>`<div class="crow"><button class="nm" data-act="goto" data-v="${a.id}" title="${esc(a.nome)}">${esc(a.nome)}</button>
     <div class="track ${s.score==null?'na':''}">${s.score!=null?`<span style="width:${((s.score-1)/3*100).toFixed(1)}%;min-width:4px;background:var(--n${s.level})"></span>`:''}</div>
     <span class="mono num" style="font-size:12px">${s.score!=null?dec(s.score)+' · N'+s.level:'sem nota'}</span></div>`).join('')}
     <div class="axis"><span></span><div class="ticks"><span>1</span><span>2</span><span>3</span><span>4</span></div><span></span></div></div>`;
  const heat=`<div class="tblw"><table class="tbl heat"><thead><tr><th>Área</th>${Object.values(PIL).map(p=>`<th style="text-align:center">${p}</th>`).join('')}<th style="text-align:center">Geral</th></tr></thead><tbody>${rows.map(({a,s})=>`<tr><td>${esc(a.nome)}</td>${Object.keys(PIL).map(k=>{const v=s.pil[k];return `<td class="h l${lvOf(v)}">${v==null?'—':dec(v)}</td>`;}).join('')}<td class="h l${s.level}">${s.score==null?'—':dec(s.score)}</td></tr>`).join('')}</tbody></table></div>`;
  const finTbl=`<div class="tblw"><table class="tbl"><thead><tr><th>UN</th><th class="r">Nível</th><th class="r">Meta receita</th><th class="r">Receita</th><th class="r">Atingido</th><th class="r">Folha</th><th class="r">Folha / receita</th><th class="r">Orçamento mkt</th><th class="r">% do orçamento</th><th class="r">Orçamento / receita</th><th class="r">Orçamento por matrícula-meta</th><th>Expectativa da reitoria</th></tr></thead><tbody>
    ${fin.map(r=>`<tr><td><button class="chip" data-act="goto" data-v="${r.id}">${esc(r.nome)}</button></td><td class="r">${r.level?`<span class="lv l${r.level}">N${r.level}</span>`:'—'}</td><td class="r">${brl(r.meta_rec)}</td><td class="r">${brl(r.receita)}</td><td class="r" style="${r.ating!=null&&r.ating<0.85?'color:var(--n1);font-weight:600':''}">${pct(r.ating)}</td><td class="r">${brl(r.folha)}</td><td class="r">${pct(r.folhaRec)}</td><td class="r">${brl(r.orcamento)}</td><td class="r">${pct(r.share)}</td><td class="r">${pct(r.orcRec)}</td><td class="r">${brl(r.cpm)}</td><td style="min-width:220px;font-size:13px">${esc(unExpResumo(r.id)||'—')}</td></tr>`).join('')}
    <tr><td><b>Total</b></td><td></td><td class="r"><b>${brl(tot('meta_rec'))}</b></td><td class="r"><b>${brl(tot('receita'))}</b></td><td class="r"><b>${pct(tot('meta_rec')&&tot('receita')!=null?tot('receita')/tot('meta_rec'):null)}</b></td><td class="r"><b>${brl(tot('folha'))}</b></td><td></td><td class="r"><b>${brl(tot('orcamento'))}</b></td><td></td><td></td><td></td><td></td></tr></tbody></table></div>`;
  const kpiTbl=`${cur.kpis.length?`<div class="tblw"><table class="tbl"><thead><tr><th style="min-width:200px">Indicador</th><th>UN ou área</th><th class="r">Meta</th><th class="r">Realizado</th><th class="r">Atingido</th><th></th></tr></thead><tbody>${cur.kpis.map((k,i)=>{const m=num(k.meta),r=num(k.real);return `<tr><td><input data-kpi="${i}" data-f="nome" value="${esc(k.nome)}" aria-label="Indicador"></td><td><input data-kpi="${i}" data-f="un" value="${esc(k.un)}" aria-label="UN"></td><td><input data-kpi="${i}" data-f="meta" value="${esc(k.meta)}" inputmode="decimal" aria-label="Meta" style="text-align:right"></td><td><input data-kpi="${i}" data-f="real" value="${esc(k.real)}" inputmode="decimal" aria-label="Realizado" style="text-align:right"></td><td class="r mono">${m&&r!=null?pct(r/m):'—'}</td><td class="x"><button class="xbtn" data-act="kpi-del" data-i="${i}" aria-label="Remover">×</button></td></tr>`;}).join('')}</tbody></table></div>`:'<p class="empty">Nenhum indicador ainda.</p>'}
    <div style="display:flex;flex-wrap:wrap;gap:6px">${['Matrículas','CAC','CPL','Conversão lead → matrícula','NPS','Taxa de rematrícula','ROAS'].map(n=>`<button class="chip" data-act="kpi-add" data-n="${n}">+ ${n}</button>`).join('')}<button class="chip" data-act="kpi-add" data-n="">+ Outro</button></div>`;
  const leit=leituraAuto(INS), t=trelloStats(), nB=blocosDe(INS).length;
  $('#main').innerHTML=`<section class="panel">
   <header class="ph" style="grid-template-columns:minmax(0,1fr) auto"><div><span class="eyebrow">// 05 · <b>Fase 5</b></span><h2 style="margin-top:8px">Resultados</h2><p class="lead">Do resumo para a reitoria aos detalhes: diagnóstico, causas raiz, plano no tempo e as evidências.</p></div>
   <div class="res-actions">${OUT_BTNS()}<button class="btn" data-act="copy">Copiar resumo</button></div></header>
   ${ui.copy!=null?`<section class="block"><div class="block-h"><h3>Resumo para colar</h3><button class="btn sm" data-act="copy-close">Fechar</button></div><textarea class="copyout" id="copyout" readonly>${esc(ui.copy)}</textarea></section>`:''}
   <section class="hero"><div><span class="eyebrow">Maturidade geral</span><div class="big" style="margin-top:6px">${ov.score!=null?dec(ov.score):'—'}<small> / 4</small></div><div style="margin-top:8px">${lvChip(ov.level)}</div></div>
    <div class="exec"><span class="eyebrow">Resumo executivo</span>${leit.length?`<ul class="leit">${leit.map(l=>`<li>${esc(l)}</li>`).join('')}</ul>`:'<p class="muted">O resumo aparece quando houver respostas suficientes.</p>'}
     <div class="kpis"><div class="kpi"><b>${avaliadas}/${AREAS.length}</b><span>áreas com nota</span></div><div class="kpi"><b>${cur.entrevistas.length}</b><span>pessoas entrevistadas</span></div><div class="kpi"><b>${nB}</b><span>causas raiz</span></div><div class="kpi"><b style="color:var(--n1)">${INS.filter(i=>i.sev==='crit').length}</b><span>incongruências críticas</span></div></div></div></section>
   ${fieldHtml('res.leitura','Leitura do consultor (entra na apresentação e no relatório)','t')}
   <section class="block"><div class="block-h"><h3>Causas raiz</h3><p>${INS.length} incongruências agrupadas em ${pl(nB,'bloco','blocos')}, do mais pesado para o mais leve.</p></div>${blocosHtml(INS)}</section>
   ${nB?`<section class="block"><div class="block-h"><h3>Plano no tempo</h3><p>Diretrizes por horizonte para as causas raiz acima.</p></div>${planoHtml(INS)}</section>`:''}
   ${priorizacaoHtml(INS)}
   <section class="block"><div class="block-h"><h3>Expectativa da reitoria x realidade das UNs</h3><p>O que a reitoria quer de cada UN frente à maturidade, às vagas e aos números.</p></div>${unScoreHtml()}</section>
   ${t||cur.dores.length?`<div class="two">${t?`<section class="block"><div class="block-h"><h3>Capacidade do marketing</h3><button class="chip" data-act="goto" data-v="demandas">Retrato do Trello</button></div>${trelloView(t)}</section>`:''}${cur.dores.length?`<section class="block"><div class="block-h"><h3>Onde o trabalho trava</h3><button class="chip" data-act="view" data-v="dores">Mapa de dores</button></div>${gargaloChart(false)}</section>`:''}</div>`:''}
   <div class="two">
    <section class="block"><div class="block-h"><h3>Maturidade por área</h3><div class="legend">${[1,2,3,4].map(l=>`<span class="lv l${l}" title="${LVL[l]}">N${l} ${LVL[l]}</span>`).join('')}</div></div>${chart}</section>
    <section class="block"><div class="block-h"><h3>Mapa por pilar</h3><p>Nota de 1 a 4</p></div>${heat}</section>
   </div>
   ${dreHtml()}
   <section class="block"><div class="block-h"><h3>Cruzamento financeiro das UNs</h3><p>${anyFin?'Preenchido na Reitoria (Orçamento e DRE) e em cada UN.':'Preencha meta, receita, folha e orçamento em cada UN.'}</p></div>${finTbl}</section>
   ${fofaHtml('geral',cons,'FOFA consolidada','Os 8 itens de maior impacto de cada quadrante, de todas as áreas. Inclua a leitura estratégica abaixo.')}
   <section class="block"><div class="block-h"><h3>Indicadores: meta x realizado</h3><p>Digite os números do período.</p></div>${kpiTbl}</section>
   <section class="block"><details class="allins"><summary><h3 style="display:inline">Todas as incongruências (${INS.length})</h3></summary>${INS.length?`<div class="ins" style="margin-top:12px">${INS.map(i=>insightHtml(i,true)).join('')}</div>`:'<p class="empty">Nenhuma incongruência ainda.</p>'}</details></section>
   ${stageQs(st)}
   <div class="pager"><button class="btn" data-act="stage" data-v="otimizacao">← Otimização</button><span></span></div>
  </section>`;
}
const OUT_BTNS=()=>'';
function priorizacaoHtml(){ return ''; }
/* ---------- Dores e gargalos ---------- */
function quemList(){ return [...new Set([...cur.entrevistas.map(e=>e.nome),...cur.dores.map(d=>d.quem)].filter(Boolean))]; }
function dorFormHtml(preset){
  const D=ui.dorDef; const sel=(name,opts,v,label)=>`<select name="${name}" aria-label="${label}">${opts.map(o=>Array.isArray(o)?`<option value="${esc(o[0])}" ${String(v)===String(o[0])?'selected':''}>${esc(o[1])}</option>`:`<option ${v===o?'selected':''}>${esc(o)}</option>`).join('')}</select>`;
  return `<form class="dorform" data-dorform="1" data-area="${esc(preset||'')}">
   <input name="txt" class="dtxt" placeholder="Descreva a dor como a pessoa contou" aria-label="Dor relatada" required>
   ${preset?'':sel('area',[['','Área ou UN'],...AREAS.map(a=>[a.id,a.nome])],D.area,'Área')}
   <label class="dl"><span>Onde trava</span>${sel('etapa',FLUXO,D.etapa,'Etapa do fluxo')}</label>
   <label class="dl"><span>Tipo</span>${sel('tipo',TIPOS,D.tipo,'Tipo')}</label>
   <label class="dl"><span>Gravidade</span>${sel('sev',[['1','Baixa'],['2','Média'],['3','Alta']],D.sev,'Gravidade')}</label>
   <label class="dl"><span>Frequência</span>${sel('freq',FREQS,D.freq,'Frequência')}</label>
   <label class="dl"><span>Quem relatou</span><input name="quem" list="dl-quem" value="${esc(D.quem)}" placeholder="Nome"></label>
   <label class="dl"><span>Sistema envolvido</span>${sel('sistema',[['','Nenhum'],...cur.sistemas.filter(x=>x.nome).map(x=>[x.nome,x.nome])],D.sistema,'Sistema')}</label>
   <button class="btn primary" type="submit">Registrar dor</button>
  </form><datalist id="dl-quem">${quemList().map(n=>`<option value="${esc(n)}">`).join('')}</datalist>`;
}
function dorRow(d,compact){
  return `<tr><td style="min-width:240px">${esc(d.txt)}</td>${compact?'':`<td>${esc(nameOf(d.area)||'—')}</td>`}<td>${esc(d.etapa)}</td><td>${esc(d.tipo)}</td>
   <td><span class="lv l${{1:3,2:2,3:1}[+d.sev]||0}">${SEVN[d.sev]||'—'}</span></td><td>${esc(d.freq)}</td><td>${esc(d.quem||'—')}</td>${compact?'':`<td>${esc(d.sistema||'—')}</td>`}
   <td style="white-space:nowrap">${cur.acoes.some(t=>t.origem==='dor:'+d.id)?'<span class="chip">Tem tarefa</span>':`<button class="chip" data-act="dor-task" data-id="${d.id}">+ Tarefa</button>`}<button class="xbtn" data-act="dor-del" data-id="${d.id}" aria-label="Remover dor">×</button></td></tr>`;
}
function gargaloChart(click){
  const g=gargalos(); const max=Math.max(1,...g.map(r=>r.score)); const top=g.reduce((a,b)=>b.score>a.score?b:a,g[0]);
  return `<div class="chart" role="img" aria-label="Pontuação de dores por etapa do fluxo">${g.map(r=>`<div class="crow"><${click?'button':'span'} class="nm" ${click?`data-act="dor-filter" data-v="${r.etapa}"`:''}>${r.etapa}</${click?'button':'span'}>
   <div class="track">${r.score?`<span style="width:${(r.score/max*100).toFixed(1)}%;min-width:4px;background:${r===top&&r.score?'var(--n1)':'var(--n2)'};opacity:${r===top?1:.75}"></span>`:''}</div>
   <span class="mono num" style="font-size:12px">${pl(r.n,'dor','dores')}${r.graves?` · ${pl(r.graves,'grave','graves')}`:''}</span></div>`).join('')}</div>
   <p class="muted" style="font-size:12.5px">Pontuação = gravidade × frequência (diária 3, semanal 2, mensal 1,5, pontual 1). A barra vermelha é o principal gargalo.</p>`;
}
function renderDores(INS){
  const f=ui.dorF; const list=cur.dores.filter(d=>(!f.etapa||d.etapa===f.etapa)&&(!f.area||d.area===f.area)).sort((a,b)=>dorScore(b)-dorScore(a));
  const heat=`<div class="tblw"><table class="tbl heat"><thead><tr><th>Etapa</th>${TIPOS.map(t=>`<th style="text-align:center">${t}</th>`).join('')}</tr></thead><tbody>${FLUXO.map(e=>`<tr><td>${e}</td>${TIPOS.map(t=>{const n=cur.dores.filter(d=>d.etapa===e&&d.tipo===t).length;return `<td class="h ${n>=3?'l1':n===2?'l2':n===1?'l3':'l0'}">${n||'·'}</td>`;}).join('')}</tr>`).join('')}</tbody></table></div>`;
  const byArea=AREAS.map(a=>{const ds=cur.dores.filter(d=>d.area===a.id);return {a,n:ds.length,s:ds.reduce((x,d)=>x+dorScore(d),0)};}).filter(r=>r.n).sort((x,y)=>y.s-x.s);
  const maxA=Math.max(1,...byArea.map(r=>r.s));
  $('#main').innerHTML=`<section class="panel">
   <header class="ph" style="grid-template-columns:minmax(0,1fr)"><div><span class="eyebrow">// <b>Dores e gargalos</b></span><h2 style="margin-top:8px">Onde o trabalho trava</h2><p class="lead">Registre cada dor no momento da entrevista. O sistema soma gravidade e frequência por etapa do fluxo e mostra onde está o gargalo, quem sente e que sistema está envolvido.</p></div></header>
   <section class="block"><div class="block-h"><h3>Contexto do cliente</h3></div><div class="fields">${fieldHtml('ctx.problema','Problema central relatado pelo cliente','t')}${fieldHtml('ctx.hipotese','Sua hipótese inicial','t')}</div></section>
   <section class="block"><div class="block-h"><h3>Registrar dor</h3><p>As opções ficam lembradas para o próximo registro.</p></div>${dorFormHtml('')}</section>
   ${cur.dores.length?`<div class="two">
    <section class="block"><div class="block-h"><h3>Gargalos por etapa</h3>${f.etapa?`<button class="chip" data-act="dor-filter" data-v="">Limpar filtro: ${esc(f.etapa)}</button>`:'<p>Clique numa etapa para filtrar</p>'}</div>${gargaloChart(true)}</section>
    <section class="block"><div class="block-h"><h3>Etapa × tipo de dor</h3><p>Quantidade de dores</p></div>${heat}</section></div>
   <section class="block"><div class="block-h"><h3>Quem mais sente</h3><p>Áreas e UNs pela pontuação das dores</p></div><div class="chart">${byArea.map(r=>`<div class="crow"><button class="nm" data-act="dor-farea" data-v="${r.a.id}">${esc(r.a.nome)}</button><div class="track"><span style="width:${(r.s/maxA*100).toFixed(1)}%;min-width:4px;background:var(--n2)"></span></div><span class="mono num" style="font-size:12px">${pl(r.n,'dor','dores')}</span></div>`).join('')}</div></section>
   <section class="block"><div class="block-h"><h3>Dores relatadas</h3><p>${list.length} de ${cur.dores.length}${f.area?` · ${esc(nameOf(f.area))} <button class="chip" data-act="dor-farea" data-v="">limpar</button>`:''} · da mais pesada para a mais leve</p></div>
    <div class="tblw"><table class="tbl"><thead><tr><th>Dor</th><th>Área</th><th>Etapa</th><th>Tipo</th><th>Gravidade</th><th>Frequência</th><th>Relatado por</th><th>Sistema</th><th></th></tr></thead><tbody>${list.map(d=>dorRow(d,false)).join('')}</tbody></table></div></section>`
   :'<p class="empty">Nenhuma dor registrada ainda. Use o formulário acima durante as entrevistas; o mapa de gargalos aparece a partir do primeiro registro.</p>'}
  </section>`;
}
/* ---------- Sistemas ---------- */
const SYS_SUG=['WhatsApp','E-mail','Planilhas (Excel/Sheets)','Trello','Asana','Monday','ClickUp','Google Drive','Canva','Adobe Creative Cloud','RD Station','HubSpot','Salesforce','Sistema acadêmico','Meta Business','Google Ads','GA4','CMS do site'];
function renderSistemas(){
  const L1=cur.sistemas; const named=L1.filter(x=>x.nome);
  const sats=named.map(x=>num(x.satisf)).filter(x=>x!=null); const avg=sats.length?sats.reduce((a,b)=>a+b,0)/sats.length:null;
  const custo=named.reduce((a,x)=>a+(num(x.custo)||0),0);
  const opt=(v,list)=>list.map(o=>Array.isArray(o)?`<option value="${o[0]}" ${String(v)===String(o[0])?'selected':''}>${o[1]}</option>`:`<option ${v===o?'selected':''}>${o}</option>`).join('');
  $('#main').innerHTML=`<section class="panel">
   <header class="ph" style="grid-template-columns:minmax(0,1fr)"><div><span class="eyebrow">// <b>Sistemas</b></span><h2 style="margin-top:8px">Sistemas em uso</h2><p class="lead">Inventário dos sistemas do marketing e de quem trabalha com ele. A coluna Dores conta quantas dores registradas citam cada sistema.</p></div></header>
   <div class="stats"><div class="stat"><b>${named.length}</b><span>sistemas mapeados</span></div><div class="stat ${avg!=null&&avg<3?'warn':''}"><b>${avg!=null?dec(avg):'—'}</b><span>satisfação média (1 a 5)</span></div><div class="stat ${named.filter(x=>x.integra==='Não').length>=3?'warn':''}"><b>${named.filter(x=>x.integra==='Não').length}</b><span>sem integração</span></div><div class="stat"><b>${custo?brl(custo):'—'}</b><span>custo mensal informado</span></div></div>
   <section class="block"><div class="block-h"><h3>Inventário</h3><p>Clique num sistema comum para incluir, ou adicione outro.</p></div>
    <div style="display:flex;flex-wrap:wrap;gap:6px">${SYS_SUG.filter(n=>!L1.some(x=>x.nome===n)).map(n=>`<button class="chip" data-act="sys-add" data-n="${esc(n)}">+ ${esc(n)}</button>`).join('')}<button class="chip" data-act="sys-add" data-n="">+ Outro</button></div>
    ${L1.length?`<div class="tblw"><table class="tbl"><thead><tr><th style="min-width:150px">Sistema</th><th style="min-width:180px">Para que serve</th><th style="min-width:150px">Quem usa</th><th>Satisfação</th><th>Integra?</th><th style="min-width:110px">Custo mensal</th><th style="min-width:200px">Problemas relatados</th><th class="r">Dores</th><th></th></tr></thead><tbody>${L1.map(x=>`<tr>
      <td><input data-sys="${x.id}" data-f="nome" value="${esc(x.nome)}" aria-label="Sistema"></td>
      <td><input data-sys="${x.id}" data-f="uso" value="${esc(x.uso)}" placeholder="Ex.: pedidos, aprovação" aria-label="Uso"></td>
      <td><input data-sys="${x.id}" data-f="quem" value="${esc(x.quem)}" placeholder="Áreas ou pessoas" aria-label="Quem usa"></td>
      <td><select data-sys="${x.id}" data-f="satisf" aria-label="Satisfação">${opt(x.satisf,[['','—'],['1','1'],['2','2'],['3','3'],['4','4'],['5','5']])}</select></td>
      <td><select data-sys="${x.id}" data-f="integra" aria-label="Integração">${opt(x.integra,[['','—'],['Sim','Sim'],['Parcial','Parcial'],['Não','Não']])}</select></td>
      <td><input data-sys="${x.id}" data-f="custo" value="${esc(x.custo)}" inputmode="decimal" placeholder="R$" aria-label="Custo mensal"></td>
      <td><input data-sys="${x.id}" data-f="prob" value="${esc(x.prob)}" aria-label="Problemas"></td>
      <td class="r mono">${sysDores(x.nome)||'·'}</td>
      <td class="x"><button class="xbtn" data-act="sys-del" data-id="${x.id}" aria-label="Remover sistema">×</button></td></tr>`).join('')}</tbody></table></div>`:'<p class="empty">Nenhum sistema mapeado ainda.</p>'}
   </section></section>`;
}
/* ---------- Importar DRE ---------- */
// Lê linhas coladas de uma DRE (planilha ou sistema): "linha | orçado | realizado | UN (opcional)".
// Reconhece só o que o diagnóstico usa e mostra uma prévia antes de aplicar.
const UN_MATCH=[['pos',/p[oó]s[\s-]*gradua|\bmba\b|especializa|^\s*p[oó]s\s*$/i],['mestrado',/mestrado|doutorado|stricto/i],['colegio',/col[eé]gio|educa[cç][aã]o b[aá]sica|ensino (fundamental|m[eé]dio)/i],['graduacao',/gradua[cç][aã]o/i]];
function dreParse(txt){
  const out=[], ign=[];
  txt.split(/\r?\n/).map(l=>l.trim()).filter(Boolean).forEach(l=>{
    const c=l.split(/\t|;|\|/).map(x=>x.trim()); if(c.length<2){ign.push(l);return;}
    const label=c[0], o=num(c[1]), r=c.length>2?num(c[2]):null, unTxt=(c[3]||'')+' '+label;
    if(o==null&&r==null){ign.push(l);return;}
    const un=(UN_MATCH.find(([,re])=>re.test(c[3]||''))||(c[3]?null:UN_MATCH.find(([,re])=>re.test(label)))||[])[0]||null;
    const L=label.toLowerCase();
    let kind=null;
    if(/bruta/.test(L)&&/receita|faturamento/.test(L)){ign.push(l);return;}
    if(/bolsa|desconto/.test(L)) kind='descontos';
    else if(/inadimpl/.test(L)) kind='inadimplencia';
    else if(/folha|pessoal|sal[aá]rio/.test(L)) kind='folha';
    else if(/marketing|publicidade|propaganda|m[ií]dia|capta[cç][aã]o/.test(L)) kind='verba';
    else if(/ebitda|resultado|lucro/.test(L)) kind='ebitda';
    else if(/receita|faturamento/.test(L)) kind='receita';
    else if(/custo|despesa/.test(L)) kind='custo';
    if(!kind){ign.push(l);return;}
    const sets=[];
    if(un){
      if(kind==='receita'){ if(o!=null)sets.push([un+'.meta_rec',o]); if(r!=null)sets.push([un+'.receita',r]); }
      else if(kind==='verba'){ const v=r??o; if(v!=null)sets.push([un+'.orcamento',v]); }
      else if(kind==='folha'){ const v=r??o; if(v!=null)sets.push([un+'.folha',v]); }
      else { ign.push(l); return; }
    } else {
      const map={receita:['receita_orcada','receita_realizada'],custo:['custo_orcado','custo_realizado'],ebitda:['ebitda_orcado','ebitda_realizado'],verba:['verba_orcada','verba_realizada']};
      const v1=r??o;
      if(kind==='descontos'||kind==='inadimplencia'){ sets.push(['financeiro.'+kind,Math.abs(v1)]); }
      else if(kind==='folha'){ if(/marketing|mkt|comunica/.test(L)) sets.push(['financeiro.folha_mkt',v1]); else if(/docen|professor/.test(L)) sets.push(['financeiro.folha_docente',v1]); else if(/adm/.test(L)) sets.push(['financeiro.folha_adm',v1]); else { ign.push(l); return; } }
      else { if(o!=null)sets.push(['financeiro.'+map[kind][0],o]); if(r!=null)sets.push(['financeiro.'+map[kind][1],r]); }
    }
    sets.forEach(([k,v])=>out.push({k,v,label,un}));
  });
  return {out,ign};
}
const DRE_MODELO=`Receita bruta de mensalidades;0;0
(-) Bolsas e descontos;0;0
(-) Inadimplência;0;0
Receita líquida;0;0
Folha docente;0;0
Folha administrativa;0;0
Despesas com marketing;0;0
Folha marketing;0;0
Custos e despesas totais;0;0
EBITDA;0;0
Receita;0;0;Colégio
Receita;0;0;Graduação
Receita;0;0;Pós-Graduação
Receita;0;0;Mestrado
Despesas com marketing;0;0;Colégio
Despesas com marketing;0;0;Graduação
Despesas com marketing;0;0;Pós-Graduação
Despesas com marketing;0;0;Mestrado
Folha;0;0;Colégio
Folha;0;0;Graduação
Folha;0;0;Pós-Graduação
Folha;0;0;Mestrado`;
const CAMPO_NOME=k=>{ const [a,f]=k.split('.'); const area=AREA[a]; const v=area&&area.vol.find(x=>x[0]===f); return `${area?area.nome:a} · ${v?v[1]:f}`; };
function dreHtmlImport(){
  const pv=ui.drePreview;
  return `<section class="block" id="dre-import"><div class="block-h"><h3>Importar da DRE</h3><p>Cole as linhas exportadas da DRE: nome da linha, orçado, realizado e, se tiver, a UN.</p></div>
   <textarea id="dre-txt" rows="6" placeholder="Receita líquida;100.000.000;88.000.000&#10;Despesas com marketing;5.000.000;3.500.000&#10;Folha marketing;90.000;90.000&#10;Receita;30.000.000;27.500.000;Graduação" style="width:100%;font-family:var(--mono);font-size:13px">${esc(ui.dreTxt||'')}</textarea>
   <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" data-act="dre-ler">Ler DRE</button><button class="btn ghost" data-act="dre-modelo">Copiar modelo de DRE educacional</button>${pv&&pv.out.length?`<button class="btn primary" data-act="dre-aplicar">Aplicar ${pv.out.length} valores</button>`:''}</div>
   ${pv?`${pv.out.length?`<div class="tblw"><table class="tbl"><thead><tr><th>Linha da DRE</th><th>Vai preencher</th><th class="r">Valor</th><th class="r">Hoje</th></tr></thead><tbody>${pv.out.map(x=>`<tr><td>${esc(x.label)}${x.un?` <span class="chip">${esc(nameOf(x.un))}</span>`:''}</td><td>${esc(CAMPO_NOME(x.k))}</td><td class="r">${brl(x.v)}</td><td class="r muted">${cur.campos[x.k]?brl(num(cur.campos[x.k])):'vazio'}</td></tr>`).join('')}</tbody></table></div>`:'<p class="empty">Nenhuma linha reconhecida. Use o formato: nome da linha; orçado; realizado; UN.</p>'}
   ${pv.ign.length?`<p class="muted" style="font-size:13px">${pv.ign.length} linha(s) ignorada(s) por não serem usadas no diagnóstico: ${esc(pv.ign.slice(0,4).map(l=>l.split(/\t|;|\|/)[0]).join(', '))}${pv.ign.length>4?'…':''}</p>`:''}`:''}
  </section>`;
}
/* ---------- Expectativas da reitoria por UN ---------- */
const unxKey=(un,k)=>`reitoria.${un}.${k}`;
const unxGet=(un,k)=>cur.campos[unxKey(un,k)]||'';
function unExpResumo(un){
  const e=unxGet(un,'expect'), es=unxGet(un,'esforco'), f=unxGet(un,'foco'), c=unxGet(un,'crescimento');
  const parts=[e&&`espera ${e.toLowerCase()}`, es&&`${es==='Manter'?'manter':es.toLowerCase()} investimento`, c&&`crescimento de ${c}% em matrículas`, f&&`prioridades: ${f.split('|').join(', ').toLowerCase()}`].filter(Boolean);
  return parts.join(' · ');
}
function unExpHtml(){
  return `<section class="block"><div class="block-h"><h3>Expectativas por UN</h3><p>Toque nas opções durante a conversa com a reitoria. Elas entram nos cruzamentos de cada UN.</p></div>
   <div class="unx">${UNS.map(u=>`<div class="unx-card"><b>${esc(u.nome)}</b>
    ${UN_EXP.map(g=>{const val=unxGet(u.id,g.k); const sel=g.multi?val.split('|').filter(Boolean):[val];
      return `<div class="unx-g"><span class="lbl">${g.label}</span><div class="seg">${g.opts.map(o=>`<button class="segb ${sel.includes(o)?'on':''}" data-act="unx" data-un="${u.id}" data-k="${g.k}" data-v="${esc(o)}" ${g.multi?`data-multi="${g.multi}"`:''} aria-pressed="${sel.includes(o)}">${esc(o)}</button>`).join('')}</div></div>`;}).join('')}
    <div class="unx-row">${fieldHtml(unxKey(u.id,'crescimento'),'Crescimento esperado em matrículas','%')}</div>
    ${fieldHtml(unxKey(u.id,'obs'),'Observação da reitoria sobre esta UN','t')}
   </div>`).join('')}</div></section>`;
}
/* ---------- Retrato do Trello (Gestão de demandas) ---------- */
const TRELLO=[['backlog','Backlog','var(--faint)'],['priorizacao','Em priorização','var(--n3)'],['andamento','Em produção','var(--accent)'],['urgencia','Urgência','var(--n2)'],['gohorse','Gohorse (fora do fluxo)','var(--n1)'],['parados','Parados','#9b7bd4']];
function trelloStats(){
  const g=k=>num(cur.campos['demandas.trello_'+k]);
  const v=Object.fromEntries(TRELLO.map(([k])=>[k,g(k)])); const concl=g('concluidos'), hc=V('financeiro','headcount');
  const filled=TRELLO.some(([k])=>v[k]!=null); if(!filled) return null;
  const abertos=TRELLO.reduce((a,[k])=>a+(v[k]||0),0);
  const furam=(v.urgencia||0)+(v.gohorse||0);
  return {v,concl,abertos,furam,pFuram:abertos?furam/abertos:null,pParados:abertos?(v.parados||0)/abertos:null,semanas:concl>0?abertos/(concl/4.33):null,porPessoa:hc>0?abertos/hc:null,hc};
}
function trelloHtml(){
  const t=trelloStats();
  const inp=(k,l)=>`<div class="field"><label for="c-demandas.trello_${k}">${l}</label><div class="inu"><input id="c-demandas.trello_${k}" data-campo="demandas.trello_${k}" inputmode="decimal" value="${esc(cur.campos['demandas.trello_'+k]||'')}" placeholder="0"></div></div>`;
  return `<section class="block"><div class="block-h"><h3>Retrato do Trello</h3><p>Quantos projetos estão em cada lista hoje. É a medida real da capacidade.</p></div>
   <div class="fields">${TRELLO.map(([k,l])=>inp(k,l)).join('')}${inp('concluidos','Concluídos no último mês')}${inp('dias_parado','Tempo médio parado (dias)')}</div>
   ${t?trelloView(t):''}
  </section>`;
}
function trelloView(t){ return `<div class="stack" role="img" aria-label="Distribuição dos projetos abertos">${TRELLO.filter(([k])=>t.v[k]).map(([k,l,c])=>`<span style="flex:${t.v[k]};background:${c}" title="${l}: ${t.v[k]}"></span>`).join('')}</div>
    <div class="legend">${TRELLO.filter(([k])=>t.v[k]).map(([k,l,c])=>`<span class="lg"><i style="background:${c}"></i>${l} <b class="num">${t.v[k]}</b></span>`).join('')}</div>
    <div class="stats"><div class="stat"><b>${t.abertos}</b><span>projetos abertos</span></div>
     <div class="stat ${t.pFuram>=0.3?'bad':t.pFuram>=0.15?'warn':''}"><b>${pct(t.pFuram)}</b><span>furam o fluxo (urgência + gohorse)</span></div>
     <div class="stat ${t.pParados>=0.2?'warn':''}"><b>${pct(t.pParados)}</b><span>parados</span></div>
     <div class="stat ${t.semanas>=6?'bad':''}"><b>${t.semanas!=null?dec(t.semanas,1).replace(',0','')+' sem.':'—'}</b><span>para zerar a fila no ritmo atual</span></div>
     <div class="stat"><b>${t.porPessoa!=null?dec(t.porPessoa,1):'—'}</b><span>${t.hc?'projetos abertos por pessoa':'por pessoa (informe o time em Orçamento e DRE)'}</span></div></div>`;
}
/* ---------- Modo entrevista ---------- */
// Uma pergunta por tela, botões grandes, teclas 1 a 4 e roteiro aberto ao lado.
function ivOrder(){ return stepOf(ui.iv.area)==='reitoria'?LID:jornadaLista(); }
function ivHtml(){
  const a=AREA[ui.iv.area]; if(!a) return '';
  const qs=a.q, i=Math.min(ui.iv.i,qs.length), done=i>=qs.length, x=qs[i];
  const ans=qs.filter(q=>cur.resp[q[0]]).length, s=SC[a.id];
  const ORD=ivOrder(), nextA=ORD[ORD.indexOf(a)+1];
  const ents=cur.entrevistas.filter(e=>e.area===a.id&&e.nome);
  const rot=(a.vol||[]).filter(v=>v[2]==='t');
  const nums=(a.vol||[]).filter(v=>v[2]!=='t');
  const main = done ? `<div class="iv-done"><span class="eyebrow">// Área concluída</span><h2>${esc(a.nome)}</h2>
      <div class="iv-score">${lvChip(s.score!=null?s.level:0)}<b>${s.score!=null?dec(s.score):'—'}</b><small>/ 4 · ${ans} de ${qs.length} respondidas</small></div>
      ${nums.length?`<div class="fields">${nums.map(v=>fieldHtml(a.id+'.'+v[0],v[1],v[2])).join('')}</div>`:''}
      <div class="iv-nav"><button class="btn" data-act="iv-go" data-v="${qs.length-1}">← Revisar</button>${nextA?`<button class="btn primary big" data-act="iv-area" data-v="${nextA.id}">Próxima: ${esc(nextA.nome)} →</button>`:''}<button class="btn ghost" data-act="iv-exit">Sair do modo entrevista</button></div></div>`
   : `<div class="iv-prog"><span>${esc(a.nome)} · pergunta ${i+1} de ${qs.length}</span><span class="iv-dots">${qs.map((q,k)=>`<button class="iv-dot ${k===i?'on':''} ${cur.resp[q[0]]?'ok':''}" data-act="iv-go" data-v="${k}" aria-label="Pergunta ${k+1}"></button>`).join('')}</span></div>
      <div class="iv-tags"><span class="tag">${PIL[x[2]]}</span><span class="tag">${IMP[x[3]]}</span>${x[4]?'<span class="tag warn">Eliminatória</span>':''}</div>
      <h2 class="iv-q">${esc(x[5])}</h2>
      <div class="iv-opts">${x[6].map((o,k)=>{const n=k+1, on=cur.resp[x[0]]===n;return `<button class="iv-opt n${n} ${on?'on':''}" data-act="iv-pick" data-q="${x[0]}" data-n="${n}" aria-pressed="${on}"><span class="k">${n}</span><span class="t">${esc(o)}</span><span class="l">${LVL[n]}</span></button>`;}).join('')}</div>
      <div class="iv-note"><textarea data-nota="${x[0]}" rows="2" placeholder="O que a pessoa disse que sustenta a resposta (opcional)">${esc(cur.notas[x[0]]||'')}</textarea><label class="evid"><input type="checkbox" data-evid="${x[0]}" ${cur.evid[x[0]]?'checked':''}>Comprovado com evidência</label></div>
      <div class="iv-nav"><button class="btn" data-act="iv-go" data-v="${i-1}" ${i?'':'disabled'}>← Anterior</button><span class="muted iv-hint">Teclas 1 a 4 respondem · setas navegam · Esc sai</span><button class="btn primary" data-act="iv-go" data-v="${i+1}">${cur.resp[x[0]]?'Próxima →':'Pular →'}</button></div>`;
  return `<div class="iv-wrap" role="dialog" aria-label="Modo entrevista">
   <div class="iv-top"><span class="logo"><i></i>Modo entrevista</span><span class="muted">${esc(cur.nome)}</span><button class="btn sm" data-act="iv-exit">Sair (Esc)</button></div>
   <div class="iv-grid"><main class="iv-main">${main}</main>
    <aside class="iv-side">
     <section><h3>Entrevistado</h3>${ents.length?`<p>${ents.map(e=>`<b>${esc(e.nome)}</b>${e.cargo?` · ${esc(e.cargo)}`:''}`).join('<br>')}</p>`:''}
      <form id="f-iv-ent" class="iv-ent"><input name="nome" placeholder="Nome" aria-label="Nome do entrevistado" required><input name="cargo" placeholder="Cargo" aria-label="Cargo"><button class="btn sm" type="submit">${ents.length?'+ Outro':'Registrar'}</button></form></section>
     ${rot.length?`<section><h3>Roteiro</h3><div class="fields one">${rot.map(v=>fieldHtml(a.id+'.'+v[0],v[1],v[2])).join('')}</div></section>`:''}
     <section><h3>Dor relatada agora</h3><form class="dorform mini" data-dorform="1" data-area="${a.id}"><input name="txt" class="dtxt" placeholder="Descreva a dor" aria-label="Dor relatada" required>
      <select name="etapa" aria-label="Onde trava">${FLUXO.map(o=>`<option ${ui.dorDef.etapa===o?'selected':''}>${o}</option>`).join('')}</select>
      <select name="sev" aria-label="Gravidade">${[['1','Baixa'],['2','Média'],['3','Alta']].map(([v,l])=>`<option value="${v}" ${ui.dorDef.sev===v?'selected':''}>${l}</option>`).join('')}</select>
      <input type="hidden" name="tipo" value="${esc(ui.dorDef.tipo)}"><input type="hidden" name="freq" value="${esc(ui.dorDef.freq)}"><input type="hidden" name="quem" value="${esc((ents[0]||{}).nome||'')}"><input type="hidden" name="sistema" value="">
      <button class="btn sm" type="submit">Registrar dor</button></form>
      ${cur.dores.filter(d=>d.area===a.id).length?`<p class="muted" style="font-size:13px">${pl(cur.dores.filter(d=>d.area===a.id).length,'dor registrada','dores registradas')} nesta área</p>`:''}</section>
     <section>${fieldHtml(a.id+'.contexto','Anotações livres da conversa','t')}</section>
    </aside></div></div>`;
}
function renderIV(){ let el=$('#iv'); if(!el){ el=document.createElement('div'); el.id='iv'; document.body.appendChild(el); } if(!ui.iv||!cur){ el.hidden=true; el.innerHTML=''; document.body.style.overflow=''; return; } el.hidden=false; el.innerHTML=ivHtml(); document.body.style.overflow='hidden'; }
document.addEventListener('keydown',e=>{
  if(!ui.iv||!cur) return; const tag=(document.activeElement||{}).tagName;
  if(e.key==='Escape'){ ui.iv=null; render(); return; }
  if(/INPUT|TEXTAREA|SELECT/.test(tag)) return;
  const a=AREA[ui.iv.area]; const x=a.q[ui.iv.i];
  if(x&&/^[1-4]$/.test(e.key)){ const b=document.querySelector(`[data-act="iv-pick"][data-n="${e.key}"]`); b&&b.click(); e.preventDefault(); }
  else if(e.key==='ArrowRight'){ ui.iv.i=Math.min(a.q.length,ui.iv.i+1); render(); }
  else if(e.key==='ArrowLeft'){ ui.iv.i=Math.max(0,ui.iv.i-1); render(); }
});
function renderSubnav(INS){
  const x=crossTasks(INS); const hot=x.late.length+x.semTarefa.length;
  $('#subnav').innerHTML=`<button class="tab ${ui.view==='fases'?'on':''}" data-act="view" data-v="fases">Metodologia</button>
   <button class="tab ${ui.view==='dores'?'on':''}" data-act="view" data-v="dores">Dores e gargalos <span class="ct">${cur.dores.length}</span></button>
   <button class="tab ${ui.view==='sistemas'?'on':''}" data-act="view" data-v="sistemas">Sistemas <span class="ct">${cur.sistemas.filter(x=>x.nome).length}</span></button>
   <button class="tab ${ui.view==='tarefas'?'on':''}" data-act="view" data-v="tarefas">Tarefas <span class="ct ${hot?'hot':''}">${x.open.length}</span></button>
   <button class="tab ${ui.view==='equipe'?'on':''}" data-act="view" data-v="equipe">Equipe <span class="ct">${cur.equipe.length}</span></button>`;
}
function focusKey(el){
  if(!el||el===document.body||!el.tagName||!/INPUT|TEXTAREA|SELECT/.test(el.tagName))return null;
  if(el.id)return '#'+CSS.escape(el.id);
  const dataSel=n=>[...n.attributes].filter(a=>a.name.startsWith('data-')).map(a=>`[${a.name}="${CSS.escape(a.value)}"]`).join('');
  const attrs=dataSel(el);
  if(attrs)return el.tagName.toLowerCase()+attrs;
  if(el.name&&el.form){ const fs=el.form.id?'#'+CSS.escape(el.form.id):'form'+dataSel(el.form); return `${fs} [name="${CSS.escape(el.name)}"]`; }
  return null;
}
let soonT=null; function soon(){ clearTimeout(soonT); soonT=setTimeout(render,0); }
function render(){
  const ae=document.activeElement, fk=focusKey(ae); let selS=null,selE=null; try{selS=ae.selectionStart;selE=ae.selectionEnd;}catch(e){}
  const DRAFT='form[data-dorform] input, form[data-dorform] select, form[data-fofa] input, #f-convite input, #f-convite select, #novo-nome, #novo-nome2';
  const drafts=[...document.querySelectorAll(DRAFT)].map(el=>[focusKey(el),el.value]).filter(x=>x[0]&&x[1]);
  renderInner();
  drafts.forEach(([k,v])=>{ const el=document.querySelector(k); if(el&&!el.value) el.value=v; });
  if(fk){ const el=document.querySelector(fk); if(el&&el!==document.activeElement){ el.focus({preventScroll:true}); try{ if(selS!=null) el.setSelectionRange(selS,selE);}catch(e){} } }
}
function renderInner(){
  if(!cur){ renderBar(); $('#rail').hidden=true;
    $('#subnav').innerHTML=me&&me.papel==='admin'?`<button class="tab ${ui.view!=='equipe'?'on':''}" data-act="view" data-v="fases">Diagnósticos</button><button class="tab ${ui.view==='equipe'?'on':''}" data-act="view" data-v="equipe">Equipe</button>`:'';
    if(ui.view==='equipe'&&me&&me.papel==='admin'){ SC={}; renderEquipe(); return; }
    $('#main').innerHTML=`<section class="auth" style="min-height:auto"><div class="auth-box"><h2>Nenhum diagnóstico ainda</h2><p>${me&&me.papel!=='cliente'?'Crie o primeiro com o nome do cliente. Depois convide a equipe e distribua as áreas.':'Nenhum diagnóstico foi liberado para você ainda. Fale com a LORSO Digital.'}</p>${me&&me.papel!=='cliente'?`<form id="f-novo2"><label>Cliente<input id="novo-nome2" required placeholder="Nome da instituição"></label><button class="btn primary" type="submit">Criar diagnóstico</button></form>`:''}</div></section>`;
    return; }
  computeAll(); const INS=runEngine();
  renderBar(); renderSubnav(INS);
  $('#rail').hidden = ui.view!=='fases';
  if(ui.view==='tarefas') renderTarefas(INS);
  else if(ui.view==='dores') renderDores(INS);
  else if(ui.view==='sistemas') renderSistemas();
  else if(ui.view==='equipe') renderEquipe();
  else { renderRail(); ({diagnostico:renderDiagnostico,estrategia:renderEstrategia,execucao:renderExecucao,otimizacao:renderOtimizacao,resultados:renderResultados})[ui.stage](INS); }
  renderIV();
  document.querySelectorAll('textarea[data-nota],.field textarea,.kedit textarea').forEach(autoGrow);
}
/* tarefas de coleta acompanham o preenchimento */
function autoTasks(){
  let ch=false;
  cur.acoes.forEach(t=>{ if(!t.origem||!t.origem.startsWith('coleta:'))return; const a=AREA[t.origem.slice(7)]; if(!a)return; const ans=a.q.filter(x=>cur.resp[x[0]]).length;
    if(ans===a.q.length&&t.status!=='Concluída'){t.status='Concluída';ch=true;}
    else if(ans>0&&ans<a.q.length&&t.status==='A fazer'){t.status='Em andamento';ch=true;} });
  if(ch)mark('acoes');
}
function newTask(o){ const t={id:uid(),txt:'',area:'',dono:'',prazo:'',status:'A fazer',origem:'',...o}; if(!t.dono&&t.area&&cur.dono_area[t.area])t.dono=cur.dono_area[t.area]; cur.acoes.push(t); mark('acoes'); return t; }
function autoGrow(t){t.style.height='auto';t.style.height=Math.min(t.scrollHeight+2,420)+'px';}

/* ================= RESUMO ================= */
function summary(){
  computeAll(); const INS=runEngine(), ov=overall(); const L2=[];
  L2.push(`DIAGNÓSTICO DE MATURIDADE · ${cur.nome}`); L2.push(`Maturidade geral: ${ov.score!=null?dec(ov.score)+' / 4 (N'+ov.level+' '+LVL[ov.level]+')':'sem nota'}`); L2.push('');
  L2.push('MATURIDADE POR ÁREA'); AREAS.forEach(a=>{const s=SC[a.id]; L2.push(`- ${a.nome}: ${s.score!=null?dec(s.score)+' (N'+s.level+' '+LVL[s.level]+')':'sem nota'}`);}); L2.push('');
  L2.push('INCONGRUÊNCIAS'); if(!INS.length)L2.push('- Nenhuma'); INS.forEach(i=>{L2.push(`- [${SEV[i.sev]}] ${i.t}: ${i.txt}`); i.rec.forEach(r=>L2.push(`    • ${r}`));}); L2.push('');
  { const ex=UNS.map(u=>[u.nome,unExpResumo(u.id)]).filter(x=>x[1]); if(ex.length){ L2.push('EXPECTATIVAS DA REITORIA POR UN'); ex.forEach(([n,t])=>L2.push(`- ${n}: ${t}`)); L2.push(''); } }
  { const t=trelloStats(); if(t){ L2.push('RETRATO DO TRELLO'); L2.push(`- ${t.abertos} projetos abertos: `+TRELLO.filter(([k])=>t.v[k]).map(([k,l])=>`${l} ${t.v[k]}`).join(', ')); if(t.concl!=null)L2.push(`- ${t.concl} concluídos no último mês${t.semanas!=null?` · ${dec(t.semanas,0)} semanas para zerar a fila`:''}`); L2.push(''); } }
  if(cur.campos['ctx.problema'])L2.push('PROBLEMA CENTRAL RELATADO: '+cur.campos['ctx.problema']);
  if(cur.campos['ctx.hipotese'])L2.push('HIPÓTESE DO CONSULTOR: '+cur.campos['ctx.hipotese']);
  if(cur.dores.length){ L2.push(''); L2.push('GARGALOS POR ETAPA'); gargalos().filter(g=>g.n).sort((a,b)=>b.score-a.score).forEach(g=>L2.push(`- ${g.etapa}: ${g.n} dores (${g.graves} graves)`)); L2.push(''); L2.push('DORES MAIS PESADAS'); [...cur.dores].sort((a,b)=>dorScore(b)-dorScore(a)).slice(0,10).forEach(d=>L2.push(`- ${d.txt} [${nameOf(d.area)||'Geral'} · ${d.etapa} · ${SEVN[d.sev]} · ${d.freq}${d.quem?' · '+d.quem:''}]`)); L2.push(''); }
  if(cur.sistemas.some(x=>x.nome)){ L2.push('SISTEMAS'); cur.sistemas.filter(x=>x.nome).forEach(x=>L2.push(`- ${x.nome}${x.uso?' ('+x.uso+')':''}: satisfação ${x.satisf||'—'}/5, integra: ${x.integra||'—'}${x.prob?', problemas: '+x.prob:''}`)); L2.push(''); }
  const fin=finRows().filter(r=>r.receita!=null||r.orcamento!=null); if(fin.length){L2.push('UNIDADES DE NEGÓCIO'); fin.forEach(r=>L2.push(`- ${r.nome}: receita ${brl(r.receita)}, ${pct(r.ating)} da meta, orçamento ${brl(r.orcamento)} (${pct(r.orcRec)} da receita)`)); L2.push('');}
  const man=cur.fofa.geral||{}; if(FQ.some(([k])=>(man[k]||[]).length)){L2.push('FOFA (leitura do consultor)'); FQ.forEach(([k,n])=>(man[k]||[]).forEach(t=>L2.push(`- ${n}: ${t}`))); L2.push('');}
  if(cur.equipe.length){L2.push('EQUIPE DE COLETA'); cur.equipe.forEach(m=>L2.push(`- ${m.nome||'Sem nome'}${m.papel?' ('+m.papel+')':''}: ${AREAS.filter(a=>cur.dono_area[a.id]===m.id).map(a=>a.nome).join(', ')||'sem área'}`)); L2.push('');}
  if(cur.acoes.length){L2.push('TAREFAS'); COLS.forEach(c=>cur.acoes.filter(a=>a.status===c).forEach(a=>L2.push(`- [${c}] ${a.txt||'Sem título'} | ${a.area?nameOf(a.area):'Geral'} | ${(member(a.dono)||{}).nome||'sem responsável'} | ${a.prazo?fmtDate(a.prazo):'sem prazo'}`)));}
  return L2.join('\n');
}

/* ================= SUPABASE: DADOS ================= */
const sb = window.supabase.createClient(window.CD_CONFIG.url, window.CD_CONFIG.key, {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
let me=null, profiles=[], convites=[], snap=null, channel=null, pendingData=null;
let ver=0, savedVer=0, saving=false, timer=null, saveErr=null, pendingRemote=false;
const clone=v=>v===undefined?null:JSON.parse(JSON.stringify(v));
function mark(){}   // o sincronizador compara o estado inteiro com o último salvo
const nz=v=>v===''||v==null?null:v;
const toInt=v=>{const n=parseInt(v,10);return isNaN(n)?null:n;};
const ARR_DB={
 entrevistas:{t:'entrevistas',to:x=>({id:x.id,area:nz(x.area),nome:nz(x.nome),cargo:nz(x.cargo),departamento:nz(x.depto),data:nz(x.data)}),from:r=>({id:r.id,area:r.area||'',nome:r.nome||'',cargo:r.cargo||'',depto:r.departamento||'',data:r.data||''})},
 acoes:{t:'tarefas',to:x=>({id:x.id,titulo:nz(x.txt),area:nz(x.area),responsavel:nz(x.dono),prazo:nz(x.prazo),status:x.status,origem:nz(x.origem)}),from:r=>({id:r.id,txt:r.titulo||'',area:r.area||'',dono:r.responsavel||'',prazo:r.prazo||'',status:r.status,origem:r.origem||''})},
 testes:{t:'experimentos',to:x=>({id:x.id,hipotese:nz(x.hip),area:nz(x.area),impacto:toInt(x.i),confianca:toInt(x.c),facilidade:toInt(x.f)}),from:r=>({id:r.id,hip:r.hipotese||'',area:r.area||'',i:r.impacto??'',c:r.confianca??'',f:r.facilidade??''})},
 kpis:{t:'indicadores',to:x=>({id:x.id,nome:nz(x.nome),un:nz(x.un),meta:nz(x.meta),realizado:nz(x.real)}),from:r=>({id:r.id,nome:r.nome||'',un:r.un||'',meta:r.meta||'',real:r.realizado||''})},
 dores:{t:'dores',to:x=>({id:x.id,descricao:x.txt,area:nz(x.area),etapa:nz(x.etapa),tipo:nz(x.tipo),gravidade:toInt(x.sev),frequencia:nz(x.freq),relatado_por:nz(x.quem),sistema:nz(x.sistema),data:nz(x.data)}),from:r=>({id:r.id,txt:r.descricao,area:r.area||'',etapa:r.etapa||'',tipo:r.tipo||'',sev:String(r.gravidade||2),freq:r.frequencia||'',quem:r.relatado_por||'',sistema:r.sistema||'',data:r.data||''})},
 cursos:{t:'cursos',to:x=>({id:x.id,un:nz(x.un),nome:nz(x.nome),modalidade:nz(x.modalidade),turno:nz(x.turno),preco:nz(x.preco),vagas:nz(x.vagas),matriculados:nz(x.matriculados),status:x.status||'Vigente',lancamento:nz(x.lancamento),obs:nz(x.obs)}),from:r=>({id:r.id,un:r.un||'',nome:r.nome||'',modalidade:r.modalidade||'',turno:r.turno||'',preco:r.preco||'',vagas:r.vagas||'',matriculados:r.matriculados||'',status:r.status||'Vigente',lancamento:r.lancamento||'',obs:r.obs||''})},
 iniciativas:{t:'iniciativas',to:x=>({id:x.id,titulo:nz(x.titulo),bloco:nz(x.bloco),area:nz(x.area),horizonte:nz(x.horizonte),impacto:toInt(x.impacto),esforco:toInt(x.esforco),risco:toInt(x.risco),dependencias:nz(x.dependencias),alinhamento:nz(x.alinhamento),recomendacao:nz(x.recomendacao),motivo:nz(x.motivo),indicador:nz(x.indicador),ordem:toInt(x.ordem)??0}),from:r=>({id:r.id,titulo:r.titulo||'',bloco:r.bloco||'',area:r.area||'',horizonte:r.horizonte||'',impacto:r.impacto??'',esforco:r.esforco??'',risco:r.risco??'',dependencias:r.dependencias||'',alinhamento:r.alinhamento||'',recomendacao:r.recomendacao||'',motivo:r.motivo||'',indicador:r.indicador||'',ordem:r.ordem||0})},
 sistemas:{t:'sistemas',to:x=>({id:x.id,nome:nz(x.nome),uso:nz(x.uso),usuarios:nz(x.quem),satisfacao:toInt(x.satisf),integra:nz(x.integra),custo_mensal:nz(x.custo),problemas:nz(x.prob)}),from:r=>({id:r.id,nome:r.nome||'',uso:r.uso||'',quem:r.usuarios||'',satisf:r.satisfacao!=null?String(r.satisfacao):'',integra:r.integra||'',custo:r.custo_mensal||'',prob:r.problemas||''})},
};
const DIAG_TABLES=['respostas','campos','responsaveis_area','fofa_itens',...Object.values(ARR_DB).map(m=>m.t)];
const ok=r=>{ if(r&&r.error) throw r.error; return r?r.data:null; };
function equipeList(){ return profiles.filter(p=>p.ativo).map(p=>({id:p.id,nome:p.nome||p.email,papel:p.funcao||'',contato:p.contato||'',email:p.email,role:p.papel})); }
async function loadList(){ const d=ok(await sb.from('diagnosticos').select('id,nome,updated_at').order('updated_at',{ascending:false})); all=Object.fromEntries((d||[]).map(x=>[x.id,x])); }
async function loadTeam(){
  const p=ok(await sb.from('profiles').select('*').order('nome'));
  profiles=p||[];
  if(me&&me.papel!=='cliente'){ const c=ok(await sb.from('convites').select('*').order('created_at')); convites=(c||[]).filter(x=>!profiles.some(pp=>pp.email===x.email)); } else convites=[];
  if(cur) cur.equipe=equipeList();
}
async function loadDiag(id){
  const q=t=>sb.from(t).select('*').eq('diagnostico_id',id);
  const res=await Promise.all([sb.from('diagnosticos').select('*').eq('id',id).single(),q('respostas'),q('campos'),q('responsaveis_area'),q('fofa_itens').order('ordem').order('created_at'),...Object.values(ARR_DB).map(m=>q(m.t).order('created_at'))]);
  const [d,resp,campos,resA,fofa,...arrs]=res.map(ok);
  const o=blank(d.nome); o.id=id; o.atualizadoEm=d.updated_at;
  resp.forEach(r=>{ if(r.nivel)o.resp[r.pergunta_id]=r.nivel; if(r.nota)o.notas[r.pergunta_id]=r.nota; if(r.evidenciada)o.evid[r.pergunta_id]=true; });
  campos.forEach(r=>{ if(r.valor!=null&&r.valor!=='')o.campos[r.chave]=r.valor; });
  resA.forEach(r=>{ o.dono_area[r.area]=r.user_id; });
  fofa.forEach(r=>{ o.fofa[r.chave]=o.fofa[r.chave]||{}; (o.fofa[r.chave][r.quadrante]=o.fofa[r.chave][r.quadrante]||[]).push(r.texto); });
  Object.keys(ARR_DB).forEach((k,i)=>{ o[k]=arrs[i].map(ARR_DB[k].from); });
  o.equipe=equipeList();
  return o;
}
function diffMap(now,was){ const up=[],del=[]; new Set([...Object.keys(now),...Object.keys(was)]).forEach(k=>{ const a=now[k], b=was[k]; if(JSON.stringify(a??null)===JSON.stringify(b??null))return; if(a==null||a==='')del.push(k); else up.push(k); }); return {up,del}; }
async function flush(){
  if(!cur||!snap) return;
  if(saving){ clearTimeout(timer); timer=setTimeout(flush,400); return; }
  if(savedVer===ver) return;
  saving=true; const v=ver, now=clone(cur), was=snap, D=now.id, ts=new Date().toISOString(); renderStatus();
  try{
    const ops=[];
    // respostas: nível, observação e evidência por pergunta
    const qids=new Set([...Object.keys(now.resp),...Object.keys(now.notas),...Object.keys(now.evid),...Object.keys(was.resp),...Object.keys(was.notas),...Object.keys(was.evid)]);
    const rUp=[],rDel=[];
    qids.forEach(q=>{ const a=[now.resp[q]||null,now.notas[q]||null,!!now.evid[q]], b=[was.resp[q]||null,was.notas[q]||null,!!was.evid[q]]; if(JSON.stringify(a)===JSON.stringify(b))return; if(!a[0]&&!a[1]&&!a[2])rDel.push(q); else rUp.push({diagnostico_id:D,pergunta_id:q,nivel:a[0],nota:a[1],evidenciada:a[2],updated_at:ts}); });
    if(rUp.length) ops.push(sb.from('respostas').upsert(rUp));
    if(rDel.length) ops.push(sb.from('respostas').delete().eq('diagnostico_id',D).in('pergunta_id',rDel));
    // campos abertos
    const c=diffMap(now.campos,was.campos);
    if(c.up.length) ops.push(sb.from('campos').upsert(c.up.map(k=>({diagnostico_id:D,chave:k,valor:now.campos[k],updated_at:ts}))));
    if(c.del.length) ops.push(sb.from('campos').delete().eq('diagnostico_id',D).in('chave',c.del));
    // responsáveis por área
    const ra=diffMap(now.dono_area,was.dono_area);
    if(ra.up.length) ops.push(sb.from('responsaveis_area').upsert(ra.up.map(a=>({diagnostico_id:D,area:a,user_id:now.dono_area[a]}))));
    if(ra.del.length) ops.push(sb.from('responsaveis_area').delete().eq('diagnostico_id',D).in('area',ra.del));
    // FOFA manual: regrava a chave que mudou
    new Set([...Object.keys(now.fofa),...Object.keys(was.fofa)]).forEach(k=>{
      if(JSON.stringify(now.fofa[k]||{})===JSON.stringify(was.fofa[k]||{}))return;
      const rows=[]; Object.entries(now.fofa[k]||{}).forEach(([qd,list])=>(list||[]).forEach((t,i)=>rows.push({diagnostico_id:D,chave:k,quadrante:qd,texto:t,ordem:i})));
      ops.push((async()=>{ const r=await sb.from('fofa_itens').delete().eq('diagnostico_id',D).eq('chave',k); if(r.error)return r; return rows.length?await sb.from('fofa_itens').insert(rows):r; })());
    });
    // listas (entrevistas, tarefas, dores, sistemas, indicadores, experimentos)
    Object.entries(ARR_DB).forEach(([k,m])=>{
      const A=new Map(now[k].map(x=>[x.id,x])), B=new Map(was[k].map(x=>[x.id,x])); const up=[],del=[];
      A.forEach((x,id)=>{ if(!B.has(id)||JSON.stringify(m.to(x))!==JSON.stringify(m.to(B.get(id)))) up.push({...m.to(x),diagnostico_id:D}); });
      B.forEach((x,id)=>{ if(!A.has(id))del.push(id); });
      if(up.length) ops.push(sb.from(m.t).upsert(up));
      if(del.length) ops.push(sb.from(m.t).delete().in('id',del));
    });
    if(ops.length||now.nome!==was.nome) ops.push(sb.from('diagnosticos').update({nome:now.nome,updated_at:ts}).eq('id',D));
    const res=await Promise.all(ops); res.forEach(ok);
    snap=now; savedVer=v; if(all[D]){all[D].nome=now.nome; all[D].updated_at=ts;}
    saveErr=null;
  }catch(e){
    saveErr=/JWT|session/i.test(e.message||'')?'Sessão expirada; entre de novo':'Não foi possível salvar; tentando de novo';
    console.error(e); clearTimeout(timer); timer=setTimeout(flush,4000);
  }
  saving=false; renderStatus();
  if(savedVer!==ver&&!saveErr){ clearTimeout(timer); timer=setTimeout(flush,500); }
  if(savedVer===ver&&pendingRemote) remoteSoon();
}
function touch(full){ if(!cur)return; cur.atualizadoEm=new Date().toISOString(); ver++; if(full)render(); else renderStatus(); clearTimeout(timer); timer=setTimeout(flush,700); }
function isTyping(){const a=document.activeElement;return a&&/INPUT|TEXTAREA|SELECT/.test(a.tagName)&&a.id!=='sel-diag';}
/* tempo real: quando outra pessoa salva, recarrega e aplica assim que você para de digitar */
let remoteT=null;
function remoteSoon(){ clearTimeout(remoteT); remoteT=setTimeout(async()=>{
  if(!cur)return; if(ver!==savedVer||saving){ pendingRemote=true; return; }
  try{ const o=await loadDiag(cur.id); if(ver!==savedVer||!cur||o.id!==cur.id){ pendingRemote=true; return; } pendingData=o; adoptRemote(); }catch(e){}
 },700); }
function adoptRemote(){
  if(!pendingData){ if(pendingRemote&&!isTyping()){ pendingRemote=false; remoteSoon(); } return; }
  if(isTyping()){ pendingRemote=true; return; }
  const o=pendingData; pendingData=null; pendingRemote=false;
  const a=JSON.stringify({...o,atualizadoEm:0}), b=JSON.stringify({...cur,atualizadoEm:0});
  snap=clone(o); if(a!==b){ cur=o; render(); }
}
function subscribe(id){
  if(channel){ sb.removeChannel(channel); channel=null; }
  channel=sb.channel('diag-'+id);
  DIAG_TABLES.forEach(t=>channel.on('postgres_changes',{event:'*',schema:'public',table:t,filter:`diagnostico_id=eq.${id}`},remoteSoon));
  channel.on('postgres_changes',{event:'UPDATE',schema:'public',table:'diagnosticos',filter:`id=eq.${id}`},remoteSoon);
  channel.subscribe();
}
async function openDiag(id){
  if(cur&&ver!==savedVer) await flush();
  $('#main').innerHTML='<p class="loading">Carregando diagnóstico…</p>';
  try{ const o=await loadDiag(id); cur=o; snap=clone(o); ver=savedVer=0; saveErr=null; ui.openTask=null; lsSet('cd.last',id); subscribe(id); render(); }
  catch(e){ console.error(e); toast('Não foi possível abrir o diagnóstico'); }
}
async function createDiag(nome){
  const r=await sb.from('diagnosticos').insert({nome,cliente:nome}).select('id,nome,updated_at').single();
  if(r.error){ toast('Não foi possível criar: '+r.error.message); return; }
  all[r.data.id]=r.data; ui.novo=false; ui.view='fases'; ui.stage='diagnostico'; ui.area='reitoria'; ui.dstep='base'; saveUi(); await openDiag(r.data.id);
}
const profT={};
function saveProfile(id){ clearTimeout(profT[id]); profT[id]=setTimeout(async()=>{ const p=profiles.find(x=>x.id===id); if(!p)return; const r=await sb.from('profiles').update({nome:p.nome,funcao:p.funcao,contato:p.contato}).eq('id',id); if(r.error)toast('Não foi possível salvar o perfil'); },700); }

/* ================= ACESSO ================= */
let authMode='entrar', authMsg=null, authEmail='';
const BASE=()=>location.origin+location.pathname;
function showAuth(){ $('#app').hidden=true; $('#auth').hidden=false; renderAuth(); }
function renderAuth(){
  const m=authMode;
  const title={entrar:'Entrar',primeiro:'Primeiro acesso',esqueci:'Recuperar senha','nova-senha':'Criar nova senha'}[m];
  const lead={entrar:'Use o e-mail e a senha cadastrados.',primeiro:'Use o e-mail em que você recebeu o convite e crie sua senha.',esqueci:'Enviaremos um link para você criar uma nova senha.','nova-senha':'Digite a nova senha.'}[m];
  $('#auth').innerHTML=`<section class="auth"><div class="auth-box">
   <span class="logo"><i></i>LORSO DIGITAL</span>
   <span class="eyebrow">// Central de <b>Diagnóstico</b></span>
   <h1>${title}</h1><p>${lead}</p>
   ${authMsg?`<div class="msg ${authMsg.ok?'ok':'err'}" role="status">${esc(authMsg.t)}</div>`:''}
   <form id="f-auth" data-mode="${m}">
    ${m!=='nova-senha'?`<label>E-mail<input name="email" type="email" autocomplete="email" value="${esc(authEmail)}" required></label>`:''}
    ${m!=='esqueci'?`<label>${m==='entrar'?'Senha':'Senha (mínimo 8 caracteres)'}<input name="senha" type="password" autocomplete="${m==='entrar'?'current-password':'new-password'}" minlength="${m==='entrar'?1:8}" required></label>`:''}
    <button class="btn primary" type="submit">${{entrar:'Entrar',primeiro:'Criar minha senha',esqueci:'Enviar link','nova-senha':'Salvar senha'}[m]}</button>
   </form>
   <div class="auth-links">${m!=='entrar'?`<button data-act="auth-mode" data-v="entrar">Já tenho senha</button>`:''}${m!=='primeiro'&&m!=='nova-senha'?`<button data-act="auth-mode" data-v="primeiro">Primeiro acesso</button>`:''}${m==='entrar'?`<button data-act="auth-mode" data-v="esqueci">Esqueci a senha</button>`:''}</div>
  </div></section>`;
  const f=document.querySelector(authEmail?'#f-auth input[name=senha]':'#f-auth input')||document.querySelector('#f-auth input'); f&&f.focus();
}
function authErr(e){
  const s=(e&&e.message)||'';
  if(/Invalid login credentials/i.test(s))return 'E-mail ou senha incorretos. Se é a sua primeira vez aqui, clique em "Primeiro acesso" para criar a senha.';
  if(/Email not confirmed/i.test(s))return 'Confirme seu e-mail pelo link que enviamos antes de entrar.';
  if(/convidado|Database error saving new user/i.test(s))return 'Este e-mail ainda não foi convidado. Peça o convite à LORSO Digital.';
  if(/already registered|already been registered/i.test(s))return 'Este e-mail já tem senha. Use "Já tenho senha" ou "Esqueci a senha".';
  if(/Password should be/i.test(s))return 'A senha precisa ter pelo menos 8 caracteres.';
  if(/rate limit/i.test(s))return 'Muitas tentativas. Aguarde alguns minutos e tente de novo.';
  return 'Não foi possível concluir: '+s;
}
async function submitAuth(f){
  const fd=new FormData(f), email=String(fd.get('email')||'').trim().toLowerCase(), senha=String(fd.get('senha')||''), m=f.dataset.mode;
  const btn=f.querySelector('button'); btn.disabled=true; authMsg=null; if(email)authEmail=email;
  try{
    if(m==='entrar'){ const r=await sb.auth.signInWithPassword({email,password:senha}); if(r.error)throw r.error; }
    else if(m==='primeiro'){ const r=await sb.auth.signUp({email,password:senha,options:{emailRedirectTo:BASE()}}); if(r.error)throw r.error;
      if(!r.data.session){ authMode='entrar'; authMsg={ok:1,t:`Enviamos um e-mail de confirmação para ${email}. Clique no link e depois entre com sua senha.`}; renderAuth(); } }
    else if(m==='esqueci'){ const r=await sb.auth.resetPasswordForEmail(email,{redirectTo:BASE()}); if(r.error)throw r.error; authMode='entrar'; authMsg={ok:1,t:'Se o e-mail tiver acesso, você vai receber o link em instantes.'}; renderAuth(); }
    else if(m==='nova-senha'){ const r=await sb.auth.updateUser({password:senha}); if(r.error)throw r.error; authMode='entrar'; authMsg=null; const s=await sb.auth.getSession(); if(s.data.session) start(s.data.session); }
  }catch(e){ authMsg={t:authErr(e)}; renderAuth(); }
  btn.disabled=false;
}
let started=false;
async function start(session){
  if(started)return; started=true;
  $('#auth').hidden=true; $('#app').hidden=false; $('#main').innerHTML='<p class="loading">Carregando…</p>';
  try{
    const p=ok(await sb.from('profiles').select('*').eq('id',session.user.id).maybeSingle());
    if(!p||!p.ativo){ started=false; await sb.auth.signOut(); authMode='entrar'; authMsg={t:'Seu acesso não está ativo. Fale com a LORSO Digital.'}; showAuth(); return; }
    me=p; await Promise.all([loadList(),loadTeam()]);
    let id=lsGet('cd.last'); if(!all[id]) id=Object.keys(all)[0];
    if(id) await openDiag(id); else { cur=null; render(); }
  }catch(e){ console.error(e); $('#main').innerHTML='<p class="loading">Não foi possível carregar. Recarregue a página.</p>'; started=false; }
}
async function boot(){
  sb.auth.onAuthStateChange((ev,session)=>{
    if(ev==='PASSWORD_RECOVERY'){ authMode='nova-senha'; authMsg=null; started=false; showAuth(); return; }
    if(ev==='SIGNED_OUT'){ started=false; me=null; cur=null; snap=null; if(channel){sb.removeChannel(channel);channel=null;} showAuth(); return; }
    if((ev==='SIGNED_IN'||ev==='INITIAL_SESSION')&&session&&authMode!=='nova-senha') setTimeout(()=>start(session),0);
    if(ev==='INITIAL_SESSION'&&!session) showAuth();
  });
}

/* ================= EVENTOS ================= */
const reduced=()=>window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function toast(t){const el=$('#toast'); el.textContent=t; el.hidden=false; clearTimeout(toast.t); toast.t=setTimeout(()=>el.hidden=true,2600);}
function go(view){ ui.view=view; ui.copy=null; saveUi(); render(); window.scrollTo({top:0}); }
function genFromInsight(i){ const have=new Set(cur.acoes.map(a=>a.txt)); let n=0; i.rec.forEach(t=>{ if(!have.has(t)){ newTask({txt:t,area:i.areas[0]||'',origem:i.id}); n++; } }); return n; }
function copyText(txt,okMsg){ try{ navigator.clipboard.writeText(txt).then(()=>toast(okMsg),()=>{ui.copy=txt;render();}); }catch(e){ ui.copy=txt; render(); } }

document.addEventListener('click',e=>{
  const b=e.target.closest('[data-act]'); if(!b)return; const act=b.dataset.act, d=b.dataset;
  if(act==='auth-mode'){ authMode=d.v; authMsg=null; renderAuth(); return; }
  if(act==='sair'){ flush(); sb.auth.signOut(); return; }
  if(act==='view'){ go(d.v); return; }
  if(act==='novo'){ ui.novo=true; renderBar(); setTimeout(()=>{const i=$('#novo-nome');i&&i.focus();},0); return; }
  if(act==='novo-cancel'){ ui.novo=false; renderBar(); return; }
  if(act==='conv-copy'){ const c=convites.find(x=>x.email===d.email); if(c) copyText(conviteTexto(c),'Convite copiado'); return; }
  if(act==='conv-del'){ (async()=>{ const r=await sb.from('convites').delete().eq('email',d.email); if(r.error){toast('Não foi possível cancelar');return;} await loadTeam(); render(); toast('Convite cancelado'); })(); return; }
  if(act==='mem-off'){ (async()=>{ const r=await sb.from('profiles').update({ativo:false}).eq('id',d.id); if(r.error){toast('Não foi possível desativar');return;} await loadTeam(); render(); toast('Acesso desativado'); })(); return; }
  if(!cur) return;
  if(act==='stage'){ ui.view='fases'; ui.stage=d.v; ui.copy=null; saveUi(); render(); window.scrollTo({top:0}); }
  else if(act==='area'||act==='goto'){ ui.view='fases'; if(AREA[d.v]||d.v==='direcionamentos'){ui.stage='diagnostico';ui.area=d.v;ui.dstep=stepOf(d.v);} else if(STG[d.v]) ui.stage=d.v; saveUi(); render(); window.scrollTo({top:0}); }
  else if(act==='iv-start'){ const a=AREA[d.v]; const first=a.q.findIndex(q=>!cur.resp[q[0]]); ui.iv={area:d.v,i:first<0?0:first}; render(); }
  else if(act==='iv-exit'){ ui.area=ui.iv?ui.iv.area:ui.area; ui.iv=null; render(); }
  else if(act==='iv-go'){ if(ui.iv){ ui.iv.i=Math.max(0,+d.v); render(); } }
  else if(act==='iv-area'){ const a=AREA[d.v]; const first=a.q.findIndex(q=>!cur.resp[q[0]]); ui.iv={area:d.v,i:first<0?0:first}; ui.area=d.v; ui.dstep=stepOf(d.v); saveUi(); render(); }
  else if(act==='iv-pick'){ const q=d.q,n=+d.n; const was=cur.resp[q]; if(was===n)delete cur.resp[q]; else cur.resp[q]=n; autoTasks(); touch(true); if(was!==n&&ui.iv){ const a=AREA[ui.iv.area]; clearTimeout(ui.ivT); ui.ivT=setTimeout(()=>{ if(!ui.iv)return; ui.iv.i=Math.min(a.q.length,ui.iv.i+1); render(); },reduced()?0:280); } }
  else if(act==='dstep'){ ui.view='fases'; ui.stage='diagnostico'; ui.dstep=d.v; if(d.v==='reitoria'&&!LID.some(a=>a.id===ui.area)&&ui.area!=='direcionamentos')ui.area='reitoria'; if(d.v==='entrevistas'&&!ENT.some(a=>a.id===ui.area))ui.area=jornadaLista()[0].id; saveUi(); render(); window.scrollTo({top:0}); }
  else if(act==='curso-add'){ cur.cursos.push({id:uid(),un:'',nome:'',modalidade:'',turno:'',preco:'',vagas:'',matriculados:'',status:'Vigente',lancamento:'',obs:''}); touch(true); const els=document.querySelectorAll('[data-curso][data-f="nome"]'); els.length&&els[els.length-1].focus(); }
  else if(act==='curso-del'){ cur.cursos=cur.cursos.filter(c=>c.id!==d.id); touch(true); }
  else if(act==='curso-ler'){ ui.cursoTxt=($('#curso-txt')||{}).value||''; ui.cursoPreview=cursoParse(ui.cursoTxt); render(); }
  else if(act==='curso-aplicar'){ const pv=ui.cursoPreview||[]; cur.cursos.push(...pv); ui.cursoPreview=null; ui.cursoTxt=''; touch(true); toast(`${pv.length} cursos adicionados`); }
  else if(act==='jornada-toggle'){ let L=jornadaIds(); L=L.includes(d.v)?L.filter(x=>x!==d.v):[...L,d.v]; if(L.length)cur.campos['jornada.ordem']=L.join('|'); else delete cur.campos['jornada.ordem']; touch(true); }
  else if(act==='jornada-up'){ const L=jornadaIds(); const i=L.indexOf(d.v); if(i>0){ [L[i-1],L[i]]=[L[i],L[i-1]]; cur.campos['jornada.ordem']=L.join('|'); touch(true);} }
  else if(act==='jornada-tarefas'){ let n=0; jornadaIds().forEach(id=>{ if(cur.acoes.some(t=>t.origem==='coleta:'+id))return; const quem=cur.campos['jornada.'+id+'.quem']; newTask({txt:`Entrevistar ${quem||'responsável'} · ${AREA[id].nome}`,area:id,origem:'coleta:'+id,prazo:cur.campos['jornada.'+id+'.data']||''}); n++; }); touch(true); toast(n?`${n} entrevistas criadas no kanban`:'As entrevistas já estão no kanban'); }
  else if(act==='opt'){
    const q=d.q, n=+d.n, wasEmpty=!cur.resp[q];
    if(cur.resp[q]===n)delete cur.resp[q]; else cur.resp[q]=n;
    autoTasks(); touch(true);
    if(wasEmpty&&cur.resp[q]){ const box=STG[QAREA[q]]&&!AREA[QAREA[q]]?STG[QAREA[q]]:AREA[QAREA[q]]; const qs=box.q; const i=qs.findIndex(x=>x[0]===q);
      const nx=qs.slice(i+1).find(x=>!cur.resp[x[0]]); if(nx){ const el=document.getElementById('q-'+nx[0]); if(el){ const r=el.getBoundingClientRect(); if(r.top>window.innerHeight*0.7||r.top<0) el.scrollIntoView({block:'center',behavior:reduced()?'auto':'smooth'}); } } }
  }
  else if(act==='note'){ ui.notesOpen[d.q]=true; render(); const t=document.querySelector(`[data-nota="${d.q}"]`); t&&t.focus(); }
  else if(act==='ent-add'){ cur.entrevistas.push({id:uid(),area:d.area,nome:'',cargo:'',depto:nameOf(d.area),data:today()}); touch(true); const els=document.querySelectorAll('[data-ent][data-f="nome"]'); els.length&&els[els.length-1].focus(); }
  else if(act==='ent-del'){ cur.entrevistas.splice(+d.i,1); touch(true); }
  else if(act==='unx'){ const key=unxKey(d.un,d.k); if(d.multi){ let L=(cur.campos[key]||'').split('|').filter(Boolean); if(L.includes(d.v)) L=L.filter(x=>x!==d.v); else { if(L.length>=+d.multi){ toast(`Escolha até ${d.multi} prioridades`); return; } L.push(d.v); } if(L.length)cur.campos[key]=L.join('|'); else delete cur.campos[key]; } else { if(cur.campos[key]===d.v) delete cur.campos[key]; else cur.campos[key]=d.v; } touch(true); }
  else if(act==='dre-go'){ ui.view='fases'; ui.stage='diagnostico'; ui.area='financeiro'; saveUi(); render(); const el=document.getElementById('dre-import'); el&&el.scrollIntoView({block:'start'}); const t=$('#dre-txt'); t&&t.focus({preventScroll:true}); }
  else if(act==='dre-modelo'){ copyText(DRE_MODELO.replace(/;/g,'\t'),'Modelo copiado: cole numa planilha, preencha e cole de volta aqui'); }
  else if(act==='dre-ler'){ ui.dreTxt=($('#dre-txt')||{}).value||''; ui.drePreview=dreParse(ui.dreTxt); render(); }
  else if(act==='dre-aplicar'){ const pv=ui.drePreview; if(pv){ pv.out.forEach(x=>{ cur.campos[x.k]=String(x.v); }); const n=pv.out.length; ui.drePreview=null; ui.dreTxt=''; touch(true); toast(`${n} valores da DRE aplicados`); } }
  else if(act==='fofa-sug'){ const k=d.key+'.'+d.k; ui.fofaSug[k]=!ui.fofaSug[k]; render(); }
  else if(act==='fofa-pick'){ cur.fofa[d.key]=cur.fofa[d.key]||{}; const L=(cur.fofa[d.key][d.k]=cur.fofa[d.key][d.k]||[]); if(!L.includes(d.t)){ L.push(d.t); touch(true); } }
  else if(act==='fofa-del'){ const f=cur.fofa[d.key]; if(f&&f[d.k]){ f[d.k].splice(+d.i,1); touch(true);} }
  else if(act==='acao-add'){ newTask({txt:d.txt,area:d.area,origem:d.src||''}); touch(true); toast('Tarefa adicionada ao kanban'); }
  else if(act==='plan-ins'){ computeAll(); const r=runEngine().find(i=>i.id===d.id&&i.t===d.t); if(r){ const n=genFromInsight(r); touch(true); toast(n?`${n} tarefas criadas`:'Essas tarefas já estão no kanban'); } }
  else if(act==='gen-ins'){ computeAll(); let n=0; runEngine().filter(i=>i.sev!=='media').forEach(i=>n+=genFromInsight(i)); touch(true); toast(n?`${n} tarefas criadas a partir das incongruências`:'Nenhuma tarefa nova: as incongruências graves já têm tarefas'); }
  else if(act==='gen-coleta'){ let n=0; AREAS.forEach(a=>{ const done=a.q.every(x=>cur.resp[x[0]]); if(!done&&!cur.acoes.some(t=>t.origem==='coleta:'+a.id)){ newTask({txt:`Coletar dados: ${a.nome} (entrevista 1 a 1)`,area:a.id,origem:'coleta:'+a.id}); n++; } }); autoTasks(); touch(true); toast(n?`${n} tarefas de coleta criadas`:'Todas as áreas já têm tarefa de coleta'); }
  else if(act==='task-new'){ const t=newTask({status:d.col||'A fazer',area:d.area||'',txt:d.txt||''}); ui.openTask=t.id; if(ui.view==='fases'&&ui.stage!=='execucao'){ ui.view='tarefas'; saveUi(); } touch(true); const ta=document.querySelector(`.kedit textarea[data-id="${t.id}"]`); if(ta){ ta.focus(); ta.scrollIntoView({block:'center'}); } }
  else if(act==='task-open'){ ui.openTask=d.id; render(); const ta=document.querySelector(`.kedit textarea[data-id="${d.id}"]`); ta&&ta.focus(); }
  else if(act==='task-close'){ ui.openTask=null; render(); }
  else if(act==='task-del'){ cur.acoes=cur.acoes.filter(t=>t.id!==d.id); ui.openTask=null; touch(true); }
  else if(act==='tasks-area'){ ui.kf={dono:'',area:d.v}; go('tarefas'); }
  else if(act==='tasks-mem'){ ui.kf={dono:d.id,area:''}; go('tarefas'); }
  else if(act==='kf-clear'){ ui.kf={dono:'',area:''}; render(); }
  else if(act==='teste-new'){ cur.testes.push({id:uid(),hip:'',area:'',i:'',c:'',f:''}); touch(true); }
  else if(act==='teste-del'){ cur.testes.splice(+d.i,1); touch(true); }
  else if(act==='kpi-add'){ cur.kpis.push({id:uid(),nome:d.n,un:'',meta:'',real:''}); touch(true); }
  else if(act==='kpi-del'){ cur.kpis.splice(+d.i,1); touch(true); }
  else if(act==='mem-area'){ const a=d.v, id=d.id; if(cur.dono_area[a]===id) delete cur.dono_area[a]; else cur.dono_area[a]=id; syncColetaDono(a); touch(true); }
  else if(act==='copy'){ copyText(summary(),'Resumo copiado'); }
  else if(act==='copy-close'){ ui.copy=null; render(); }
  else if(act==='dor-del'){ cur.dores=cur.dores.filter(x=>x.id!==d.id); touch(true); }
  else if(act==='dor-task'){ const x=cur.dores.find(y=>y.id===d.id); if(x){ newTask({txt:'Resolver: '+x.txt,area:x.area,origem:'dor:'+x.id}); touch(true); toast('Tarefa criada no kanban'); } }
  else if(act==='dor-filter'){ ui.dorF.etapa=ui.dorF.etapa===d.v?'':d.v; render(); }
  else if(act==='dor-farea'){ ui.dorF.area=ui.dorF.area===d.v?'':d.v; render(); }
  else if(act==='sys-add'){ const x={id:uid(),nome:d.n,uso:'',quem:'',satisf:'',integra:'',custo:'',prob:''}; cur.sistemas.push(x); touch(true); const i=document.querySelector(`[data-sys="${x.id}"][data-f="${d.n?'uso':'nome'}"]`); i&&i.focus(); }
  else if(act==='sys-del'){ cur.sistemas=cur.sistemas.filter(x=>x.id!==d.id); touch(true); }
});
function syncColetaDono(areaId){ const t=cur.acoes.find(x=>x.origem==='coleta:'+areaId&&x.status!=='Concluída'); if(t){ t.dono=cur.dono_area[areaId]||''; } }

document.addEventListener('submit',e=>{
  e.preventDefault(); const f=e.target;
  if(f.id==='f-auth'){ submitAuth(f); return; }
  if(f.id==='f-novo'){ const nm=$('#novo-nome').value.trim(); if(nm) createDiag(nm); return; }
  if(f.id==='f-novo2'){ const nm=$('#novo-nome2').value.trim(); if(nm) createDiag(nm); return; }
  if(f.id==='f-iv-ent'&&cur&&ui.iv){ const fd=new FormData(f); const nome=String(fd.get('nome')||'').trim(); if(!nome)return; cur.entrevistas.push({id:uid(),area:ui.iv.area,nome,cargo:String(fd.get('cargo')||'').trim(),depto:nameOf(ui.iv.area),data:today()}); f.reset(); touch(true); toast('Entrevistado registrado'); return; }
  if(f.id==='f-convite'){ const fd=new FormData(f); const c={email:String(fd.get('email')||'').trim().toLowerCase(),nome:String(fd.get('nome')||'').trim(),funcao:String(fd.get('funcao')||'').trim()||null,papel:fd.get('papel'),convidado_por:me.id};
    (async()=>{ const r=await sb.from('convites').upsert(c); if(r.error){ toast('Não foi possível convidar: '+r.error.message); return; } f.reset(); await loadTeam(); render(); copyText(conviteTexto(c),'Convite registrado e texto copiado'); })(); return; }
  if(!cur) return;
  if(f.dataset.dorform){ const fd=new FormData(f); const txt=String(fd.get('txt')||'').trim(); if(!txt)return; const preset=f.dataset.area;
    const dor={id:uid(),txt,area:preset||String(fd.get('area')||''),etapa:fd.get('etapa'),tipo:fd.get('tipo'),sev:fd.get('sev'),freq:fd.get('freq'),quem:String(fd.get('quem')||'').trim(),sistema:fd.get('sistema')||'',data:today()};
    f.querySelector('.dtxt').value=''; cur.dores.push(dor); ui.dorDef={...ui.dorDef,etapa:dor.etapa,tipo:dor.tipo,sev:dor.sev,freq:dor.freq,quem:dor.quem,sistema:dor.sistema,...(preset?{}:{area:dor.area})};
    touch(true); toast('Dor registrada'); const n=document.querySelector(`form[data-dorform][data-area="${preset||''}"] .dtxt`); n&&n.focus(); return; }
  if(f.dataset.fofa){ const inp=f.querySelector('input'); const t=inp.value.trim(); if(!t)return; inp.value=''; const key=f.dataset.fofa,k=f.dataset.k; cur.fofa[key]=cur.fofa[key]||{}; (cur.fofa[key][k]=cur.fofa[key][k]||[]).push(t); touch(true); const n=document.querySelector(`form[data-fofa="${key}"][data-k="${k}"] input`); n&&n.focus(); }
});
document.addEventListener('input',e=>{
  const t=e.target, d=t.dataset;
  if(d.mem!=null){ const p=profiles.find(x=>x.id===d.mem); if(p){ const f={nome:'nome',papel:'funcao',contato:'contato'}[d.f]; p[f]=t.value; if(cur)cur.equipe=equipeList(); saveProfile(p.id); } return; }
  if(!cur) return;
  if(d.nota!=null){ if(t.value)cur.notas[d.nota]=t.value; else delete cur.notas[d.nota]; autoGrow(t); touch(false); }
  else if(d.campo!=null){ if(t.value)cur.campos[d.campo]=t.value; else delete cur.campos[d.campo]; if(t.tagName==='TEXTAREA')autoGrow(t); touch(false); }
  else if(t.id==='nome-diag'){ cur.nome=t.value||'Sem nome'; touch(false); }
  else if(d.ent!=null&&t.type!=='date'){ cur.entrevistas[+d.ent][d.f]=t.value; touch(false); }
  else if(d.taskF==='txt'){ const x=cur.acoes.find(a=>a.id===d.id); if(x){ x.txt=t.value; autoGrow(t); touch(false); } }
  else if(d.teste!=null&&(d.f==='hip'||d.f==='area')){ cur.testes[+d.teste][d.f]=t.value; touch(false); }
  else if(d.kpi!=null&&(d.f==='nome'||d.f==='un')){ cur.kpis[+d.kpi][d.f]=t.value; touch(false); }
  else if(d.sys!=null&&t.tagName==='INPUT'){ const x=cur.sistemas.find(y=>y.id===d.sys); if(x){ x[d.f]=t.value; touch(false); } }
  else if(d.curso!=null&&t.tagName==='INPUT'){ const x=cur.cursos.find(y=>y.id===d.curso); if(x){ x[d.f]=t.value; touch(false); } }
});
document.addEventListener('change',e=>{
  const t=e.target, d=t.dataset;
  if(!cur) return;
  if(t.id==='sel-diag'){ openDiag(t.value); }
  else if(t.id==='area-sel'){ ui.area=t.value; saveUi(); render(); window.scrollTo({top:0}); }
  else if(t.id==='kf-dono'){ ui.kf.dono=t.value; render(); }
  else if(t.id==='kf-area'){ ui.kf.area=t.value; render(); }
  else if(d.evid!=null){ if(t.checked)cur.evid[d.evid]=true; else delete cur.evid[d.evid]; touch(false); }
  else if(d.campo!=null){ touch(false); soon(); }
  else if(d.ent!=null&&t.type==='date'){ cur.entrevistas[+d.ent].data=t.value; touch(false); }
  else if(d.taskF&&d.taskF!=='txt'){ const x=cur.acoes.find(a=>a.id===d.id); if(x){ x[d.taskF]=t.value; touch(false); } }
  else if(d.donoArea!=null){ if(t.value)cur.dono_area[d.donoArea]=t.value; else delete cur.dono_area[d.donoArea]; syncColetaDono(d.donoArea); touch(true); }
  else if(d.teste!=null&&['i','c','f'].includes(d.f)){ cur.testes[+d.teste][d.f]=t.value; touch(false); soon(); }
  else if(d.kpi!=null&&(d.f==='meta'||d.f==='real')){ cur.kpis[+d.kpi][d.f]=t.value; touch(false); soon(); }
  else if(d.sys!=null){ const x=cur.sistemas.find(y=>y.id===d.sys); if(x){ x[d.f]=t.value; touch(false); soon(); } }
  else if(d.curso!=null){ const x=cur.cursos.find(y=>y.id===d.curso); if(x){ x[d.f]=t.value; touch(false); soon(); } }
});
document.addEventListener('focusout',()=>{ setTimeout(()=>{ if(!isTyping()&&(pendingData||pendingRemote))adoptRemote(); },0); });
window.addEventListener('pagehide',()=>{ if(ver!==savedVer) flush(); });
window.addEventListener('beforeunload',e=>{ if(ver!==savedVer){ flush(); e.preventDefault(); e.returnValue=''; } });
boot();
