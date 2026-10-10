/* =====================================================================
   Plano de ação · do diagnóstico conclusivo para ações com dono e meta
   Biblioteca de jogadas, sugestões a partir dos cruzamentos, checagem
   das premissas, capacidade do time, aprovação e envio para a Execução.
   Guardado em campos: pa.itens (JSON), pa.cap, pa.aprov (JSON), pa.revisao, pa.enviado.
   Carregado depois de app.js.
   ===================================================================== */
ICO.plano='M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11';

/* ---------- linhas de base: o número de hoje, vindo do próprio diagnóstico ---------- */
const PA_KPI={
 retrabalho:['Peças com retrabalho','%',()=>V('fluxo','retrabalho'),'menor'],
 satisf:['Satisfação dos solicitantes (0 a 10)','n',()=>V('relacionamento','satisf'),'maior'],
 sla_ok:['Demandas entregues no prazo combinado','%',()=>{const s=slaStats();return s&&s.pOk!=null?Math.round(s.pOk*100):V('demandas','no_prazo');},'maior'],
 urgentes:['Pedidos marcados como urgentes','%',()=>V('demandas','urgentes'),'menor'],
 dias_etapa:['Dias do pedido à entrega','d',()=>{const s=etapaStats();return s?s.tot:V('demandas','prazo_medio');},'menor'],
 adm:['Tempo do marketing no administrativo','%',()=>{const s=tempoStats();return s&&s.completo?Math.round(s.pAdm*100):null;},'menor'],
 prazo_medio:['Prazo médio de entrega','d',()=>V('demandas','prazo_medio'),'menor'],
 speed:['Tempo até o primeiro contato com o lead','min',()=>V('smarketing','speed'),'menor'],
 conv_insc:['Conversão de inscrito em matrícula','%',()=>V('smarketing','conv_insc'),'maior'],
 com_prazo:['Pedidos do comercial entregues no prazo','%',()=>V('smarketing','dem_com_prazo'),'maior'],
 sem_etapa:['Leads sem etapa atualizada no CRM','%',()=>V('crm','sem_etapa'),'menor'],
 manual:['Horas por semana de trabalho manual entre sistemas','n',()=>V('sistemas','horas_manuais'),'menor'],
 cac:['CAC médio de mídia por matrícula','R$',()=>{const g=grpStats();return g&&g.cacM!=null?Math.round(g.cacM):null;},'menor'],
 experimentos:['Experimentos no mês','n',()=>V('growth','experimentos'),'maior'],
 abandono:['Abandono no call center','%',()=>V('callcenter','abandono'),'menor'],
 nivel_mandato:['Nível de Mandato e autonomia','N',()=>L('mandato'),'maior'],
 nivel_relac:['Nível de Atendimento às unidades','N',()=>L('relacionamento'),'maior']
};
const paFmt=(v,u)=>v==null?'—':u==='R$'?brl(v):u==='%'?dec(v,0)+'%':u==='d'?dec(v,v%1?1:0)+' dias':u==='min'?dec(v,0)+' min':u==='N'?'N'+v:dec(v,v%1?1:0);

/* ---------- biblioteca de jogadas ----------
   tipo: destravar (arruma a casa) | acelerar (só depois dos pré-requisitos)
   esf: 1 baixo (≈2 h/semana) · 2 médio (≈5 h) · 3 alto (≈10 h)   imp: 1 a 3
   regras: cruzamentos que sugerem a jogada · bloco: causa raiz · ref: origem do conteúdo */
