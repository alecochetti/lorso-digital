/* =====================================================================
   Guia de preenchimento · onboarding para o cliente, do acesso ao fim
   Menu Apoio › Guia de preenchimento. Capítulos com passos, dicas e
   botão que leva à tela. O que já foi lido fica neste navegador.
   Carregado depois de app.js.
   ===================================================================== */
ICO.guia='M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5v14zM20 17v4H6.5A2.5 2.5 0 0 1 4 18.5M9 7h7M9 11h5';
const GUIA=[
 {id:'acesso',t:'Primeiro acesso',r:'Você entra com o e-mail em que recebeu o convite e cria a sua senha.',
  passos:['Abra o endereço que a LORSO enviou para você.','Na tela de entrada, clique em <b>Primeiro acesso</b>.','Digite o e-mail em que recebeu o convite e crie uma senha com pelo menos 8 caracteres.','Das próximas vezes, use <b>Entrar</b> com o mesmo e-mail e senha.','Esqueceu a senha? Clique em <b>Esqueci a senha</b> e siga o link que chega no seu e-mail.'],
  dica:'Só entra quem foi convidado. Se aparecer "Este e-mail não foi convidado", fale com a LORSO para conferir o endereço.'},
 {id:'tela',t:'Conhecendo a tela',r:'O menu à esquerda tem tudo o que você vai preencher, na ordem em que deve ser feito.',
  passos:['<b>Fase 1 · Diagnóstico</b>: Base de conhecimento, Reitoria e Entrevistas. É aqui que você mais vai trabalhar.','Os números ao lado de cada item mostram quanto já foi preenchido.','<b>Fases 2 a 5</b> e <b>Resultados</b> se completam conforme o diagnóstico avança.','No celular, o menu abre pelo botão com três linhas no canto superior esquerdo.','Em <b>Perfil</b>, no fim do menu, você troca o tema claro ou escuro, aumenta o tamanho das letras e muda a sua senha.'],
  ir:['view','visao'],irTxt:'Ver a visão geral'},
 {id:'salvar',t:'Tudo fica salvo sozinho',r:'Não existe botão de salvar. Cada resposta é gravada cerca de 1 segundo depois que você a faz.',
  passos:['Pode parar no meio e voltar outro dia, em qualquer computador ou celular: tudo estará como você deixou.','No topo da tela, o aviso <b>Salvo</b> em verde confirma que tudo está gravado.','<b>Salvando…</b> aparece por um instante logo depois de cada mudança.','Se aparecer um aviso em vermelho, confira a internet. Se disser "Sessão expirada", entre de novo antes de fechar a página.'],
  dica:'Antes de fechar o navegador, olhe o topo da tela e confira se está escrito Salvo.',mock:'salvo'},
 {id:'base',t:'Passo 1 · Base de conhecimento',r:'O que a instituição já tem documentado: cursos, preços, vagas e materiais.',
  passos:['Em <b>Cursos vigentes e lançamentos</b>, cadastre cada curso com modalidade, turno, preço, vagas e matriculados.','Em <b>Fontes de conhecimento</b>, envie o que já existe: apresentações, planejamentos, relatórios (PDF, Word, planilha CSV).','Se tiver um resumo no NotebookLM, use <b>Colar do NotebookLM</b>.','Você também pode informar o site da instituição em <b>Ler o site do cliente</b> para trazer cursos e informações públicas.'],
  dica:'Não precisa organizar antes. Mande o que tiver; a LORSO usa como base para as entrevistas.',ir:['dstep','base'],irTxt:'Abrir a Base de conhecimento'},
 {id:'reitoria',t:'Passo 2 · Reitoria e direcionamentos',r:'A visão da direção: o que precisa mudar, metas, orçamento e prioridades.',
  passos:['Responda as perguntas de Reitoria, Pró-reitorias, Orçamento e DRE e Mandato e autonomia.','Nas perguntas de prioridade, escolha uma ou mais opções e coloque em ordem de importância. Se nada servir, use <b>Outra</b> e escreva.','Em <b>Expectativas por UN</b>, diga o que a reitoria espera de cada unidade: crescer, manter ou recuperar.','Os números de orçamento, receita e metas entram nos campos de cada área. Use os valores do ano.'],
  dica:'Se a instituição usa o módulo DRE e orçamento, vários números da reitoria já aparecem preenchidos com a etiqueta "do DRE".',ir:['dstep','reitoria'],irTxt:'Abrir a Reitoria'},
 {id:'entrevistas',t:'Passo 3 · Entrevistas por área',r:'Cada área de marketing e cada unidade responde como trabalha hoje.',
  passos:['Escolha a área na lista à esquerda. As marcadas com estrela são as prioridades combinadas com a reitoria.','Em <b>Entrevistados</b>, registre quem respondeu: nome, cargo e data.','Responda cada pergunta escolhendo a opção que descreve <b>como é hoje</b>, não como deveria ser.','Preencha os números da área quando houver (prazos, volumes, percentuais). Se não souber, deixe em branco.','Para responder com calma, use <b>Modo entrevista</b>: uma pergunta por tela, com as teclas 1 a 4 (e 0 para "não sei").'],
  ir:['dstep','entrevistas'],irTxt:'Abrir as Entrevistas',mock:'escala'},
 {id:'resposta',t:'Como escolher a resposta certa',r:'Cada pergunta tem quatro respostas, uma por nível de maturidade. A nota vai de 1 a 4.',
  passos:['<b>N1 Iniciante</b>: depende de pessoas e improviso; sem processo nem medição.','<b>N2 Estruturado</b>: existe processo, mas nem todos seguem e ele não é medido.','<b>N3 Otimizado</b>: processo padronizado, medido e ligado a metas.','<b>N4 Escalável</b>: automatizado, integrado e melhorado com dados.','Ficou em dúvida entre duas? Escolha a menor. É melhor um retrato fiel do que uma nota bonita.'],
  dica:'Não há resposta certa ou errada. O diagnóstico só ajuda a instituição se mostrar a realidade.'},
 {id:'naosei',t:'"Não se aplica / não sei"',r:'Quando você não sabe a resposta ou a pergunta não vale para a sua área.',
  passos:['Use <b>Não se aplica / não sei</b> em vez de chutar um nível.','Essa resposta fica fora da nota, então não puxa a nota para cima nem para baixo.','Ela aparece nos Resultados como "o que ninguém soube responder". Isso também é um achado: mostra o que não é medido.'],
  dica:'Chutar distorce o diagnóstico. "Não sei" é uma resposta honesta e útil.'},
 {id:'evidencia',t:'Observações e evidências',r:'Quanto mais comprovado, mais forte fica o diagnóstico diante da reitoria.',
  passos:['Em <b>Adicionar observação</b>, anote o que sustenta a resposta: um exemplo, um número, o nome de uma ferramenta.','Marque <b>Comprovado com evidência</b> quando você puder mostrar: uma planilha, um relatório, a tela de um sistema.','Nos Resultados, o diagnóstico mostra quanto foi comprovado e quanto foi apenas declarado.']},
 {id:'dores',t:'Dores e gargalos',r:'Os problemas do dia a dia, contados por quem vive eles.',
  passos:['Em <b>Dores e gargalos</b>, clique em <b>Registrar dor</b>.','Descreva o problema em uma frase, escolha a área, a etapa e a gravidade.','Informe quem relatou e com que frequência acontece.','Durante as entrevistas, você também pode registrar a dor sem sair da pergunta.'],
  ir:['view','dores'],irTxt:'Abrir Dores e gargalos'},
 {id:'sistemas',t:'Sistemas e ferramentas',r:'Quais ferramentas o marketing usa e se elas conversam entre si.',
  passos:['Em <b>Sistemas</b>, liste cada ferramenta: CRM, e-mail, redes, gestão de tarefas, planilhas.','Para cada uma, diga quem usa, a nota de satisfação, se integra com outras e quanto custa por mês.','Anote os problemas mais comuns de cada ferramenta.'],ir:['view','sistemas'],irTxt:'Abrir Sistemas'},
 {id:'dre',t:'DRE e orçamento',r:'Se este módulo estiver liberado, é onde ficam os números financeiros do ano.',mod:'dre',
  passos:['Em <b>Configurar</b>, confira as unidades e as categorias de despesa.','Em <b>Orçamento</b>, lance as metas de receita de cada mês.','Em <b>Lançar o mês</b>, registre o realizado de cada mês fechado.','O diagnóstico usa esses números sozinho: receita, verba de marketing e resultado aparecem preenchidos nas áreas.'],
  ir:['view','dre'],irTxt:'Abrir DRE e orçamento'},
 {id:'resultados',t:'Resultados',r:'O retrato completo, que a LORSO apresenta à reitoria.',
  passos:['A <b>maturidade geral</b> e a de cada área, com a meta tracejada no gráfico.','<b>Onde atacar primeiro</b>: as áreas menos maduras e com mais problemas ficam no canto vermelho.','<b>Causas raiz</b>: o que explica os problemas, agrupado e em ordem de peso.','<b>Confiança do diagnóstico</b>: quanto foi comprovado e o que ninguém soube responder.'],
  dica:'Os resultados mudam conforme as respostas chegam. A leitura final é feita pela LORSO com você.',ir:['stage','resultados'],irTxt:'Ver os Resultados'},
 {id:'plano',t:'Plano de ação',r:'O que vai ser feito, por quem e até quando.',
  passos:['A LORSO monta o plano a partir do diagnóstico e apresenta para a reitoria aprovar.','Cada ação tem um dono na instituição, um prazo, o número de hoje e a meta.','Se você for dono de uma ação, confira o prazo e a meta e avise a LORSO se algo não for viável.'],
  ir:['view','plano'],irTxt:'Abrir o Plano de ação'},
 {id:'execucao',t:'Execução no dia a dia',r:'O quadro onde as ações aprovadas são acompanhadas até ficarem prontas.',
  passos:['Cada ação é um cartão nas colunas <b>A fazer</b>, <b>Em andamento</b>, <b>Em revisão</b> e <b>Concluída</b>.','Arraste o cartão para a coluna certa quando a situação mudar.','Clique no cartão para ver detalhes, dono e prazo.','Cartões atrasados aparecem destacados.'],
  ir:['stage','execucao'],irTxt:'Abrir a Execução'},
 {id:'duvidas',t:'Boas práticas e dúvidas',r:'O que ajuda o diagnóstico a ficar fiel e útil.',
  passos:['Responda pensando em <b>como é hoje</b>, mesmo que já exista um plano para mudar.','Prefira "Não se aplica / não sei" a chutar.','Envie números reais sempre que possível. Estimativa também vale, desde que você anote na observação.','Se várias pessoas preenchem, combinem quem responde cada área.','Dúvidas sobre uma pergunta? Anote na observação e fale com a LORSO: a equipe vê tudo em tempo real.']}
];
const guiaKey=()=>'cd.guia.'+(me?me.id:'anon');
function guiaLidos(){ try{ return new Set(JSON.parse(localStorage.getItem(guiaKey())||'[]')); }catch(e){ return new Set(); } }
function guiaMarcar(id,on){ const s=guiaLidos(); on?s.add(id):s.delete(id); try{ localStorage.setItem(guiaKey(),JSON.stringify([...s])); }catch(e){} }
function guiaVisivel(){ return GUIA.filter(c=>!c.mod||(typeof temMod==='function'&&cur&&temMod(c.mod))); }
function guiaMock(k){
  if(k==='salvo') return `<div class="gm gm-salvo"><span class="status busy"><i></i>Salvando…</span><span class="gm-seta">→</span><span class="status"><i></i>Salvo</span></div>`;
  if(k==='escala') return `<div class="gm gm-escala">${[1,2,3,4].map(n=>`<span class="gm-n n${n}"><b>N${n}</b>${LVL[n]}</span>`).join('')}<span class="gm-n na"><b>—</b>Não sei</span></div>`;
  return ''; }
