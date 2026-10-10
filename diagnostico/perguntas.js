/* Central de Diagnóstico · banco de perguntas, áreas e fases.
   Para editar perguntas: cada uma é [id, título curto, pilar (P/E/F/C), impacto (1-3), eliminatória (0/1), enunciado, [N1, N2, N3, N4]].
   Nunca reutilize um id antigo para outra pergunta: as respostas ficam gravadas pelo id. */

/* ================= BANCO DE PERGUNTAS ================= */
const PIL = {P:'Processos', E:'Pessoas', F:'Ferramentas', C:'Cultura'};
const LVL = ['—','Iniciante','Estruturado','Otimizado','Escalável'];
const IMP = {3:'Impacto alto',2:'Impacto médio',1:'Impacto baixo'};

// campo: [chave, rótulo, tipo]  tipo: n número | R$ moeda | % percentual | min minutos | d dias | t texto
const UNFIN = [['meta_mat','Meta de matrículas','n'],['meta_rec','Meta de receita','R$'],['receita','Receita realizada','R$'],['folha','Folha de pagamento','R$'],['orcamento','Orçamento de marketing','R$'],['alunos','Alunos ativos','n'],['dem_mkt','Demandas enviadas ao marketing no mês','n'],['dem_atraso','Demandas atrasadas pelo marketing','n']];