const PA_ESF_H={1:2,2:5,3:10};
const JOGADAS=[
 {id:'mandato',t:'Mandato por escrito e 3 a 5 indicadores pactuados',o:'Dar ao marketing autonomia formal e uma régua de sucesso combinada com a reitoria.',passos:['Escrever escopo, prazo e o que muda','Escolher de 3 a 5 indicadores com linha de base','Assinatura da reitoria e comunicado às unidades'],bloco:'mandato',regras:['CRZ-37','CRZ-43'],kpi:'nivel_mandato',h:'c',esf:1,imp:3,tipo:'destravar',area:'mandato',ref:'LORSO'},
 {id:'briefing',t:'Briefing padrão por tipo de peça',o:'Toda demanda entra com objetivo, público, prazo e formato definidos.',passos:['Modelo de briefing por tipo de peça','Campos obrigatórios no formulário de pedido','Pedido incompleto volta ao solicitante antes da fila'],bloco:'atendimento',regras:['CRZ-57'],kpi:'retrabalho',h:'c',esf:1,imp:3,tipo:'destravar',area:'fluxo',ref:'LORSO'},
 {id:'ponto_focal',t:'Ponto focal do marketing para cada unidade',o:'Cada coordenador sabe com quem falar e é acompanhado do pedido à entrega.',passos:['Definir um ponto focal por unidade','Apresentar o ponto focal aos coordenadores','Contato de status a cada mudança de etapa'],bloco:'atendimento',regras:['CRZ-58','CRZ-64'],kpi:'satisf',h:'c',esf:1,imp:3,tipo:'destravar',area:'relacionamento',ref:'LORSO'},
 {id:'sla_tipo',t:'SLA por tipo de demanda publicado aos solicitantes',o:'Prazo realista e conhecido para cada tipo de peça, medido todo mês.',passos:['Rever prazos com base no tempo real','Publicar a tabela de SLA às unidades','Medir o cumprimento por tipo e por unidade'],bloco:'atendimento',regras:['CRZ-61','CRZ-58'],kpi:'sla_ok',h:'c',esf:2,imp:3,tipo:'destravar',area:'demandas',ref:'LORSO'},
 {id:'fila_unica',t:'Fila única de pedidos com status visível ao solicitante',o:'Acabar com pedidos por WhatsApp e corredor; todo mundo enxerga a fila.',passos:['Formulário único de pedido','Quadro com etapas e dono por etapa','Solicitante acompanha o status sem precisar cobrar'],bloco:'prioridade',regras:['CRZ-64','CRZ-50','CRZ-23'],kpi:'urgentes',h:'c',esf:2,imp:3,tipo:'destravar',area:'demandas',ref:'LORSO'},
 {id:'prioridade',t:'Regra de prioridade aprovada pela reitoria',o:'Critério escrito de urgência e cota de capacidade por unidade.',passos:['Definir o que é urgência e quem pode declarar','Cota semanal por unidade','Comunicado da reitoria com a regra'],bloco:'prioridade',regras:['CRZ-59','CRZ-23','CRZ-50'],kpi:'urgentes',h:'c',esf:1,imp:3,tipo:'destravar',area:'demandas',ref:'LORSO'},
 {id:'aprovacao',t:'Aprovação com prazo e aprovação tácita',o:'A peça pronta não fica parada esperando quem pediu.',passos:['Aprovador único por pedido','No máximo 2 rodadas','Sem resposta no prazo, a peça segue aprovada'],bloco:'capacidade',regras:['CRZ-60','CRZ-27'],kpi:'dias_etapa',h:'c',esf:1,imp:2,tipo:'destravar',area:'fluxo',ref:'LORSO'},
 {id:'adm',t:'Devolver o administrativo que não é do marketing',o:'Liberar horas do time para as unidades de negócio.',passos:['Listar as tarefas administrativas recorrentes','Devolver ao dono o que é de outras áreas, com aval da reitoria','Bloco fixo semanal para o administrativo que fica'],bloco:'capacidade',regras:['CRZ-53','CRZ-54'],kpi:'adm',h:'c',esf:2,imp:3,tipo:'destravar',area:'demandas',ref:'LORSO'},
 {id:'wip',t:'Triagem do backlog e limite de tarefas em andamento',o:'A fila anda: menos coisas paradas, mais coisas entregues.',passos:['Mutirão: cancelar, adiar ou fazer','Limite de tarefas em andamento por pessoa','Parado há 15 dias volta ao solicitante'],bloco:'capacidade',regras:['CRZ-51','CRZ-52','CRZ-25','CRZ-15'],kpi:'prazo_medio',h:'c',esf:1,imp:2,tipo:'destravar',area:'fluxo',ref:'LORSO'},
 {id:'ritual_un',t:'Encontro mensal com os coordenadores de cada unidade',o:'Relação próxima: planejar junto em vez de receber pedidos em cima da hora.',passos:['Pauta fixa: resultados, pedidos e calendário','Uma reunião por unidade por mês','Ata com os pedidos já planejados'],bloco:'atendimento',regras:['CRZ-58'],kpi:'satisf',h:'m',esf:1,imp:2,tipo:'destravar',area:'relacionamento',ref:'LORSO'},
 {id:'satisf',t:'Avaliação do solicitante a cada entrega',o:'Medir o atendimento pela voz de quem pede, não pela percepção do marketing.',passos:['Três perguntas curtas ao fechar cada pedido','Resultado mensal por unidade','Retorno ao coordenador sobre o que mudou'],bloco:'atendimento',regras:['CRZ-58'],kpi:'satisf',h:'m',esf:1,imp:2,tipo:'destravar',area:'relacionamento',ref:'LORSO'},
 {id:'lead_5min',t:'Primeiro contato com o lead em até 5 minutos',o:'Falar com o interessado enquanto ele ainda está pensando no curso.',passos:['Distribuição automática de leads no CRM','Mensagem de boas-vindas imediata no WhatsApp','Alerta ao consultor e fila para quem passar de 5 minutos'],bloco:'funil',regras:['CRZ-02','CRZ-32'],kpi:'speed',h:'c',esf:2,imp:3,tipo:'destravar',area:'smarketing',ref:'Arquivo RevOps (adaptado)'},
 {id:'sla_comercial',t:'Acordo entre marketing e comercial com retorno de vendas',o:'Só lead qualificado vai ao comercial, e o comercial devolve por que perdeu.',passos:['Definição escrita de lead qualificado por curso','Status atualizado em até 48 h pelo comercial','Motivo de perda e descarte separado em "o marketing pode corrigir" ou "não pode"','Reunião mensal de calibragem'],bloco:'funil',regras:['CRZ-63','CRZ-08','CRZ-17'],kpi:'conv_insc',h:'m',esf:2,imp:3,tipo:'destravar',area:'smarketing',ref:'Arquivo RevOps (adaptado)'},
 {id:'fila_comercial',t:'Fila própria e kit comercial por campanha',o:'O comercial recebe as peças de captação no prazo, sem disputar a fila geral.',passos:['Tipos de peça do comercial com SLA','Kit comercial planejado junto com cada campanha','Revisão mensal com o comercial e o call center'],bloco:'atendimento',regras:['CRZ-63'],kpi:'com_prazo',h:'m',esf:2,imp:2,tipo:'destravar',area:'smarketing',ref:'LORSO'},
 {id:'crm_etapas',t:'Etapas do funil padronizadas no CRM, com motivo de perda',o:'O CRM mostra onde cada lead está e por que os perdidos se perderam.',passos:['Etapas iguais para todas as unidades, com critério de entrada e saída','Motivo de perda obrigatório','Alerta de lead parado'],bloco:'sistemas',regras:['CRZ-33','CRZ-32','CRZ-17'],kpi:'sem_etapa',h:'m',esf:2,imp:3,tipo:'destravar',area:'crm',ref:'LORSO'},
 {id:'base_unica',t:'Base única de leads: integração e deduplicação',o:'Um aluno, um registro, com o histórico de todos os canais.',passos:['Mapear por onde os leads entram','Integrar formulários, WhatsApp e eventos ao CRM','Regra mensal de deduplicação por e-mail, telefone e CPF'],bloco:'sistemas',regras:['CRZ-36','CRZ-28','CRZ-35'],kpi:'manual',h:'m',esf:3,imp:2,tipo:'destravar',area:'sistemas',ref:'Arquivo RevOps (adaptado)'},
 {id:'jornada',t:'Mapa da jornada do aluno e os 4 pontos de contato',o:'Mensagens na ordem certa: inscrição, qualificação, matrícula e boas-vindas ou rematrícula.',passos:['Oficina de jornada com marketing, comercial e call center','Dados obrigatórios em cada ponto de contato','Gatilho no CRM para cada ponto'],bloco:'funil',regras:['CRZ-08','CRZ-14'],kpi:'conv_insc',h:'m',esf:2,imp:3,tipo:'destravar',area:'captacao',ref:'Arquivo RevOps (adaptado)'},
 {id:'painel',t:'Painel executivo: conversão por etapa, CAC e velocidade do funil',o:'A reitoria acompanha resultado de verdade, não volume de postagens.',passos:['Conversão por etapa (lead, inscrito, matrícula)','CAC por canal e por grupo de cursos','Velocidade do funil em dias','Atualização automática e revisão mensal'],bloco:'sistemas',regras:['CRZ-05','CRZ-06','CRZ-13'],kpi:'cac',h:'m',esf:2,imp:3,tipo:'destravar',area:'growth',ref:'Arquivo RevOps (adaptado)'},
 {id:'governanca',t:'Governança mensal das automações',o:'Fluxos automáticos sem link quebrado, oferta vencida ou dono sumido.',passos:['Um dono para cada fluxo automático','Revisão mensal de links, gatilhos e integrações','Limpeza da base sem interação há 90 a 180 dias'],bloco:'sistemas',regras:['CRZ-33'],kpi:'manual',h:'m',esf:1,imp:2,tipo:'destravar',area:'crm',ref:'Arquivo RevOps (adaptado)'},
 {id:'ferramenta',t:'Escolha de ferramenta de automação por critérios',o:'Ferramenta certa para a maturidade do time, sem pagar por o que não se usa.',passos:['Critérios: idioma e suporte em português, integração com o CRM, preço em reais, curva de aprendizado','Comparar 2 ou 3 opções com cotação atual','Piloto de 30 dias antes de contratar'],bloco:'sistemas',regras:['CRZ-35','CRZ-10'],kpi:'manual',h:'m',esf:2,imp:2,tipo:'destravar',area:'sistemas',ref:'Arquivo RevOps (adaptado)'},
 {id:'recupera',t:'Recuperação de inscrito que não pagou a matrícula',o:'Trazer de volta quem começou a matrícula e parou.',passos:['WhatsApp em 15 minutos perguntando se houve problema','E-mail em 24 h com benefícios e depoimentos','Último contato em 48 h com prazo ou condição especial'],bloco:'funil',regras:['CRZ-32','CRZ-49'],kpi:'conv_insc',h:'c',esf:1,imp:3,tipo:'acelerar',pre:['lead_5min'],area:'captacao',ref:'Arquivo RevOps (adaptado)'},
 {id:'score',t:'Pontuação de leads por perfil e engajamento',o:'O comercial fala primeiro com quem tem perfil e interesse.',passos:['Perfil: curso, escolaridade, região e forma de ingresso','Engajamento: visita, simulador, evento e inscrição','Teste com 100 a 500 leads antigos antes de ligar','Calibragem mensal com o comercial'],bloco:'funil',regras:['CRZ-17','CRZ-08'],kpi:'conv_insc',h:'l',esf:3,imp:3,tipo:'acelerar',pre:['crm_etapas','sla_comercial'],area:'crm',ref:'Arquivo RevOps (adaptado)'},
 {id:'verba_grupos',t:'Rever a verba dos grupos de campanha com CAC alto',o:'Mover verba para onde ela vira matrícula.',passos:['Comparar % da verba com % das matrículas por grupo','Separar em campanha própria os cursos que convertem','Revisão quinzenal de CPL, CPA e CAC'],bloco:'receita',regras:['CRZ-62','CRZ-18','CRZ-20'],kpi:'cac',h:'c',esf:1,imp:3,tipo:'acelerar',pre:['painel'],area:'growth',ref:'LORSO'},
 {id:'calendario',t:'Calendário anual de campanhas com as unidades',o:'Ritmo planejado em vez de campanha quando a matrícula cai.',passos:['Datas-chave por unidade (vestibular, rematrícula, pós)','Campanhas e peças previstas com antecedência','Revisão trimestral com as unidades'],bloco:'prioridade',regras:['CRZ-23','CRZ-41'],kpi:'urgentes',h:'m',esf:2,imp:2,tipo:'destravar',area:'growth',ref:'LORSO'},
 {id:'testes',t:'Rotina de experimentos com cadência quinzenal',o:'Aprender toda quinzena o que converte mais.',passos:['Lista de hipóteses priorizada','Um teste por quinzena com métrica definida','Registro do que funcionou e do que não'],bloco:'receita',regras:['CRZ-05'],kpi:'experimentos',h:'m',esf:2,imp:2,tipo:'acelerar',pre:['painel'],area:'growth',ref:'LORSO'},
 {id:'ocupacao',t:'Plano de ocupação dos cursos com vagas ociosas',o:'Encher as turmas que já existem antes de abrir cursos novos.',passos:['Mapa de vagas e ocupação por curso','Campanha dedicada aos cursos com vaga','Meta de ocupação por curso'],bloco:'receita',regras:['CRZ-40','CRZ-19','CRZ-49'],kpi:'conv_insc',h:'m',esf:2,imp:3,tipo:'acelerar',pre:['painel'],area:'captacao',ref:'LORSO'},
 {id:'perpetuo',t:'Funil perpétuo para pós e cursos livres',o:'Captação contínua com produto de entrada que paga parte da mídia.',passos:['Produto de entrada (aula, guia ou diagnóstico de carreira)','Oferta do curso logo após a compra','Recuperação de quem abandonou o pagamento'],bloco:'receita',regras:[],kpi:'cac',h:'l',esf:3,imp:2,tipo:'acelerar',pre:['jornada','painel'],area:'pos',ref:'Arquivo RevOps (adaptado)'}
];
const JOG=Object.fromEntries(JOGADAS.map(j=>[j.id,j]));
const PA_PREMISSAS=['Toda ação nasce de uma evidência','No máximo 3 ações por causa raiz em cada horizonte','Arrumar a casa antes de acelerar','Linha de base e meta em cada ação','O plano cabe na capacidade do time','Ganhos rápidos nos primeiros 30 dias','Dono do lado da instituição em cada ação','Custo estimado em cada ação','Aprovação formal da reitoria','Revisão mensal marcada'];

