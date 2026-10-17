/* =====================================================================
   KPIs por área: o que cada responsável mede e reporta
   Na entrevista, a LORSO marca para cada indicador se a área mede e reporta,
   com que frequência, para quem, de onde vem o número, valor atual e meta.
   Os números que já existem no roteiro ou na Base entram sozinhos.
   O compilado aparece em Resultados e alimenta a regra CRZ-73 e o plano.
   ===================================================================== */
const KX_ST=[['reporta','Mede e reporta'],['mede','Mede, não reporta'],['nao','Não mede'],['na','Não se aplica']];
const KX_FR=['Diário','Semanal','Quinzenal','Mensal','Por ciclo'];

/* helpers de cálculo a partir da Base (por UN) */
const kxUns=()=>typeof UNS!=='undefined'?UNS:[];
const kxPorUn=(f,fmt)=>()=>{ if(typeof buDados!=='function') return null; const v=kxUns().map(u=>{ const d=buDados(u.id); const x=f(d); return x==null||!isFinite(x)?null:`${u.nome} ${fmt(x)}`; }).filter(Boolean); return v.length?v.join('; '):null; };
const kxBrl=v=>'R$ '+Math.round(v).toLocaleString('pt-BR'), kxPct=v=>(v*100).toFixed(1).replace('.',',')+'%', kxMes=v=>v.toFixed(1).replace('.',',')+' meses';
const kxV=(a,k,u)=>()=>{ const v=cur.campos[a+'.'+k]; return v==null||v===''?null:String(v)+(u||''); };