// pergunta: [id, título curto, pilar, impacto, eliminatória, enunciado, [N1, N2, N3, N4]]
const AREAS = [
 {id:'demandas',g:'Operação do marketing',nome:'Gestão de demandas',desc:'Como coordenadores e UNs pedem ao marketing, como o marketing prioriza e em quanto tempo entrega.',
  vol:[['recebidas','Demandas recebidas no mês','n'],['abertas','Demandas em aberto','n'],['prazo_medio','Prazo médio de entrega','d'],['no_prazo','Entregues no prazo','%'],['urgentes','Pedidos marcados como urgentes','%'],['solicitantes','Solicitantes ativos (coordenadores e gestores)','n'],['canais','Por onde os pedidos chegam hoje','t']],
  q:[
  ['dem1','Canal de entrada','P',3,0,'Como coordenadores e UNs pedem demandas ao marketing?',['WhatsApp, e-mail, corredor: cada um de um jeito','E-mail ou planilha central, sem padrão de informação','Formulário único de solicitação com campos obrigatórios','Portal de solicitações ligado à gestão de tarefas, com status visível ao solicitante']],
  ['dem2','Priorização','P',3,1,'Como o marketing decide o que fazer primeiro?',['Quem pressiona mais ou o cargo mais alto','O gestor decide caso a caso','Critérios definidos (impacto, prazo, calendário de captação)','Regra pública de priorização, com capacidade reservada por UN']],
  ['dem3','Prazo e SLA','P',3,0,'Existe prazo padrão por tipo de demanda?',['Não, tudo é para ontem','Prazos combinados caso a caso','SLA por tipo de peça, divulgado aos solicitantes','SLA monitorado, com cumprimento medido por UN']],
  ['dem4','Visibilidade do andamento','F',2,0,'O coordenador consegue ver o andamento do que pediu?',['Não; precisa perguntar','Só quando pergunta ao responsável','Quadro compartilhado com status','Avisos automáticos a cada mudança de etapa']],
  ['dem5','Planejamento antecipado','C',2,0,'As UNs planejam as demandas com antecedência?',['Tudo chega em cima da hora','Algumas datas fixas são conhecidas','Calendário semestral combinado com as UNs','Planejamento trimestral conjunto, com demandas previstas em backlog']]]},
 {id:'fluxo',g:'Operação do marketing',nome:'Fluxo e metodologia',desc:'Como o trabalho anda dentro do marketing: etapas, método, aprovações, capacidade e retrabalho.',
  vol:[['metodo','Metodologia em uso hoje','t'],['etapas','Etapas do fluxo hoje (do pedido à publicação)','t'],['rodadas','Rodadas médias de aprovação','n'],['retrabalho','Peças com retrabalho','%'],['wip','Tarefas em andamento por pessoa','n']],
  q:[
  ['flu1','Metodologia de trabalho','P',3,0,'Existe uma metodologia de gestão do trabalho?',['Não; cada pessoa se organiza','Lista de tarefas compartilhada, sem método','Kanban ou ágil com etapas definidas','Método ágil com ritos, limite de trabalho em andamento e métricas de fluxo']],
  ['flu2','Aprovações','P',3,0,'Como funcionam as aprovações?',['Muitos aprovam, sem ordem e sem limite de rodadas','Um aprovador por UN, rodadas ilimitadas','Fluxo de aprovação com prazo de resposta','Aprovador único, até 2 rodadas e aprovação tácita no prazo']],
  ['flu3','Briefing completo','P',2,0,'As demandas chegam com as informações necessárias?',['Raramente; o marketing corre atrás','Às vezes, depende do solicitante','Briefing padrão obrigatório','Briefing validado antes de entrar na fila, devolvido se incompleto']],
  ['flu4','Gestão de capacidade','E',3,0,'O marketing conhece a própria capacidade de entrega?',['Não; aceita tudo e atrasa','Percebe a sobrecarga, sem medir','Mede volume por pessoa e renegocia prazos','Planeja capacidade por período e reserva cota por UN']],
  ['flu5','Retrabalho','C',2,0,'Com que frequência há retrabalho por mudança de pedido?',['Quase sempre','Com frequência','Às vezes, com causa registrada','Raramente; causas tratadas na origem']]]},
 {id:'sistemas',g:'Operação do marketing',nome:'Sistemas e ferramentas',desc:'Quais sistemas o marketing usa, se conversam entre si e onde geram trabalho manual. Detalhe cada sistema na aba Sistemas.',
  vol:[['qtd','Sistemas em uso','n'],['custo','Custo mensal de licenças','R$'],['horas_manuais','Horas por semana em tarefas manuais entre sistemas','n']],
  q:[
  ['sis1','Gestão de tarefas','F',3,0,'Onde o marketing controla as tarefas?',['WhatsApp e e-mail','Planilha','Ferramenta de gestão usada por parte do time','Ferramenta única usada por todos, com solicitantes dentro']],
  ['sis2','Sobreposição de ferramentas','F',2,0,'Existem ferramentas diferentes fazendo a mesma coisa?',['Muitas; cada time usa a sua','Algumas duplicidades conhecidas','Conjunto definido, poucas exceções','Conjunto único, com dono por ferramenta']],
  ['sis3','Trabalho manual entre sistemas','F',3,0,'Quanto trabalho manual existe para passar informação entre sistemas?',['Muito: copiar e colar é rotina','Exportações frequentes de planilha','Integrações cobrem os fluxos principais','Integrações automáticas; quase nada manual']],
  ['sis4','Domínio das ferramentas','E',2,0,'O time domina as ferramentas que tem?',['Usa o básico; muitas funções ignoradas','Alguns dominam, outros não','Treinamento inicial para todos','Trilha de capacitação e responsável por ferramenta']],
  ['sis5','Acessos e licenças','P',1,0,'Acessos e licenças são controlados?',['Logins compartilhados, sem controle','Controle informal','Acessos individuais e lista de licenças','Gestão central de acessos e custos']]]},
 {id:'smarketing',g:'Operação do marketing',nome:'Marketing & Comercial',desc:'Alinhamento entre marketing e comercial: definição de lead qualificado, feedback, passagem de bastão e velocidade de contato.',
  vol:[['conv_insc','Inscrito → matrícula','%'],['speed','Tempo médio do primeiro contato','min'],['reunioes','Reuniões de alinhamento no mês','n']],
  q:[
  ['sma1','Definição de lead qualificado','P',3,0,'Como é definido o momento em que um lead está pronto para o comercial?',['Qualquer contato com e-mail ou telefone vai direto para o comercial','Enviado por curso ou formulário, sem validar perfil','Acordo básico de perfil, com filtro manual da triagem','SLA documentado e automatizado no CRM (score ou validação obrigatória de dados)']],
  ['sma2','Feedback do comercial','P',3,0,'Com que frequência e de que forma o comercial devolve informação sobre a qualidade dos leads?',['Sem canal oficial; só reclamação informal','Status no CRM, que o marketing raramente analisa','Reunião mensal de fechamento, com correção lenta','Comitê semanal com motivos de perda; o marketing ajusta campanhas em tempo real']],
  ['sma3','Passagem de bastão','F',3,0,'Como o lead passa da ferramenta de marketing para o sistema de vendas?',['Planilha exportada e distribuída à mão','Integração básica: só nome e telefone','Integração com histórico, mas com duplicidade ou atraso','Integração em tempo real, com histórico completo e UN já segmentada']],
  ['sma4','Distribuição e velocidade','P',3,0,'Como os leads são distribuídos e em quanto tempo há a primeira abordagem?',['Lista geral; cada um pega o que quer; mais de 24h','Distribuição manual diária; 4 a 12h','Distribuição automática em fila; 1 a 2h','Distribuição imediata por especialidade; leads quentes em menos de 15 min']]]},
 {id:'plataforma',g:'Marketing central',nome:'Plataforma / Tecnologia',desc:'Base técnica que sustenta todas as frentes: rastreamento, integrações, dados e autonomia de publicação.',
  vol:[['sites','Sites e LPs ativos','n'],['stack','Ferramentas em uso','t'],['chamados_ti','Chamados abertos com TI','n']],
  q:[
  ['plat1','Rastreamento de conversões','F',3,1,'Como está o rastreamento de conversões nos sites e landing pages?',['Não há tags ou pixels confiáveis instalados','Pixels e GA4 instalados, sem plano de eventos','Plano de tagueamento via GTM com eventos-chave por UN','Tracking server-side, eventos padronizados e auditados todo mês']],
  ['plat2','Integração entre sistemas','F',3,0,'Os sistemas (site, CRM, sistema acadêmico, mídia) conversam entre si?',['Bases isoladas, exportação manual em planilha','Integrações pontuais por planilha ou automações simples','Integrações nativas ou por API entre os principais sistemas','Fluxo integrado em tempo real com uma fonte única da verdade']],
  ['plat3','Governança de dados e LGPD','P',2,0,'Como são tratadas a governança de dados e a LGPD?',['Sem política; consentimento não é coletado','Política publicada, sem processo de gestão','Consentimento registrado e base higienizada periodicamente','Dono do dado definido, auditoria e consentimento gerenciados automaticamente']],
  ['plat4','Autonomia do marketing','E',2,0,'Qual a autonomia do marketing para publicar páginas e ajustes no site?',['Depende da TI para tudo, com prazos de semanas','Edita textos; páginas novas dependem da TI','Construtor de LP próprio com templates aprovados','Publicação autônoma com design system e testes A/B nativos']],
  ['plat5','Performance técnica','C',1,0,'A velocidade e a experiência mobile dos sites são acompanhadas?',['Nunca foram medidas','Medidas pontualmente, com problemas conhecidos','Core Web Vitals monitorado e dentro do aceitável','Monitoramento contínuo com metas e alertas']]]},
 {id:'crm',g:'Marketing central',nome:'CRM',desc:'Onde a jornada do lead fica registrada. Sem cobertura e adoção, nenhum outro dado é confiável.',
  vol:[['ferramenta','CRM utilizado','t'],['usuarios','Usuários ativos','n'],['leads','Leads no mês','n'],['sem_etapa','Leads sem etapa atualizada','%'],['automacoes','Automações ativas','n']],
  q:[
  ['crm1','Cobertura de leads','P',3,1,'Quantos leads de todas as UNs e canais entram no CRM?',['Não há CRM, ou só parte do time usa','Mídia paga entra; balcão, telefone e eventos ficam fora','Todos os canais digitais e o call center registram','100% dos pontos de contato, inclusive visitas e eventos presenciais']],
  ['crm2','Etapas do funil','P',3,0,'O funil no CRM tem etapas e critérios de passagem definidos?',['Não há etapas; é uma lista de contatos','Etapas existem, cada consultor usa de um jeito','Etapas padronizadas por UN com critérios de entrada e saída','Etapas padronizadas, SLA por etapa e alerta de lead parado']],
  ['crm3','Automação e réguas','F',2,0,'Qual o nível de automação de relacionamento?',['Nenhuma automação','E-mails manuais em massa','Réguas automáticas por etapa e por UN','Automação multicanal (e-mail, WhatsApp, SMS) por comportamento e score']],
  ['crm4','Lead scoring','F',2,0,'Existe pontuação de leads (lead scoring)?',['Não','Critérios informais, na cabeça do consultor','Score por perfil e engajamento configurado no CRM','Score preditivo revisado com base em matrículas reais']],
  ['crm5','Adoção pelo time','E',3,0,'Como o time comercial usa o CRM no dia a dia?',['Resistência; preferem planilha ou WhatsApp pessoal','Usam por obrigação, com registros incompletos','Uso consistente, gestores cobram atualização','O CRM é a ferramenta de trabalho; a gestão sai só dele']]]},
 {id:'redes',g:'Marketing central',nome:'Redes Sociais',desc:'Presença, comunidade e geração de demanda nos perfis da marca e das UNs.',
  vol:[['perfis','Perfis ativos','n'],['posts','Posts no mês','n'],['leads_social','Leads gerados por social no mês','n'],['resp_dm','Tempo médio de resposta a DMs','min']],
  q:[
  ['red1','Linha editorial','P',2,0,'Existe linha editorial e calendário por perfil ou UN?',['Posts no improviso','Calendário mensal genérico para todas as UNs','Linha editorial por UN com pilares de conteúdo','Planejamento por persona e jornada, revisado todo mês por dados']],
  ['red2','Segmentação por público','C',2,0,'Como as redes falam com públicos diferentes (pais, vestibulandos, profissionais, pesquisadores)?',['Mesma mensagem para todos','Separação pontual em campanhas','Editorias ou perfis distintos por UN','Estratégia por público com formato, tom e horário próprios']],
  ['red3','Social como canal de conversão','P',3,0,'As redes geram leads mensuráveis?',['Não medimos','Link na bio e direct, sem rastreio','Formulários, UTMs e directs integrados ao CRM','Lead ads integrados, com atribuição e SLA de resposta']],
  ['red4','Gestão de comunidade','E',2,0,'Como são tratados comentários e directs?',['Respondidos quando sobra tempo','Responsável definido, sem prazo','SLA de resposta e roteiro de respostas','Social listening; leads de DM vão para o comercial na hora']],
  ['red5','Embaixadores e UGC','C',1,0,'Alunos, ex-alunos e professores participam da comunicação?',['Não','Repostamos ocasionalmente','Programa de embaixadores com calendário','Programa de creators e UGC com incentivos e métricas']]]},
 {id:'captacao',g:'Operação',nome:'Captação',desc:'Geração de demanda inbound e outbound: dependência de canais, nutrição e velocidade de resposta.',
  vol:[['leads','Leads no mês','n'],['midia','Investimento em mídia no mês','R$'],['cpl','CPL','R$'],['cac','CAC','R$'],['speed','Tempo até o primeiro contato','min'],['descarte','Leads descartados pelo comercial','%']],
  q:[
  ['cap1','Matriz de canais','P',3,0,'Como está dividida a matriz de canais de aquisição?',['Dependência de um único canal (só indicação ou só Meta Ads)','Pago e orgânico, sem previsibilidade','Mix de canais com meta e orçamento por canal','SEO, social, pago, outbound e parcerias, com volume previsível']],
  ['cap2','Nutrição pós-captação','P',3,0,'Existe fluxo de nutrição depois que o lead se cadastra?',['Se não comprou na hora, é esquecido','E-mails manuais ou newsletter esporádica','Réguas automáticas por etapa e por curso','Réguas por comportamento no site, com reentrada no funil']],
  ['cap3','Speed to lead','P',3,1,'Em quanto tempo um lead novo recebe o primeiro contato?',['Mais de 24h, ou nunca','No mesmo dia, sem controle','Até 1h, com SLA monitorado','Até 5 minutos, com distribuição automática']],
  ['cap4','Qualidade do lead (ICP)','C',2,0,'Marketing e comercial concordam sobre o que é um lead qualificado?',['Não existe definição','Definição verbal, cada um interpreta','Critérios de MQL e SQL documentados','Critérios revistos todo mês, com taxa de descarte medida']],
  ['cap5','Orçamento e CAC','F',2,0,'Como o orçamento de mídia é decidido?',['Valor fixo histórico','Divisão por intuição entre UNs','Por meta de matrícula e CAC alvo por UN','Realocação semanal por CAC e LTV']]]},
 {id:'criacao',g:'Operação',nome:'Criação',desc:'Capacidade de produzir ativos em escala, com marca consistente e pouco retrabalho.',
  vol:[['artes','Artes produzidas no mês','n'],['entregas','Entregas no mês','n'],['no_prazo','Entregas no prazo','%'],['fila','Demandas em fila','n'],['refacao','Taxa de refação','%']],
  q:[
  ['cri1','Aprovação de peças','P',2,0,'Como funciona a aprovação de criativos e campanhas?',['WhatsApp ou e-mail solto, versões confusas','Ferramenta de gestão, com muitas idas e vindas','Fluxo de aprovação com prazos e responsáveis','Plataforma de aprovação com versionamento e no máximo 2 rodadas']],
  ['cri2','Marca e tom de voz','C',2,0,'Existe manual de marca e guia de tom de voz?',['Criamos no feeling','Manual básico (logo e cores)','Manual completo com diretrizes por UN','Design system e tom de voz aplicados por equipe e fornecedores']],
  ['cri3','Briefing','P',2,0,'Como as demandas chegam à criação?',['Pedidos soltos, sem briefing','Briefing em texto livre','Formulário padrão com objetivo, público e KPI','Briefing ligado à campanha e à métrica, priorizado por impacto']],
  ['cri4','Reaproveitamento de ativos','F',1,0,'Os conteúdos são reaproveitados em vários formatos?',['Cada peça nasce do zero','Reaproveitamos por iniciativa individual','Biblioteca de ativos organizada','1 macroconteúdo vira 10+ microconteúdos com templates']],
  ['cri5','Capacidade do time','E',2,0,'A capacidade da criação atende o volume de demandas?',['Fila constante e atrasos frequentes','Atende com horas extras nos picos','Capacidade planejada pelo calendário de captação','Capacidade elástica (time, parceiros e IA) com SLA cumprido']]]},
 {id:'growth',g:'Operação',nome:'Growth',desc:'Cultura de experimentação, atribuição e decisão por dados.',
  vol:[['experimentos','Experimentos no mês','n'],['roas','ROAS','n'],['conv_lp','Conversão média das LPs','%'],['desperdicio','Verba acima do CAC limite','R$']],
  q:[
  ['gro1','Ritmo de testes','C',3,0,'Qual é o ritmo de testes do time?',['Não testamos; mudamos quando dá errado','Testes A/B ocasionais','Backlog priorizado com cadência quinzenal','3 a 5 experimentos por semana com aprendizados documentados']],
  ['gro2','Atribuição','F',3,0,'Como é feita a atribuição das matrículas?',['Não sabemos qual canal gerou a matrícula','Last click padrão do GA','UTM rastreada até a matrícula no CRM','Atribuição multitoque ligada a matrícula e receita']],
  ['gro3','Dashboards','F',2,0,'Como os resultados são acompanhados?',['Relatórios manuais esporádicos','Planilha mensal consolidada à mão','Dashboard automatizado por canal e UN','Dashboard em tempo real com metas, alertas e projeção']],
  ['gro4','Otimização de conversão','P',2,0,'As landing pages são otimizadas de forma contínua?',['Nunca são revisadas','Ajustes quando alguém reclama','Revisão mensal com base em dados','Programa de CRO com heatmaps, testes e metas']],
  ['gro5','Decisão por dados','C',2,0,'Como as decisões de marketing são tomadas?',['Opinião do gestor','Dados consultados depois da decisão','Dados no centro das reuniões semanais','Hipótese, experimento e métrica antes de qualquer mudança']]]},
 {id:'callcenter',g:'Operação',nome:'Call Center',desc:'Capacidade de absorver a demanda gerada, com registro, roteiro e qualidade sob pressão.',
  vol:[['atend','Atendimentos no mês','n'],['abertos','Chamados em aberto','n'],['tma','TMA','min'],['tme','TME','min'],['abandono','Taxa de abandono','%'],['fcr','Resolução no primeiro contato','%']],
  q:[
  ['cc1','Distribuição de chamados','P',2,0,'Qual é o modelo de distribuição de chamados?',['Manual ou por ordem de chegada','URA básica por assunto','Distribuição automática por UN e fila','Roteamento por histórico do lead e perfil do atendente']],
  ['cc2','Base de conhecimento','F',2,0,'Como é feita a gestão das respostas do time?',['Na cabeça dos atendentes','FAQ ou PDF compartilhado','Base de conhecimento por UN, atualizada','Base viva integrada ao sistema, sugerindo respostas']],
  ['cc3','Capacidade nos picos','E',3,0,'O call center absorve os picos de captação (vestibular, rematrícula)?',['Abandono alto e fila sem controle','Reforço improvisado nos picos','Dimensionamento planejado pelo calendário','Previsão de volume, com bot e WhatsApp absorvendo o simples']],
  ['cc4','Registro no CRM','P',3,0,'As ligações e conversas são registradas no CRM?',['Não','Parcialmente, quando o atendente lembra','Todo contato registrado com motivo','Registro automático (telefonia e WhatsApp integrados) com tabulação']],
  ['cc5','Roteiro e autonomia','E',1,0,'O atendente tem roteiro e autonomia para resolver?',['Sem roteiro, tudo sobe para o gestor','Roteiro básico, pouca autonomia','Roteiros por UN e alçadas definidas (descontos, bolsas)','Roteiros por perfil, alçadas claras e monitoria de qualidade']]]},
 {id:'b2b',g:'Operação',nome:'Comercial B2B',desc:'Previsibilidade de receita corporativa, qualificação e passagem de bastão.',
  vol:[['vendas','Vendas no mês','n'],['atend','Atendimentos e reuniões no mês','n'],['propostas','Propostas ativas','n'],['pipeline','Valor em pipeline','R$'],['ciclo','Ciclo de vendas','d'],['ticket','Ticket médio (ACV)','R$']],
  q:[
  ['b2b1','Qualificação','P',3,0,'Existe qualificação clara antes da proposta?',['Vendemos para quem demonstra interesse','Critérios soltos de porte ou segmento','Critérios de ICP documentados','Framework rígido (BANT ou GPCT) integrado ao CRM']],
  ['b2b2','Passagem para a entrega','P',3,0,'Como é feita a transição do comercial para a entrega?',['O comercial fecha e joga por cima do muro','Resumo por e-mail','Reunião de passagem com checklist','Handover obrigatório com gravação e matriz de expectativas']],
  ['b2b3','Motivo de perda','P',2,0,'Os motivos de perda são registrados?',['Não','Registro livre e inconsistente','Motivos padronizados no CRM','Análise mensal de perdas que alimenta marketing e produto']],
  ['b2b4','Forecast','F',2,0,'Existe previsão de receita B2B?',['Não','Estimativa do gestor','Pipeline ponderado por etapa no CRM','Forecast semanal com acurácia medida']],
  ['b2b5','Cadência de prospecção','E',2,0,'Como funciona a prospecção ativa?',['Esporádica','Cada vendedor no seu ritmo','Cadências padronizadas no CRM','Outbound multicanal com metas de atividade e conversão']]]},
 {id:'atendimento',g:'Operação',nome:'Atendimento (CS)',desc:'Proatividade na retenção do aluno, voz do cliente e expansão da carteira.',
  vol:[['atend','Atendimentos no mês','n'],['abertos','Chamados em aberto','n'],['nps','NPS','n'],['csat','CSAT','%'],['evasao','Evasão','%']],
  q:[
  ['ate1','Postura do atendimento','C',3,0,'Qual é a postura do time de atendimento?',['Reativa: só fala quando o aluno reclama','Relacionamento sem pauta','Contatos programados nos momentos-chave da jornada','Consultiva, com plano baseado nos dados do aluno']],
  ['ate2','Gestão de risco de evasão','P',3,0,'Existe processo para identificar alunos em risco?',['Descobrimos no pedido de cancelamento','Percebemos sinais, o tratamento varia','Critérios de risco definidos e acompanhados','Alertas automáticos acionam um playbook de retenção']],
  ['ate3','Voz do aluno','F',2,0,'Como a satisfação é medida (NPS, CSAT)?',['Não medimos','Pesquisa anual','NPS ou CSAT periódico por UN','Pesquisa contínua com retorno ao aluno em até 7 dias']],
  ['ate4','Expansão e indicação','P',2,0,'O atendimento gera rematrícula, upsell e indicação?',['Não é papel do atendimento','Acontece espontaneamente','Campanhas estruturadas de rematrícula e indicação','Programa de indicação e upsell com metas e recompensas']],
  ['ate5','Onboarding do aluno','P',2,0,'Como é o início da jornada do aluno matriculado?',['Sem processo','Comunicado de boas-vindas','Jornada de onboarding nas primeiras semanas','Onboarding por curso, com acompanhamento de engajamento']]]},
 {id:'eventos',g:'Operação',nome:'Eventos',desc:'Eventos como canal de demanda e relacionamento, com orçamento e retorno medidos.',
  vol:[['eventos','Eventos no período','n'],['orcamentos','Orçamentos enviados','n'],['propostas','Propostas ativas','n'],['na_mesa','Dinheiro na mesa em oportunidades','R$'],['leads','Leads gerados','n'],['showup','Show-up rate','%']],
  q:[
  ['eve1','Pós-evento','P',3,0,'Como é feito o pós-evento com os participantes?',['Nenhum contato depois','E-mail padrão de agradecimento','Leads segmentados e nutridos por régua','Leads quentes vão para o comercial em até 24h']],
  ['eve2','Conteúdo do evento','C',2,0,'Como é planejado o conteúdo do evento?',['O que achamos legal falar','Tópicos gerais do mercado','Por persona e etapa do funil','Pelas dores mapeadas no comercial e no atendimento']],
  ['eve3','Inscrição e presença','F',2,0,'Como são geridas inscrições e presença?',['Lista em papel ou planilha','Formulário online sem integração','Inscrição integrada ao CRM, com lembretes','Check-in digital, lembretes multicanal e show-up medido']],
  ['eve4','Calendário','P',2,0,'Os eventos seguem o calendário de captação?',['Eventos isolados','Calendário anual institucional','Calendário por UN alinhado ao ciclo de captação','Calendário orientado por meta, com ROI por evento']],
  ['eve5','Retorno dos eventos','F',1,0,'O retorno dos eventos é medido?',['Não medimos','Medimos presença','Medimos leads gerados','Medimos matrículas e custo por matrícula']]]},
 {id:'colegio',g:'Unidades de negócio',un:1,nome:'Colégio',desc:'Educação básica. Decisão da família, com peso de visita, indicação e rematrícula.',
  vol:[...UNFIN,['visitas','Visitas no mês','n'],['conv_visita','Conversão visita → matrícula','%'],['rematricula','Taxa de rematrícula','%'],['indicacao','Matrículas por indicação','%']],
  q:[
  ['col1','Visitas guiadas','P',3,0,'Como é feito o agendamento e a realização das visitas?',['Pais aparecem; quem estiver livre atende sem roteiro','Agendamento prévio; conversão visita → matrícula não medida','Agendamento com roteiro padrão e conversão medida','Agendamento automatizado, roteiro de encantamento e follow-up em até 48h']],
  ['col2','Canais de decisão','C',3,0,'Qual é o principal canal de decisão mapeado?',['Não mapeamos','Só anúncios digitais locais','Anúncios locais e eventos de portas abertas','Estratégia híbrida: indicação de pais, open house e SEO local']],
  ['col3','Rematrícula','P',3,0,'Como é conduzida a rematrícula?',['Comunicado único no fim do ano','Campanha com prazo e desconto','Régua por série com contato da coordenação','Gestão de risco por família ao longo do ano e rematrícula antecipada']],
  ['col4','Programa de indicação','P',2,0,'Existe programa de indicação de pais?',['Não existe','Indicação espontânea','Programa com benefício divulgado','Programa ativo com metas, ranking e reconhecimento']],
  ['col5','Atendimento do marketing à UN','P',3,0,'Quando a coordenação precisa de uma ação do marketing, como é a experiência?',['Demora, falta retorno e a UN acaba fazendo por conta','Atende, com atrasos frequentes','Atende no prazo combinado na maioria das vezes','Atende no SLA, com planejamento conjunto e retorno de resultado']]]},
 {id:'graduacao',g:'Unidades de negócio',un:1,nome:'Graduação',desc:'Vestibular, ENEM e outras formas de ingresso, com picos de volume e funil curto.',
  vol:[...UNFIN,['inscritos','Inscritos no processo seletivo','n'],['conv_insc','Inscrito → matriculado','%'],['abandono_insc','Abandono da inscrição','%'],['aprov_nao_mat','Aprovados não matriculados','n']],
  q:[
  ['gra1','Régua pós-inscrição','P',3,0,'Como funciona a régua de relacionamento depois da inscrição?',['O candidato só recebe boleto ou link da prova','E-mails genéricos cobrando a prova','Régua por etapa (inscrito, aprovado, matriculado)','Régua por curso, com conteúdo de carreira e depoimentos']],
  ['gra2','Recuperação de abandono','F',3,0,'Como são recuperados os candidatos que abandonaram a inscrição?',['Não recuperamos','O comercial liga quando sobra tempo','Lista diária no CRM para contato','Disparos automáticos por WhatsApp e e-mail com incentivo']],
  ['gra3','Formas de ingresso','P',2,0,'Como são trabalhadas as formas de ingresso (ENEM, vestibular, transferência, 2ª graduação)?',['Uma comunicação única','Páginas separadas, mesma régua','Funis distintos por forma de ingresso','Funis distintos com ofertas e SLAs próprios']],
  ['gra4','Aprovado não matriculado','P',3,0,'O que acontece com quem foi aprovado e não se matriculou?',['Nada','Uma ligação','Régua de conversão com prazo e bolsa','Abordagem consultiva com financiamento, até a matrícula']],
  ['gra5','Atendimento do marketing à UN','P',3,0,'Quando a coordenação precisa de uma ação do marketing, como é a experiência?',['Demora, falta retorno e a UN acaba fazendo por conta','Atende, com atrasos frequentes','Atende no prazo combinado na maioria das vezes','Atende no SLA, com planejamento conjunto e retorno de resultado']]]},
 {id:'pos',g:'Unidades de negócio',un:1,nome:'Pós-Graduação',desc:'Especializações e MBAs. Venda consultiva de carreira e reaproveitamento da base.',
  vol:[...UNFIN,['leads','Leads no mês','n'],['conv','Lead → matrícula','%'],['ex_alunos','Matrículas de ex-alunos da graduação','%'],['ticket','Ticket médio','R$']],
  q:[
  ['pos1','Validação de fit','P',3,0,'Qual abordagem valida o fit do profissional com o curso?',['Venda em massa por preço e parcelamento','Marketing atrai, comercial foca na ementa','Venda consultiva por objetivo profissional','Venda consultiva de carreira, com prova de resultado']],
  ['pos2','Base de ex-alunos','F',3,0,'Como a base de ex-alunos da graduação é explorada?',['Bases separadas, sem cruzamento','E-mail em massa uma vez por ano','Campanhas por curso de origem','Régua de antecipação 6 meses antes da formatura, com condição exclusiva']],
  ['pos3','Parcerias corporativas','P',2,0,'Existem parcerias com empresas?',['Não','Convênios pontuais','Convênios ativos com comunicação nas empresas','Programa B2B com metas, turmas in company e trilhas']],
  ['pos4','Prova social','C',2,0,'Como a pós comprova o resultado dos egressos?',['Não usamos','Depoimentos genéricos','Cases por curso com cargo e empresa','Dados de empregabilidade e cases em todos os pontos de contato']],
  ['pos5','Atendimento do marketing à UN','P',3,0,'Quando a coordenação precisa de uma ação do marketing, como é a experiência?',['Demora, falta retorno e a UN acaba fazendo por conta','Atende, com atrasos frequentes','Atende no prazo combinado na maioria das vezes','Atende no SLA, com planejamento conjunto e retorno de resultado']]]},
 {id:'mestrado',g:'Unidades de negócio',un:1,nome:'Mestrado',desc:'Stricto sensu. Captação por linha de pesquisa, banca e fomento.',
  vol:[...UNFIN,['candidatos','Candidatos por edital','n'],['aprovados','Aprovados','n'],['matriculados','Matriculados','n'],['linhas_baixa','Linhas com baixa procura','t']],
  q:[
  ['mes1','Captação por linha de pesquisa','P',3,0,'Como é feita a captação para linhas de pesquisa?',['Só o edital publicado no site','Anúncios genéricos de inscrições abertas','Divulgação por linha de pesquisa com material dos orientadores','Conteúdo científico, webinars com orientadores e prospecção ativa de pesquisadores']],
  ['mes2','Seleção integrada ao CRM','F',3,0,'Como o processo seletivo (entrevista, projeto) se integra ao CRM?',['Professores avaliam em planilha ou papel; o marketing não sabe quem passou','O comercial sabe quem passou, sem histórico no sistema','Etapas da seleção registradas no CRM, sem automação','Cada etapa da banca atualiza o CRM e dispara comunicação personalizada']],
  ['mes3','Orientadores na captação','E',2,0,'Os professores orientadores participam da captação?',['Não','Quando solicitados','Webinars e conteúdos programados','Atuam como embaixadores, com agenda e metas']],
  ['mes4','Bolsas e fomento','P',2,0,'Como bolsas e agências de fomento são comunicadas?',['Só no edital','Página com informações gerais','Conteúdo por linha com prazos de fomento','Orientação ativa ao candidato durante o processo']],
  ['mes5','Atendimento do marketing à UN','P',3,0,'Quando a coordenação precisa de uma ação do marketing, como é a experiência?',['Demora, falta retorno e a UN acaba fazendo por conta','Atende, com atrasos frequentes','Atende no prazo combinado na maioria das vezes','Atende no SLA, com planejamento conjunto e retorno de resultado']]]}
];