/* ---------- estado ---------- */
function paItens(){ try{ const v=JSON.parse(cur.campos['pa.itens']||'[]'); return Array.isArray(v)?v:[]; }catch(e){ return []; } }
function paSet(L){ cur.campos['pa.itens']=JSON.stringify(L); touch(false); }
function paAprov(){ try{ return JSON.parse(cur.campos['pa.aprov']||'null'); }catch(e){ return null; } }
const paBase=k=>{ const K=PA_KPI[k]; if(!K)return null; try{ const v=K[2](); return v==null||!isFinite(v)?null:v; }catch(e){ return null; } };
function paCapacidade(){ const m=num(cur.campos['pa.cap']); if(m!=null)return {h:m,fonte:'informada'}; const s=tempoStats(); return s&&s.tot?{h:Math.round(s.tot*0.2),fonte:'20% das horas do time'}:{h:null,fonte:''}; }
function paSugestoes(INS){ const ids=new Set(INS.map(i=>i.id)), B=blocosDe(INS), bl=new Set(B.map(b=>b.id)), ja=new Set(paItens().map(x=>x.j));
  return JOGADAS.map(j=>{ const por=INS.filter(i=>j.regras.includes(i.id)); const forte=por.length>0; const rel=!forte&&bl.has(j.bloco); return {j,por,forte,rel,no:ja.has(j.id),peso:(forte?10:0)+(rel?2:0)+j.imp*2+(j.tipo==='destravar'?1:0)-j.esf}; })
    .filter(s=>s.forte||s.rel).sort((a,b)=>b.peso-a.peso); }