/* catálogo: c=essencial (entra na regra de lacuna) · ed=incluído pela LORSO para o mercado educacional · ref=referência de mercado */
const KX_CAT={
 reitoria:{t:'Visão executiva (reitoria, diretoria, CMO)',k:[
  {id:'cac_geral',n:'CAC geral',d:'(Investimento total de marketing + custo da equipe comercial) ÷ alunos matriculados.',c:1,auto:kxPorUn(d=>d.cac,kxBrl)},
  {id:'ltv',n:'LTV do aluno',d:'Mensalidade média × meses de permanência, com evasão descontada.',c:1},
  {id:'ltv_cac',n:'LTV ÷ CAC',d:'Eficiência financeira da captação.',ref:'Ensino superior: entre 3x e 5x',c:1},
  {id:'payback',n:'Payback do CAC',d:'Meses de mensalidade paga para cobrir o custo de aquisição.',ref:'Abaixo de 3 a 6 meses',c:1,auto:kxPorUn(d=>d.payback,kxMes)},
  {id:'na_mesa',n:'Dinheiro na mesa',d:'Valor estimado dos leads qualificados e inscritos que abandonaram antes do pagamento.'},
  {id:'roas_romi',n:'ROAS e ROMI',d:'Retorno sobre mídia paga e sobre o investimento total de marketing.',c:1,auto:kxPorUn(d=>d.roi,v=>v>=1?(v+1).toFixed(1).replace('.',',')+'x a verba':kxPct(v))},
  {id:'funil_global',n:'Conversão global do funil',d:'Visitantes → leads → inscritos → presentes na prova ou ENEM enviado → matriculados pagantes.',c:1,auto:kxPorUn(d=>d.convIM,v=>'inscrito→matrícula '+kxPct(v))},
  {id:'curva',n:'Curva de captação do ciclo',d:'% da meta de matrículas atingida a cada semana, comparada ao mesmo ponto do ciclo anterior.',ed:1,c:1,auto:kxPorUn(d=>d.ating,kxPct)},
  {id:'ticket_liq',n:'Ticket líquido',d:'Mensalidade depois de bolsas, descontos, convênios, FIES e Prouni.',ed:1},
  {id:'inad1',n:'Inadimplência da 1ª mensalidade',d:'% de matriculados que não pagam a primeira parcela.',ed:1},
  {id:'ocupacao',n:'Ocupação das turmas',d:'Alunos captados ÷ alunos possíveis, e turmas abaixo do mínimo para abrir.',ed:1,auto:kxPorUn(d=>d.ocup,kxPct)}]},
 growth:{t:'Growth e mídia de performance',k:[
  {id:'cpl',n:'CPL (custo por lead)',d:'Investimento em mídia ÷ leads gerados.',c:1,auto:kxV('captacao','cpl')},
  {id:'cpi',n:'CPI (custo por inscrição)',d:'Investimento em mídia ÷ inscrições geradas pela mídia.',c:1,auto:kxPorUn(d=>d.cpiGrowth,kxBrl)},
  {id:'cac_midia',n:'Custo por matrícula paga (mídia)',d:'CAC só do tráfego pago.',c:1,auto:kxPorUn(d=>d.cacMidia,kxBrl)},
  {id:'conv_lp',n:'Conversão da landing page',d:'% de visitantes da página do curso que viram lead ou inscrito.',auto:kxV('growth','conv_lp')},
  {id:'fadiga',n:'Desgaste do criativo',d:'Queda de CTR e alta de CPM ou CPC pela repetição do mesmo anúncio.'},
  {id:'insc_canal',n:'Inscrições por dia e por canal',d:'Google Ads, Meta Ads, TikTok Ads, busca orgânica e portais parceiros.',c:1},
  {id:'roas',n:'ROAS',d:'Receita gerada ÷ investimento em mídia.',auto:kxV('growth','roas')}]},
 smarketing:{t:'Comercial e vendas inbound',k:[
  {id:'speed',n:'Speed to lead',d:'Tempo do formulário até o primeiro contato do consultor.',ref:'Educação: abaixo de 5 a 15 minutos',c:1,auto:kxV('smarketing','speed')},
  {id:'showup_prova',n:'Agendamento e presença na prova',d:'% de inscritos que fazem a prova ou enviam a nota do ENEM.',c:1},
  {id:'conv_vendas',n:'Conversão de vendas',d:'Lead → matrícula e inscrito → matrícula.',c:1,auto:kxV('smarketing','conv_insc')},
  {id:'objecoes',n:'Perdas por objeção',d:'% de desistências por preço, modalidade, concorrência ou localização.',c:1},
  {id:'ciclo_venda',n:'Tempo da inscrição à matrícula',d:'Dias entre a inscrição e o pagamento da matrícula.',ed:1}]},
 callcenter:{t:'Call center e telemarketing',k:[
  {id:'contato',n:'Taxa de contato efetivo',d:'% de ligações ou mensagens que falam com o candidato ou responsável.',c:1},
  {id:'tme_tma',n:'TME e TMA',d:'Tempo médio de espera e de atendimento nas centrais receptivas.',auto:()=>{ const a=cur.campos['callcenter.tme'], b=cur.campos['callcenter.tma']; return a||b?`TME ${a||'—'} · TMA ${b||'—'}`:null; }},
  {id:'recupera',n:'Recuperação de boletos e inscrições pendentes',d:'% de pendências convertidas em pagamento depois da abordagem.',c:1},
  {id:'produt',n:'Produtividade por operador',d:'Contatos úteis por dia ou turno.'},
  {id:'abandono',n:'Abandono na fila',d:'% de chamadas abandonadas antes do atendimento.',auto:kxV('callcenter','abandono')}]},
 atendimento:{t:'Atendimento, retenção e rematrícula',k:[
  {id:'rematricula',n:'Rematrícula',d:'% de alunos ativos que renovam para o próximo período.',c:1,auto:kxV('colegio','rematricula')},
  {id:'evasao',n:'Evasão',d:'% de trancamentos, desistências e cancelamentos no período.',c:1,auto:kxV('atendimento','evasao')},
  {id:'evasao1',n:'Evasão no 1º semestre dos ingressantes',d:'Quanto da captação do ciclo se perde antes do fim do primeiro semestre.',ed:1,c:1},
  {id:'nps',n:'NPS',d:'Recomendação da instituição pelos alunos atuais.',auto:kxV('atendimento','nps')},
  {id:'csat_sla',n:'CSAT e SLA da central do aluno',d:'Satisfação, tempo de resposta e resolução na central de atendimento.',auto:kxV('atendimento','csat')}]},
 eventos:{t:'Eventos (vestibular, feiras, open house, webinars)',k:[
  {id:'showup',n:'Show-up dos eventos',d:'% de inscritos no evento que comparecem.',ref:'Online 30% a 40% · presencial 50% a 70%',c:1,auto:kxV('eventos','showup')},
  {id:'custo_part',n:'Custo por participante presente',d:'Custo do evento ÷ participantes presentes.'},
  {id:'custo_mat',n:'Custo por matrícula gerada no evento',d:'Custo do evento ÷ matrículas atribuídas a ele.',c:1},
  {id:'conv_evento',n:'Conversão no evento',d:'% de participantes que se inscrevem no vestibular durante ou logo depois.',c:1}]},
 criacao:{t:'Criação, design, marca e conteúdo',k:[
  {id:'sla_prod',n:'SLA de produção',d:'Tempo médio entre o briefing e a entrega do enxoval de peças.',c:1,auto:kxV('demandas','prazo_medio',' dias')},
  {id:'refacao',n:'Refação de peças',d:'% de artes refeitas por erro de briefing ou aprovação.',c:1,auto:kxV('criacao','refacao')},
  {id:'ctr',n:'CTR médio dos criativos',d:'Desempenho de visual e texto dos anúncios em gerar clique.'},
  {id:'sov',n:'Share of voice e lembrança de marca',d:'Participação nas menções e lembrança frente aos concorrentes da região.'}]},
 b2b:{t:'Comercial B2B, parcerias e escolas',k:[
  {id:'pipeline',n:'Pipeline B2B',d:'Valor dos convênios e parcerias em negociação.',c:1,auto:kxV('b2b','pipeline')},
  {id:'mat_conv',n:'Matrículas por convênio',d:'Ingressantes por parcerias com empresas e escolas.',c:1},
  {id:'desconto',n:'Ticket e desconto médio concedido',d:'Controle para as bolsas B2B não corroerem a margem.',auto:kxV('b2b','ticket')}]},
 redes:{t:'Redes sociais e comunidade',k:[
  {id:'engaj',n:'Engajamento orgânico',d:'(Curtidas + comentários + compartilhamentos + salvamentos) ÷ alcance.',c:1},
  {id:'ret3s',n:'Retenção nos primeiros segundos',d:'% das visualizações retidas nos primeiros 3 a 5 segundos de vídeos curtos.'},
  {id:'sos',n:'Share of search',d:'Buscas pelo nome da instituição no Google frente aos concorrentes diretos.'},
  {id:'sla_dm',n:'SLA de resposta nas redes',d:'Tempo para responder directs e comentários de candidatos.',c:1,auto:kxV('redes','resp_dm')}]},
 captacao:{t:'Captação',k:[
  {id:'leads_canal',n:'Leads por canal e por UN',d:'Volume de leads separado por origem e unidade.',c:1},
  {id:'mql',n:'Leads qualificados',d:'% dos leads dentro do perfil definido com o comercial.',auto:kxV('captacao','descarte')}]},
 crm:{t:'CRM e dados',k:[
  {id:'origem',n:'Leads com origem registrada',d:'% dos leads com canal e campanha de origem no CRM.',c:1},
  {id:'sem_etapa',n:'Leads sem etapa atualizada',d:'% dos leads parados sem atualização no funil.',auto:kxV('crm','sem_etapa')}]},
 colegio:{t:'Colégio',k:[
  {id:'lead_visita',n:'Lead → visita agendada',d:'% das famílias interessadas que agendam visita.',ed:1,c:1},
  {id:'visita_mat',n:'Visita → matrícula',d:'% das visitas que viram matrícula.',c:1,auto:kxV('colegio','conv_visita')},
  {id:'rematricula',n:'Rematrícula',d:'% dos alunos que renovam para o próximo ano.',c:1,auto:kxV('colegio','rematricula')},
  {id:'indicacao',n:'Matrículas por indicação',d:'Quantas matrículas vieram de famílias da escola.',auto:kxV('colegio','indicacao')}]},
 graduacao:{t:'Graduação',k:[
  {id:'presenca',n:'Inscrito → presente na prova ou ENEM enviado',d:'Quanto do volume de inscritos chega a fazer o processo.',c:1},
  {id:'aprov_mat',n:'Aprovado → matriculado',d:'Aprovados que pagam a matrícula; o restante é dinheiro na mesa.',c:1,auto:kxV('graduacao','aprov_nao_mat',' aprovados não matriculados')},
  {id:'ingresso',n:'Matrículas por forma de ingresso',d:'Vestibular, ENEM, transferência, segunda graduação, Prouni e FIES.',ed:1},
  {id:'turmas_min',n:'Turmas que não fecham',d:'Cursos e turnos abaixo do mínimo para abrir turma.',ed:1,c:1}]},
 pos:{t:'Pós-graduação',k:[
  {id:'conv',n:'Lead → matrícula',d:'Conversão da venda consultiva.',c:1,auto:kxV('pos','conv')},
  {id:'ex_alunos',n:'Matrículas de ex-alunos',d:'Reaproveitamento da base da graduação.',auto:kxV('pos','ex_alunos')},
  {id:'turmas_conf',n:'Turmas confirmadas × previstas',d:'Quantas turmas planejadas atingiram o mínimo e abriram.',ed:1,c:1}]},
 mestrado:{t:'Mestrado',k:[
  {id:'cand_vaga',n:'Candidatos por vaga',d:'Procura por edital e linha de pesquisa.',c:1},
  {id:'aprov_mat',n:'Aprovado → matriculado',d:'Aprovados no processo que efetivam a matrícula.',auto:()=>{ const a=num(cur.campos['mestrado.aprovados']), m=num(cur.campos['mestrado.matriculados']); return a&&m!=null?kxPct(m/a):null; }}]}
};