function guiaIr(a,v){ if(a==='dstep'){ ui.view='fases'; ui.stage='diagnostico'; ui.dstep=v; } else if(a==='stage'){ ui.view='fases'; ui.stage=v; } else ui.view=v; saveUi(); render(); window.scrollTo({top:0}); }
function renderGuia(){
  const C=guiaVisivel(), lidos=guiaLidos(); let at=ui.guiaCap&&C.some(c=>c.id===ui.guiaCap)?ui.guiaCap:(C.find(c=>!lidos.has(c.id))||C[0]).id; ui.guiaCap=at;
  const i=C.findIndex(c=>c.id===at), c=C[i], nl=C.filter(x=>lidos.has(x.id)).length;
  $('#main').innerHTML=`<section class="panel guia">
   <header class="ph" style="grid-template-columns:minmax(0,1fr) auto"><div><span class="eyebrow">Apoio · <b>Guia</b></span><h2 style="margin-top:8px">Guia de preenchimento</h2><p class="lead">Do primeiro acesso aos resultados, em ${C.length} capítulos curtos. Volte aqui sempre que tiver dúvida.</p></div>
    <div><button class="btn" data-act="guia-print">Salvar em PDF</button></div></header>
   <div class="gprog"><span style="width:${Math.round(nl/C.length*100)}%"></span></div><p class="muted" style="font-size:12.5px;margin:6px 0 0">${nl} de ${C.length} capítulos lidos</p>
   <div class="gwrap"><nav class="gcaps" aria-label="Capítulos">${C.map((x,k)=>`<button class="gcap ${x.id===at?'on':''} ${lidos.has(x.id)?'lido':''}" data-act="guia-cap" data-v="${x.id}" ${x.id===at?'aria-current="step"':''}><span class="gn">${lidos.has(x.id)?ico('check',13):k+1}</span><span>${esc(x.t)}</span></button>`).join('')}</nav>
    <article class="gcard"><span class="gstep">Capítulo ${i+1} de ${C.length}</span><h3>${esc(c.t)}</h3><p class="glead">${esc(c.r)}</p>
     ${c.mock?guiaMock(c.mock):''}
     <ol class="gpassos">${c.passos.map(p=>`<li><span>${p}</span></li>`).join('')}</ol>
     ${c.dica?`<p class="gdica">${ico('alerta',15)}<span>${esc(c.dica)}</span></p>`:''}
     <div class="gnav">${i>0?`<button class="btn" data-act="guia-cap" data-v="${C[i-1].id}">← Anterior</button>`:'<span></span>'}
      <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end">${c.ir?`<button class="btn" data-act="guia-ir" data-a="${c.ir[0]}" data-v="${c.ir[1]}">${esc(c.irTxt)}</button>`:''}
      ${i<C.length-1?`<button class="btn primary" data-act="guia-prox" data-v="${c.id}" data-n="${C[i+1].id}">Entendi, próximo →</button>`:`<button class="btn primary" data-act="guia-fim" data-v="${c.id}">Concluir o guia</button>`}</div></div></article></div>
   <div class="gall">${C.map((x,k)=>`<section class="gprint"><h3>${k+1}. ${esc(x.t)}</h3><p>${esc(x.r)}</p><ol>${x.passos.map(p=>`<li>${p}</li>`).join('')}</ol>${x.dica?`<p><i>${esc(x.dica)}</i></p>`:''}</section>`).join('')}</div>
  </section>`; }