function paNovo(j,motivo){ const J=JOG[j]; return {id:uid(),j,h:J.h,dono:'',prazo:addDias(J.h==='c'?(J.esf===1?30:90):J.h==='m'?180:365),base:'',meta:'',custo:'',horas:String(PA_ESF_H[J.esf]),motivo:motivo||''}; }

/* ---------- checagem das premissas ---------- */
function paChecagem(INS){
  const L=paItens(), ids=new Set(INS.map(i=>i.id)), no=new Set(L.map(x=>x.j)), cap=paCapacidade(), ap=paAprov();
  const semEvid=L.filter(x=>!JOG[x.j].regras.some(r=>ids.has(r))&&!(x.motivo||'').trim());
  const excesso=[]; const g={}; L.forEach(x=>{ const k=JOG[x.j].bloco+'|'+x.h; g[k]=(g[k]||0)+1; }); Object.entries(g).forEach(([k,n])=>{ if(n>3)excesso.push(k); });
  const semPre=L.filter(x=>(JOG[x.j].pre||[]).some(p=>!no.has(p)));
  const semMeta=L.filter(x=>!(String(x.meta||'').trim())||(x.base===''&&paBase(JOG[x.j].kpi)==null));
  const hCurto=L.filter(x=>x.h==='c').reduce((a,x)=>a+(num(x.horas)||0),0);
  const rapidos=L.filter(x=>x.h==='c'&&x.prazo&&x.prazo<=addDias(30)).length;
  const semDono=L.filter(x=>!(x.dono||'').trim()), semCusto=L.filter(x=>x.custo===''||x.custo==null);
  const v=(ok,txt)=>({ok,txt});
  return [
   v(L.length&&!semEvid.length,semEvid.length?`${pl(semEvid.length,'ação não está ligada','ações não estão ligadas')} a um cruzamento do diagnóstico. Escreva o motivo ou retire.`:'Todas as ações vêm de um cruzamento do diagnóstico ou têm motivo escrito.'),
   v(L.length&&!excesso.length,excesso.length?'Há causa raiz com mais de 3 ações no mesmo horizonte. Escolha as que mais mexem no indicador.':'Nenhuma causa raiz passa de 3 ações por horizonte.'),
   v(L.length&&!semPre.length,semPre.length?`${semPre.map(x=>JOG[x.j].t).join('; ')}: falta o pré-requisito (${[...new Set(semPre.flatMap(x=>(JOG[x.j].pre||[]).filter(p=>!no.has(p)).map(p=>JOG[p].t)))].join('; ')}).`:'Toda ação de aceleração tem o pré-requisito no plano.'),
   v(L.length&&!semMeta.length,semMeta.length?`${pl(semMeta.length,'ação sem','ações sem')} meta ou linha de base.`:'Todas as ações têm linha de base e meta.'),
   v(cap.h!=null&&hCurto<=cap.h,cap.h==null?'Informe as horas por semana livres para o plano (ou preencha o tempo do marketing em Gestão de demandas).':hCurto<=cap.h?`O curto prazo pede ${dec(hCurto,0)} h por semana de ${dec(cap.h,0)} disponíveis.`:`O curto prazo pede ${dec(hCurto,0)} h por semana, mas só há ${dec(cap.h,0)} disponíveis. Adie ações ou libere horas antes.`),
   v(rapidos>=2,rapidos>=2?`${rapidos} ações entregam nos primeiros 30 dias.`:`Só ${rapidos} ${rapidos===1?'ação entrega':'ações entregam'} nos primeiros 30 dias. O ideal são 2 ou 3 ganhos rápidos.`),
   v(L.length&&!semDono.length,semDono.length?`${pl(semDono.length,'ação sem','ações sem')} dono da instituição.`:'Todas as ações têm dono.'),
   v(L.length&&!semCusto.length,semCusto.length?`${pl(semCusto.length,'ação sem','ações sem')} custo estimado (use 0 quando não houver custo).`:'Todas as ações têm custo estimado.'),
   v(!!(ap&&ap.por),ap&&ap.por?`Aprovado por ${ap.por}${ap.data?' em '+ap.data.split('-').reverse().join('/'):''}.`:'Ainda não aprovado pela reitoria.'),
   v(!!cur.campos['pa.revisao'],cur.campos['pa.revisao']?`Primeira revisão em ${cur.campos['pa.revisao'].split('-').reverse().join('/')}.`:'Marque a data da primeira revisão mensal.')]; }