function kxLer(a){ try{ return JSON.parse(cur.campos['kpi.'+a]||'{}')||{}; }catch(e){ return {}; } }
function kxGravar(a,o){ const limpo={}; Object.entries(o).forEach(([k,v])=>{ if(k==='extras'){ if(v&&v.length) limpo.extras=v; return; } const w={}; Object.entries(v||{}).forEach(([f,x])=>{ if(x!=null&&String(x).trim()!=='') w[f]=x; }); if(Object.keys(w).length) limpo[k]=w; }); cur.campos['kpi.'+a]=Object.keys(limpo).length?JSON.stringify(limpo):''; if(!cur.campos['kpi.'+a]) delete cur.campos['kpi.'+a]; }
function kxLista(a){ const c=KX_CAT[a]; const o=kxLer(a); return [...(c?c.k:[]),...((o.extras||[]).map(x=>({id:x.id,n:x.n||'',d:'Indicador citado pelo responsável.',extra:1})))]; }
function kxAuto(k){ try{ return k.auto?k.auto():null; }catch(e){ return null; } }
function kxEstado(a,k){ const o=kxLer(a)[k.id]||{}; const auto=kxAuto(k); return Object.assign({},o,{auto,st:o.st||'',sis:!o.st&&auto!=null}); }

function kpiAreaHtml(a){
  const c=KX_CAT[a]; const lista=kxLista(a); if(!c&&!lista.length) return '';
  const est=lista.map(k=>[k,kxEstado(a,k)]); const rep=est.filter(([,e])=>e.st==='reporta').length, med=est.filter(([,e])=>e.st==='mede').length, nao=est.filter(([,e])=>e.st==='nao').length;
  const opt=(arr,v)=>arr.map(x=>{ const [val,lab]=Array.isArray(x)?x:[x,x]; return `<option value="${val}" ${v===val?'selected':''}>${lab}</option>`; }).join('');
  return `<section class="block kx"><div class="block-h"><h3>KPIs que esta área reporta</h3><p>Pergunte ao responsável o que ele mede, com que frequência, para quem e de onde vem o número. Os números que já estão no roteiro ou na Base aparecem sozinhos.</p></div>
   <div class="kx-res"><span><b>${rep}</b> medidos e reportados</span><span><b>${med}</b> medidos sem reporte</span><span class="${nao?'falta':''}"><b>${nao}</b> não medidos</span><span class="muted">${lista.length} indicadores no total</span></div>
   <div class="kx-list">${est.map(([k,e])=>`<div class="kx-row st-${e.st||'vazio'}">
     <div class="kx-n"><b>${k.extra?'Indicador citado pelo responsável':esc(k.n)}${k.c?' <span class="kx-tag ess" title="Indicador essencial">essencial</span>':''}${k.ed?' <span class="kx-tag ed" title="Incluído pela LORSO para o mercado educacional">educação</span>':''}${e.sis?' <span class="kx-tag sis" title="O sistema já calcula este número">já no sistema</span>':''}</b>${k.extra?`<input data-kx="${a}" data-kid="${k.id}" data-kf="n" value="${esc(k.n)}" placeholder="Nome do indicador, ex.: custo por visita ao campus" aria-label="Nome do indicador">`:`<small>${esc(k.d)}</small>`}${k.ref?`<small class="kx-ref">Referência: ${esc(k.ref)}</small>`:''}${e.auto!=null?`<small class="kx-auto">No sistema: ${esc(e.auto)}</small>`:''}</div>
     <label><span>Situação</span><select data-kx="${a}" data-kid="${k.id}" data-kf="st"><option value="">Perguntar</option>${opt(KX_ST,e.st)}</select></label>
     <label><span>Frequência</span><select data-kx="${a}" data-kid="${k.id}" data-kf="fr"><option value=""></option>${opt(KX_FR,e.fr)}</select></label>
     <label><span>Reporta para</span><input data-kx="${a}" data-kid="${k.id}" data-kf="para" value="${esc(e.para||'')}" placeholder="Ex.: reitoria"></label>
     <label><span>Fonte do número</span><input data-kx="${a}" data-kid="${k.id}" data-kf="fonte" value="${esc(e.fonte||'')}" placeholder="Ex.: CRM, planilha"></label>
     <label><span>Atual</span><input data-kx="${a}" data-kid="${k.id}" data-kf="atual" value="${esc(e.atual||'')}" placeholder="${e.auto!=null?'no sistema':''}"></label>
     <label><span>Meta</span><input data-kx="${a}" data-kid="${k.id}" data-kf="meta" value="${esc(e.meta||'')}"></label>
     ${k.extra?`<button class="xbtn" data-act="kx-del" data-a="${a}" data-v="${k.id}" aria-label="Remover indicador">×</button>`:''}</div>`).join('')}</div>
   <div class="kx-mais"><button class="btn" data-act="kx-add" data-a="${a}">+ Outro indicador que a área mede</button><span class="muted">Use quando o responsável citar um KPI que não está na lista.</span></div></section>`;
}