function guiaBanner(){ if(!me||me.papel!=='cliente')return ''; let v=null; try{ v=localStorage.getItem(guiaKey()+'.ok'); }catch(e){} if(v)return '';
  return `<section class="gban"><div>${ico('guia',22)}<div><b>Primeira vez por aqui?</b><span>O guia mostra, passo a passo, como preencher o diagnóstico. Leva poucos minutos.</span></div></div><div style="display:flex;gap:8px"><button class="btn" data-act="guia-ban-x">Agora não</button><button class="btn primary" data-act="guia-abrir">Abrir o guia</button></div></section>`; }
function guiaClick(act,d){
  if(act==='guia-cap'){ ui.guiaCap=d.v; render(); window.scrollTo({top:0}); return true; }
  if(act==='guia-prox'){ guiaMarcar(d.v,true); ui.guiaCap=d.n; render(); window.scrollTo({top:0}); return true; }
  if(act==='guia-fim'){ guiaMarcar(d.v,true); try{ localStorage.setItem(guiaKey()+'.ok','1'); }catch(e){} toast('Guia concluído. Ele continua em Apoio › Guia de preenchimento.'); render(); return true; }
  if(act==='guia-ir'){ guiaIr(d.a,d.v); return true; }
  if(act==='guia-abrir'){ try{ localStorage.setItem(guiaKey()+'.ok','1'); }catch(e){} ui.view='guia'; saveUi(); render(); window.scrollTo({top:0}); return true; }
  if(act==='guia-ban-x'){ try{ localStorage.setItem(guiaKey()+'.ok','1'); }catch(e){} render(); return true; }
  if(act==='guia-print'){ document.body.classList.add('printing','guia-printing'); setTimeout(()=>{ window.print(); document.body.classList.remove('printing','guia-printing'); },50); return true; }
  return false; }