/* ---------- telas ---------- */
const PA_H={c:['Curto prazo','0 a 3 meses'],m:['Médio prazo','3 a 6 meses'],l:['Longo prazo','6 a 12 meses']};
function paChips(J){ const b=BLOCOS.find(x=>x.id===J.bloco); return `<span class="tag ${J.tipo==='acelerar'?'hz-m':'hz-c'}">${J.tipo==='acelerar'?'Acelerar':'Destravar'}</span>${b?`<span class="tag">${esc(b.t.length>42?b.t.slice(0,41)+'…':b.t)}</span>`:''}${J.ref!=='LORSO'?`<span class="tag" title="Conteúdo do arquivo de RevOps, adaptado para educação">RevOps adaptado</span>`:''}`; }
function paItemHtml(x,no){ const J=JOG[x.j], K=PA_KPI[J.kpi], b=paBase(J.kpi), falta=(J.pre||[]).filter(p=>!no.has(p));
  return `<div class="pai ${falta.length?'warn':''}"><div class="pah"><div><b>${esc(J.t)}</b><div class="ktags">${paChips(J)}</div></div><button class="xbtn" data-act="pa-del" data-v="${x.id}" aria-label="Retirar do plano">×</button></div>
   ${falta.length?`<p class="pawarn">${ico('alerta',14)} Antes, inclua: ${falta.map(p=>`<button class="lnk" data-act="pa-add" data-v="${p}">${esc(JOG[p].t)}</button>`).join(' · ')}</p>`:''}
   <div class="paf">
    <label>Dono na instituição<input data-pa="${x.id}" data-f="dono" value="${esc(x.dono)}" list="pa-pessoas" placeholder="Nome"></label>
    <label>Horizonte<select data-pa="${x.id}" data-f="h">${Object.entries(PA_H).map(([k,[n]])=>`<option value="${k}" ${x.h===k?'selected':''}>${n}</option>`).join('')}</select></label>
    <label>Prazo<input type="date" data-pa="${x.id}" data-f="prazo" value="${esc(x.prazo)}"></label>
    <label>${esc(K?K[0]:'Indicador')} hoje<input data-pa="${x.id}" data-f="base" value="${esc(x.base!==''?x.base:(b!=null?b:''))}" placeholder="${b==null?'sem dado no diagnóstico':''}" inputmode="decimal"></label>
    <label>Meta<input data-pa="${x.id}" data-f="meta" value="${esc(x.meta)}" placeholder="${K?(K[3]==='menor'?'menor que hoje':'maior que hoje'):''}" inputmode="decimal"></label>
    <label>Custo (R$)<input data-pa="${x.id}" data-f="custo" value="${esc(x.custo)}" inputmode="decimal" placeholder="0"></label>
    <label>Horas por semana<input data-pa="${x.id}" data-f="horas" value="${esc(x.horas)}" inputmode="decimal"></label>
   </div>
   ${!J.regras.length||x.motivo?`<label class="pamot">Por que entra no plano<input data-pa="${x.id}" data-f="motivo" value="${esc(x.motivo||'')}" placeholder="Evidência que justifica esta ação"></label>`:''}
   <details class="pap"><summary>Como fazer</summary><p>${esc(J.o)}</p><ol>${J.passos.map(p=>`<li>${esc(p)}</li>`).join('')}</ol></details></div>`; }