/* compilado para Resultados */
function kxTodos(){ const out=[]; AREAS.forEach(ar=>{ kxLista(ar.id).forEach(k=>out.push({a:ar,k,e:kxEstado(ar.id,k)})); }); return out; }
function kxLacunas(){ const T=kxTodos(); const comResp=new Set(T.filter(x=>x.e.st).map(x=>x.a.id)); return {T,comResp,falta:T.filter(x=>x.k.c&&comResp.has(x.a.id)&&(x.e.st==='nao'||x.e.st==='mede')),semMeta:T.filter(x=>x.e.st==='reporta'&&!x.e.meta)}; }
function kpiPainelHtml(){
  const {T,comResp,falta,semMeta}=kxLacunas(); const tocados=T.filter(x=>x.e.st||x.e.sis);
  if(!tocados.length) return `<section class="block"><div class="block-h"><h3>Painel de KPIs por área</h3><p>Ainda vazio. Em cada entrevista, marque no bloco "KPIs que esta área reporta" o que o responsável mede e reporta.</p></div></section>`;
  const stLab=v=>v==='sis'?'Calculado pelo sistema':(KX_ST.find(x=>x[0]===v)||[,'Perguntar'])[1];
  const grupos=AREAS.filter(ar=>T.some(x=>x.a.id===ar.id&&(x.e.st||x.e.sis)));
  return `<section class="block"><div class="block-h"><h3>Painel de KPIs por área</h3><p>Quem mede e reporta o quê, para quem e com que frequência. Base para o painel executivo e o mandato.</p></div>
   <div class="kx-res"><span><b>${T.filter(x=>x.e.st==='reporta').length}</b> medidos e reportados</span><span><b>${T.filter(x=>x.e.st==='mede').length}</b> medidos sem reporte</span><span class="${T.filter(x=>x.e.st==='nao').length?'falta':''}"><b>${T.filter(x=>x.e.st==='nao').length}</b> não medidos</span><span><b>${semMeta.length}</b> reportados sem meta</span><span><b>${T.filter(x=>x.e.sis).length}</b> calculados pelo sistema, falta perguntar se reportam</span><span class="muted">${comResp.size} ${comResp.size===1?'área':'áreas'} com resposta</span></div>
   ${falta.length?`<p class="pz-aviso"><span class="i">!</span><span><b>Essenciais que ninguém reporta:</b> ${falta.map(x=>`${esc(x.k.n)} (${esc(x.a.nome)})`).join(', ')}.</span></p>`:''}
   <div class="tblw"><table class="tbl kx-tbl"><thead><tr><th>Área</th><th>Indicador</th><th>Situação</th><th>Frequência</th><th>Reporta para</th><th>Fonte</th><th class="r">Atual</th><th class="r">Meta</th></tr></thead><tbody>
   ${grupos.map(ar=>T.filter(x=>x.a.id===ar.id&&(x.e.st||x.e.sis)).map((x,i)=>`<tr><td>${i?'':`<button class="chip" data-act="goto" data-v="${ar.id}">${esc(ar.nome)}</button>`}</td><td>${esc(x.k.n)}${x.k.c?' <span class="kx-tag ess">essencial</span>':''}</td><td><span class="kx-st st-${x.e.st||'sis'}">${stLab(x.e.st||'sis')}</span></td><td>${esc(x.e.fr||'—')}</td><td>${esc(x.e.para||'—')}</td><td>${esc(x.e.fonte||'—')}</td><td class="r">${esc(x.e.atual||x.e.auto||'—')}</td><td class="r">${esc(x.e.meta||'—')}</td></tr>`).join('')).join('')}
   </tbody></table></div></section>`;
}