const STAGES = [
 {n:1,id:'diagnostico',nome:'Diagnóstico',ds:'Entrevistas 1 a 1 por área e UN, maturidade e FOFA.'},
 {n:2,id:'estrategia',nome:'Estratégia',ds:'Metas, funil, verba e projeção de retorno.',
  intro:'Com o diagnóstico feito, esta fase mede se o plano existe e se está amarrado a números.',
  vol:[['metas_un','Metas trimestrais por UN','t'],['verba_total','Verba total de marketing no ano','R$'],['funil_alvo','Funil-alvo (taxas por etapa)','t'],['riscos','Riscos estratégicos','t']],
  q:[
  ['est1','Metas trimestrais','P',3,0,'As metas de marketing são definidas por trimestre e por UN?',['Não há metas formais','Meta anual geral de matrículas','Metas trimestrais por UN','Metas por UN, canal e etapa do funil, revisadas todo mês']],
  ['est2','Desenho de funil','P',3,0,'O funil de cada UN está desenhado com taxas de conversão por etapa?',['Não','Funil genérico, igual para todas as UNs','Funil por UN com taxas históricas','Funil por UN com taxas-alvo e gargalos monitorados']],
  ['est3','Alocação de verba','F',3,0,'Como a verba é alocada entre UNs e canais?',['Repetida do ano anterior','Dividida por UN sem critério de retorno','Por meta e CAC alvo','Alocação dinâmica por ROI, com reserva para testes']],
  ['est4','Projeção de retorno','F',2,0,'Existe projeção de retorno (matrículas, receita, LTV) do investimento?',['Não','Estimativa simples de matrículas','Projeção por UN com CAC e ticket','Modelo LTV/CAC por UN com cenários']],
  ['est5','Posicionamento por UN','C',2,0,'Cada UN tem proposta de valor e posicionamento claros?',['Mensagem institucional única','Diferenciais listados sem prioridade','Proposta de valor por UN documentada','Posicionamento validado com pesquisa e concorrência']]]},
 {n:3,id:'execucao',nome:'Execução',ds:'Time, rituais, SLAs e plano de ação.',
  intro:'Avalia a capacidade de tirar o plano do papel e transforma os achados em ações com dono e prazo.',
  vol:[['time','Tamanho do time de marketing','n'],['agencias','Agências e fornecedores','t'],['rituais','Rituais de gestão existentes','t']],
  q:[
  ['exe1','Papéis do time','E',3,0,'Os papéis do time de marketing estão claros?',['Todo mundo faz tudo','Papéis informais','Responsabilidades definidas por área','Squads por UN ou objetivo, com dono de meta']],
  ['exe2','Ritual de gestão','P',3,0,'Existe rotina de acompanhamento?',['Reuniões só em crise','Reunião mensal de resultados','Weekly de performance com plano de ação','Ritos semanais e trimestrais (OKR) com registro de decisões']],
  ['exe3','SLA entre áreas','P',3,0,'Existem acordos de nível de serviço entre marketing, comercial e atendimento?',['Não','Combinados verbais','SLAs documentados','SLAs monitorados com indicadores e revisão']],
  ['exe4','Gestão de fornecedores','P',2,0,'Como agências e fornecedores são geridos?',['Sem entrega clara em contrato','Escopo sem KPI','Escopo, KPIs e reunião mensal','Gestão por performance com scorecard']],
  ['exe5','Velocidade de entrega','C',2,0,'Quanto tempo leva para tirar uma campanha do papel?',['Mais de 30 dias','2 a 4 semanas','1 a 2 semanas com templates','Menos de 1 semana, com processo e ativos prontos']]]},
 {n:4,id:'otimizacao',nome:'Otimização',ds:'IA, dados, segmentação e testes.',
  intro:'Mede a capacidade de melhorar continuamente e organiza o backlog de experimentos.',
  vol:[['ferr_ia','Ferramentas de IA em uso','t'],['base_dados','Onde ficam os dados consolidados','t']],
  q:[
  ['oti1','Uso de IA','F',2,0,'Como a IA é usada no marketing?',['Não é usada','Uso individual e pontual','Uso padronizado em criação, atendimento ou análise','Integrada aos processos (score, segmentação, criativos, atendimento) com governança']],
  ['oti2','Engenharia de dados','F',3,0,'Os dados de marketing, CRM e acadêmico estão unificados?',['Não','Cruzamentos manuais eventuais','Base unificada atualizada periodicamente','Data warehouse com atualização diária']],
  ['oti3','Segmentação','P',2,0,'Como a base é segmentada?',['Base única para tudo','Segmentos por UN','Por UN, curso e etapa','Segmentação dinâmica por comportamento e propensão']],
  ['oti4','Otimização de criativos','P',2,0,'Como os criativos são otimizados?',['Rodam até acabar a verba','Trocamos quando o desempenho cai muito','Rotação planejada por fadiga (frequência, CTR)','Testes contínuos com biblioteca de aprendizados']],
  ['oti5','Ciclo de melhoria','C',2,0,'Os aprendizados viram padrão?',['Não são registrados','Ficam com quem testou','Documentados em repositório','Viram playbooks e treinamentos']]]},
 {n:5,id:'resultados',nome:'Resultados',ds:'Mapa de maturidade, incongruências e FOFA.',
  intro:'Consolida o diagnóstico: maturidade por área e pilar, cruzamentos financeiros das UNs, incongruências e FOFA.',
  vol:[],
  q:[
  ['res1','Transparência','C',2,0,'Como os resultados são compartilhados?',['Não são compartilhados','Relatório mensal para a diretoria','Dashboard acessível às lideranças','Dashboard em tempo real aberto a todos os times']],
  ['res2','Comprovação de ROI','F',3,0,'O retorno do marketing é comprovado?',['Não medimos','ROI estimado por campanha','ROI por canal e UN','ROI até receita e LTV, auditado com o financeiro']],
  ['res3','Revisão da estratégia','P',2,0,'Com que frequência a estratégia é revista?',['Nunca','Anual','Trimestral, com base em resultados','Contínua, com novo diagnóstico de maturidade periódico']]]}
];

const ALLQ = {}; const QAREA = {};
AREAS.forEach(a=>a.q.forEach((x,i)=>{ALLQ[x[0]]=x; QAREA[x[0]]=a.id; x.code=(a.id.slice(0,3)+'-'+String(i+1).padStart(2,'0')).toUpperCase();}));
STAGES.forEach(s=>(s.q||[]).forEach((x,i)=>{ALLQ[x[0]]=x; QAREA[x[0]]=s.id; x.code=(s.id.slice(0,3)+'-'+String(i+1).padStart(2,'0')).toUpperCase();}));
const AREA = Object.fromEntries(AREAS.map(a=>[a.id,a]));
const STG = Object.fromEntries(STAGES.map(s=>[s.id,s]));
const UNS = AREAS.filter(a=>a.un);
const nameOf = id => (AREA[id]||STG[id]||{nome:id}).nome;