function paJogadaCard(s,ja){ const J=s.j; return `<div class="paj ${ja?'no':''}"><div><b>${esc(J.t)}</b><p>${esc(J.o)}</p><div class="ktags">${paChips(J)}<span class="tag">${PA_H[J.h][0]}</span><span class="tag">Esforço ${['','baixo','médio','alto'][J.esf]}</span></div>
   ${s.por&&s.por.length?`<small class="por"><b>Evidência:</b> ${s.por.slice(0,2).map(i=>esc(i.t)).join('; ')}</small>`:s.rel?'<small class="por"><b>Evidência:</b> ligada a uma causa raiz encontrada</small>':''}</div>
   ${ja?'<span class="tag ok">No plano</span>':`<button class="btn sm" data-act="pa-add" data-v="${J.id}">+ Incluir</button>`}</div>`; }
function renderPlano(INS){
  const L=paItens(), no=new Set(L.map(x=>x.j)), sug=paSugestoes(INS), chk=paChecagem(INS), cap=paCapacidade(), ap=paAprov();
  const hCurto=L.filter(x=>x.h==='c').reduce((a,x)=>a+(num(x.horas)||0),0), custo=L.reduce((a,x)=>a+(num(x.custo)||0),0), okN=chk.filter(c=>c.ok).length;
  const pessoas=[...new Set(cur.entrevistas.map(e=>e.nome).filter(Boolean))];
  const filtro=ui.paFiltro||'';
  $('#main').innerHTML=`<section class="panel pa">
   <header class="ph" style="grid-template-columns:minmax(0,1fr) auto"><div><span class="eyebrow">Do diagnóstico para a ação · <b>Plano</b></span><h2 style="margin-top:8px">Plano de ação</h2><p class="lead">Escolha as jogadas que respondem ao que o diagnóstico encontrou. Cada uma ganha dono, prazo, linha de base e meta. Aprovado pela reitoria, o plano vira o quadro da Execução.</p></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">${!L.length&&sug.length?`<button class="btn" data-act="pa-montar">Montar com as sugestões</button>`:''}<button class="btn" data-act="pa-print">Documento para a reitoria</button><button class="btn primary" data-act="pa-enviar" ${L.length?'':'disabled'}>Enviar para a Execução</button></div></header>
   <div class="stats"><div class="stat"><span class="si">${ico('plano',20)}</span><b>${L.length}</b><span>ações no plano</span><small>${L.filter(x=>x.h==='c').length} curto · ${L.filter(x=>x.h==='m').length} médio · ${L.filter(x=>x.h==='l').length} longo</small></div>
    <div class="stat ${cap.h!=null&&hCurto>cap.h?'bad':''}"><span class="si">${ico('relogio',20)}</span><b>${dec(hCurto,0)} h</b><span>por semana no curto prazo</span><small>${cap.h!=null?`de ${dec(cap.h,0)} h disponíveis (${cap.fonte})`:'capacidade não informada'}</small></div>
    <div class="stat"><span class="si">${ico('dre',20)}</span><b>${L.some(x=>x.custo!==''&&x.custo!=null)?brl(custo):'—'}</b><span>custo estimado</span></div>
    <div class="stat ${okN<chk.length?'':'ok'}"><span class="si">${ico('check',20)}</span><b>${okN}/${chk.length}</b><span>premissas atendidas</span><small>${ap&&ap.por?'Aprovado':'Aguardando aprovação'}</small></div></div>
   <section class="block"><div class="block-h"><h3>Checagem das premissas</h3><p>Lista de verificação antes de levar o plano à reitoria.</p></div>
    <ol class="pachk">${chk.map((c,i)=>`<li class="${c.ok?'ok':'no'}"><span class="pi">${c.ok?ico('check',14):i+1}</span><div><b>${esc(PA_PREMISSAS[i])}</b><small>${esc(c.txt)}</small></div></li>`).join('')}</ol>
    <div class="fields" style="margin-top:12px"><div class="field"><label for="c-pa.cap">Horas por semana livres para o plano</label><div class="inu"><input id="c-pa.cap" data-campo="pa.cap" inputmode="decimal" value="${esc(cur.campos['pa.cap']||'')}" placeholder="${cap.fonte==='20% das horas do time'?cap.h:''}"><span class="u">h</span></div></div>
     <div class="field"><label for="c-pa.revisao">Primeira revisão mensal</label><input type="date" id="c-pa.revisao" data-campo="pa.revisao" value="${esc(cur.campos['pa.revisao']||'')}"></div></div></section>
   ${L.length?Object.entries(PA_H).map(([k,[n,p]])=>{ const I=L.filter(x=>x.h===k); return I.length?`<section class="block"><div class="block-h"><h3>${n}</h3><p>${p} · ${pl(I.length,'ação','ações')}</p></div><div class="pais">${I.map(x=>paItemHtml(x,no)).join('')}</div></section>`:''; }).join(''):`<section class="block"><p class="empty">O plano está vazio. ${sug.length?'Use <b>Montar com as sugestões</b> ou inclua as jogadas abaixo.':'Responda o diagnóstico para receber sugestões, ou escolha na biblioteca.'}</p></section>`}
   <datalist id="pa-pessoas">${pessoas.map(n=>`<option value="${esc(n)}">`).join('')}</datalist>
   ${sug.filter(s=>!s.no).length?`<section class="block"><div class="block-h"><h3>Sugeridas pelo diagnóstico</h3><p>${pl(sug.filter(s=>!s.no).length,'jogada ligada','jogadas ligadas')} ao que foi encontrado${sug.some(s=>s.no)?` · ${sug.filter(s=>s.no).length} já no plano`:''}</p></div><div class="pajs">${sug.filter(s=>!s.no).map(s=>paJogadaCard(s,false)).join('')}</div></section>`:''}
   <section class="block"><details ${ui.open['pa-bib']?'open':''} data-keep="pa-bib"><summary><h3 style="display:inline">Biblioteca de jogadas (${JOGADAS.length})</h3></summary>
    <div class="seg" style="margin:12px 0" role="group">${[['','Todas'],['destravar','Destravar'],['acelerar','Acelerar'],['revops','Do arquivo de RevOps']].map(([k,l])=>`<button class="${filtro===k?'on':''}" data-act="pa-filtro" data-v="${k}">${l}</button>`).join('')}</div>
    <div class="pajs">${JOGADAS.filter(j=>!filtro||(filtro==='revops'?j.ref!=='LORSO':j.tipo===filtro)).map(j=>paJogadaCard({j,por:[]},no.has(j.id))).join('')}</div></details></section>
   <section class="block"><div class="block-h"><h3>Aprovação da reitoria</h3><p>Registre quem aprovou. Depois disso, envie para a Execução.</p></div>
    <div class="fields"><div class="field"><label for="pa-apor">Aprovado por</label><input id="pa-apor" value="${esc(ap&&ap.por||'')}" placeholder="Nome e cargo"></div><div class="field"><label for="pa-adata">Data</label><input type="date" id="pa-adata" value="${esc(ap&&ap.data||'')}"></div></div>
    <div style="margin-top:10px"><button class="btn" data-act="pa-aprovar">${ap&&ap.por?'Atualizar aprovação':'Registrar aprovação'}</button></div></section>
  </section>`; }