/* gravação: campos de texto salvam sem redesenhar, seleções redesenham */
function kxSet(el){ const a=el.dataset.kx, id=el.dataset.kid, f=el.dataset.kf; const o=kxLer(a);
  if(f==='n'){ (o.extras||[]).forEach(x=>{ if(x.id===id) x.n=el.value; }); } else { o[id]=o[id]||{}; o[id][f]=el.value; }
  kxGravar(a,o); }
document.addEventListener('change',e=>{ const el=e.target.closest&&e.target.closest('[data-kx]'); if(!el||!cur) return; e.stopPropagation(); kxSet(el); touch(el.tagName==='SELECT'); },true);
document.addEventListener('input',e=>{ const el=e.target.closest&&e.target.closest('[data-kx]'); if(!el||!cur||el.tagName==='SELECT') return; e.stopPropagation(); kxSet(el); touch(false); },true);
document.addEventListener('click',e=>{ const b=e.target.closest&&e.target.closest('[data-act^="kx-"]'); if(!b||!cur) return; e.stopPropagation(); e.preventDefault();
  const a=b.dataset.a, o=kxLer(a);
  if(b.dataset.act==='kx-add'){ o.extras=o.extras||[]; const nid='x'+uid().slice(0,8); o.extras.push({id:nid,n:''}); kxGravar(a,o); touch(true); setTimeout(()=>{ const el=document.querySelector(`[data-kx="${a}"][data-kid="${nid}"][data-kf="n"]`); if(el){ el.scrollIntoView({block:'center'}); el.focus(); } },60); }
  if(b.dataset.act==='kx-del'){ o.extras=(o.extras||[]).filter(x=>x.id!==b.dataset.v); delete o[b.dataset.v]; kxGravar(a,o); touch(true); }
},true);