/* ---------- ações ---------- */
function paClick(act,d){
  if(act==='pa-add'){ const L=paItens(); if(!L.some(x=>x.j===d.v)){ L.push(paNovo(d.v)); paSet(L); } render(); return true; }
  if(act==='pa-del'){ paSet(paItens().filter(x=>x.id!==d.v)); render(); return true; }
  if(act==='pa-montar'){ computeAll(); const INS=runEngine(); const L=paItens(), cont={}; let n=0; paSugestoes(INS).filter(s=>s.forte).forEach(s=>{ const k=s.j.bloco+'|'+s.j.h; if(n>=10||(cont[k]||0)>=2)return; if(L.some(x=>x.j===s.j.id))return; cont[k]=(cont[k]||0)+1; n++; L.push(paNovo(s.j.id)); });
    // pré-requisitos das jogadas de aceleração escolhidas
    L.slice().forEach(x=>(JOG[x.j].pre||[]).forEach(p=>{ if(!L.some(y=>y.j===p)) L.push(paNovo(p,'Pré-requisito de '+JOG[x.j].t)); }));
    paSet(L); render(); toast(pl(L.length,'ação entrou','ações entraram')+' no plano: as mais fortes de cada causa raiz. As demais continuam em Sugeridas.'); return true; }
  if(act==='pa-filtro'){ ui.paFiltro=d.v; ui.open['pa-bib']=true; render(); return true; }
  if(act==='pa-aprovar'){ const por=($('#pa-apor').value||'').trim(), data=$('#pa-adata').value||today(); if(!por){ toast('Informe quem aprovou'); return true; } cur.campos['pa.aprov']=JSON.stringify({por,data}); touch(true); toast('Aprovação registrada'); return true; }
  if(act==='pa-print'){ document.body.classList.add('printing','pa-printing'); setTimeout(()=>{ window.print(); document.body.classList.remove('printing','pa-printing'); },50); return true; }
  if(act==='pa-enviar'){ const L=paItens(); if(!L.length)return true;
    const tem=new Set(cur.acoes.map(t=>t.origem)); let n=0;
    // as sugestões automáticas ainda não iniciadas saem; o plano escolhido entra
    cur.acoes=cur.acoes.filter(t=>!(t.origem&&t.origem.startsWith('plano:')&&t.status==='A fazer'));
    L.forEach(x=>{ const key='pa:'+x.id; if(tem.has(key))return; const J=JOG[x.j]; newTask({txt:J.t+(x.dono?` · dono: ${x.dono}`:''),area:AREA[J.area]?J.area:'',origem:key,status:'A fazer',prazo:x.prazo||''}); n++; });
    cur.campos['pa.enviado']=today(); touch(true); toast(n?`${pl(n,'ação enviada','ações enviadas')} para a Execução`:'O plano já estava na Execução'); return true; }
  return false; }
function paChange(t){ const d=t.dataset; if(d.pa==null)return false; const L=paItens(), x=L.find(y=>y.id===d.pa); if(x){ x[d.f]=t.value; paSet(L); if(t.tagName==='SELECT'||t.type==='date') render(); } return true; }
function paInput(t){ const d=t.dataset; if(d.pa==null||t.tagName==='SELECT'||t.type==='date')return false; const L=paItens(), x=L.find(y=>y.id===d.pa); if(x){ x[d.f]=t.value; paSet(L); } return true; }