/* regra: indicadores essenciais sem medição ou sem reporte */
if(typeof RULES!=='undefined'){
  RULES.push({id:'CRZ-73',sev:'alta',pad:'Sem régua de resultado',areas:()=>[...new Set(kxLacunas().falta.map(x=>x.a.id))],t:'Indicadores essenciais não são medidos ou não chegam a quem decide',
   test:()=>kxLacunas().falta.length>=3,
   txt:()=>{ const f=kxLacunas().falta; return `${f.length} indicadores essenciais sem medição ou sem reporte: ${f.slice(0,6).map(x=>`${x.k.n} (${x.a.nome})`).join(', ')}${f.length>6?' e outros':''}. Sem esses números, a reitoria não acompanha o resultado e o marketing não prova o retorno.`; },
   rec:['Definir com cada responsável os KPIs, a fonte e a frequência','Painel executivo único com CAC, LTV/CAC, funil e curva de captação','Meta para todo indicador reportado']});
  if(typeof BLOCOS!=='undefined'){ const b=BLOCOS.find(x=>x.id==='funil'); if(b&&b.rules&&!b.rules.includes('CRZ-73')) b.rules.push('CRZ-73'); }
  if(typeof JOGADAS!=='undefined'){ ['painel','mandato'].forEach(id=>{ const j=JOGADAS.find(x=>x.id===id); if(j&&!j.regras.includes('CRZ-73')) j.regras.push('CRZ-73'); }); }
}
