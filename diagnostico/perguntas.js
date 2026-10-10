/* Central de Diagnóstico · banco de perguntas, áreas e fases.
   Para editar perguntas: cada uma é [id, título curto, pilar (P/E/F/C), impacto (1-3), eliminatória (0/1), enunciado, [N1, N2, N3, N4]].
   Nunca reutilize um id antigo para outra pergunta: as respostas ficam gravadas pelo id. */

/* ================= BANCO DE PERGUNTAS ================= */
const PIL = {P:'Processos', E:'Pessoas', F:'Ferramentas', C:'Cultura'};
const LVL = ['—','Iniciante','Estruturado','Otimizado','Escalável'];
const LVL_DESC = ['','N1 Iniciante: depende de pessoas e improviso; sem processo nem medição.','N2 Estruturado: existe processo básico, mas ele não é seguido por todos nem medido.','N3 Otimizado: processo padronizado, medido e ligado a metas.','N4 Escalável: automatizado, integrado e melhorado continuamente com dados.'];
const IMP = {3:'Impacto alto',2:'Impacto médio',1:'Impacto baixo'};

// campo: [chave, rótulo, tipo]  tipo: n número | R$ moeda | % percentual | min minutos | d dias | t texto
const UNFIN = [['meta_mat','Meta de matrículas','n'],['meta_rec','Meta de receita','R$'],['receita','Receita realizada ou projetada (ano)','R$'],['folha','Folha de pagamento','R$'],['orcamento','Orçamento de marketing','R$'],['alunos','Alunos ativos','n'],['dem_mkt','Demandas enviadas ao marketing no mês','n'],['dem_atraso','Demandas atrasadas pelo marketing','n']];

// pergunta: [id, título curto, pilar, impacto, eliminatória, enunciado, [N1, N2, N3, N4]]
const AREAS = [
 {id:'reitoria',g:'Liderança e governança',volTitle:'Roteiro da entrevista e números',roteiro:1,nome:'Reitoria',desc:'Visão da reitoria sobre o papel do marketing, metas da instituição, dores e o que significa sucesso para este trabalho.',
  vol:[['meta_matriculas','Meta total de matrículas no ano','n'],['meta_receita','Meta de receita no ano','R$'],
   ['dores','Maiores dores da reitoria hoje com o marketing','p'],
   ['sucesso','O que precisa acontecer em 6 e em 12 meses para este trabalho ser considerado um sucesso?','p'],
   ['objetivos','Objetivos estratégicos da instituição para os próximos 2 anos','p'],
   ['prioridade_un','Quais UNs são prioridade hoje?','p'],
   ['tentativas','O que já foi tentado no marketing e não funcionou? Por quê?','p'],
   ['decisores','Quem decide o quê sobre marketing hoje (verba, equipe, campanhas, sistemas)?','p'],
   ['sensiveis','Restrições e temas sensíveis (mantenedora, política interna, sindicato, contratos)','p']],
  q:[
  ['rei1','Papel do marketing','C',3,0,'Como a reitoria enxerga o papel do marketing?',['Área de apoio que faz peças','Área de comunicação institucional','Parceira da captação, com metas compartilhadas','Área estratégica de receita, presente nas decisões do negócio']],
  ['rei2','Metas institucionais','P',3,0,'As metas da instituição estão claras e desdobradas?',['Não há metas formais comunicadas','Metas gerais de matrícula, sem desdobramento','Metas por UN conhecidas pelas áreas','Metas por UN, curso e trimestre, acompanhadas todo mês pela reitoria']],
  ['rei3','Patrocínio da mudança','C',3,1,'Qual o nível de patrocínio da reitoria para mudanças no marketing?',['Quer resultado sem mudar nada','Apoia no discurso, decide caso a caso','Apoia com prazo e recursos definidos','Patrocina ativamente, remove barreiras e cobra resultado']],
  ['rei4','Velocidade de decisão','P',2,0,'Quanto tempo leva para uma decisão relevante de marketing ser aprovada?',['Meses, ou nunca sai','Semanas, passando por várias instâncias','Dias, com instância definida','Decisão delegada ao marketing dentro de regras claras']],
  ['rei5','Régua de sucesso','C',2,0,'Como a reitoria mede o sucesso do marketing?',['Não sabe dizer','Por percepção: peças, eventos, visibilidade','Por matrículas e captação','Por matrícula, receita, CAC e retenção por UN']]]},
 {id:'proreitoria',g:'Liderança e governança',volTitle:'Roteiro da entrevista e números',roteiro:1,nome:'Pró-reitorias',desc:'Pró-reitorias acadêmica e administrativa: como os fluxos chegam ao marketing, o que travam e o que esperam.',
  vol:[['pontos_focais','Pró-reitorias e pontos focais (nome e responsabilidade)','t'],
   ['dores','Principais dores das pró-reitorias com o marketing','p'],
   ['fluxos','Fluxos que passam pelas pró-reitorias e travam o marketing','p'],
   ['lancamentos','Lançamentos, editais e novos cursos previstos para os próximos 2 semestres','t'],
   ['expectativa','O que a pró-reitoria espera do marketing e hoje não recebe?','p']],
  q:[
  ['pro1','Fluxo com o marketing','P',3,0,'Como as pró-reitorias acionam o marketing?',['Cada coordenador pede direto, sem passar pela pró-reitoria','Pedidos via pró-reitoria, sem padrão','Fluxo definido, com ponto focal por pró-reitoria','Planejamento conjunto periódico, com fila priorizada']],
  ['pro2','Calendário acadêmico','P',3,0,'O calendário acadêmico (ofertas, editais, abertura de turmas) chega ao marketing com antecedência?',['Chega em cima da hora','Chega com poucas semanas','Chega no início do semestre','É construído junto com o marketing, com 6 meses de antecedência']],
  ['pro3','Oferta e preço','P',2,0,'O marketing participa das decisões de oferta de cursos e preços?',['Não participa','É informado depois da decisão','É consultado','Participa com dados de demanda e concorrência']],
  ['pro4','Alinhamento entre pró-reitorias','C',2,0,'As pró-reitorias têm prioridades alinhadas para o marketing?',['Prioridades conflitantes; cada uma puxa para um lado','Alinhamento informal','Prioridades discutidas em comitê','Prioridade única definida pela reitoria e respeitada']],
  ['pro5','Aprovações acadêmicas','P',2,0,'Quanto as aprovações acadêmicas (conteúdo de curso, editais) atrasam o marketing?',['Atrasam quase sempre','Atrasam com frequência','Atrasos pontuais','Prazos de aprovação definidos e cumpridos']]]},
 {id:'financeiro',g:'Liderança e governança',volTitle:'Roteiro da entrevista e números',roteiro:1,nome:'Orçamento e DRE',desc:'Números da instituição e do marketing: DRE orçado x realizado, folha e verba. Base para mostrar retorno e priorizar.',
  vol:[['receita_orcada','Receita orçada (ano)','R$'],['receita_realizada','Receita realizada ou projetada (ano)','R$'],
   ['custo_orcado','Custos e despesas orçados (ano)','R$'],['custo_realizado','Custos e despesas realizados ou projetados (ano)','R$'],
   ['ebitda_orcado','Resultado (EBITDA) orçado','R$'],['ebitda_realizado','Resultado (EBITDA) realizado ou projetado','R$'],
   ['verba_orcada','Verba de marketing orçada (ano)','R$'],['verba_realizada','Verba de marketing realizada ou projetada (ano)','R$'],
   ['descontos','Bolsas e descontos concedidos (ano)','R$'],['inadimplencia','Inadimplência (ano)','R$'],
   ['folha_docente','Folha docente (ano)','R$'],['folha_adm','Folha administrativa (ano)','R$'],
   ['folha_mkt','Folha mensal do marketing (com encargos)','R$'],['headcount','Pessoas no time de marketing','n'],
   ['terceiros','Agências e fornecedores do marketing (mensal)','R$'],
   ['obs','Cortes previstos, pressões de caixa e observações do financeiro','t']],
  q:[
  ['fin1','Acesso aos números','F',3,0,'O marketing tem acesso aos números financeiros?',['Não tem acesso','Recebe números soltos quando pede','Recebe DRE e metas da área periodicamente','Acompanha a DRE por UN todo mês com o financeiro']],
  ['fin2','Construção do orçamento','P',3,0,'Como é definido o orçamento do marketing?',['Repete o valor do ano anterior','Definido pela diretoria, sem participação do marketing','Construído com o marketing, por meta e UN','Base zero por meta, CAC e retorno, revisado por trimestre']],
  ['fin3','Execução do orçamento','P',2,0,'O orçamento é executado conforme o planejado?',['Não é acompanhado','Cortes frequentes no meio do ano','Desvios pequenos e justificados','Orçado x realizado mensal, com realocação por resultado']],
  ['fin4','Retorno do investimento','F',3,0,'O retorno do marketing é apresentado ao financeiro?',['Nunca','Só volume de leads e ações','Matrículas e CAC por UN','Receita, LTV e margem atribuídos ao marketing']],
  ['fin5','Custo da equipe','P',2,0,'A folha do marketing é conhecida e comparada ao que é entregue?',['Não se sabe','Só o valor total','Total por função','Custo por função comparado ao volume e ao valor entregue']]]},
 {id:'mandato',g:'Liderança e governança',volTitle:'Roteiro da entrevista e números',roteiro:1,nome:'Mandato e autonomia',desc:'O que você terá liberdade para mudar: equipe, contratações, fornecedores, sistemas e processos com as UNs.',
  vol:[['pessoas_chave','Pessoas-chave do time de marketing (nome, função, ponto forte, ponto de atenção)','t'],
   ['aprovadores','Quem precisa aprovar mudanças de equipe, fornecedor e sistema?','p'],
   ['prazo','Prazo e marcos esperados para a transformação','p'],
   ['intocaveis','O que não pode ser mexido (contratos, cargos, sistemas, pessoas)','p']],
  q:[
  ['man1','Troca de equipe','E',3,1,'Há liberdade para trocar ou realocar pessoas do time de marketing?',['Nenhuma; a equipe é intocável','Só com longa negociação com RH e reitoria','Possível com justificativa e prazo','Autonomia para redesenhar a equipe dentro do orçamento']],
  ['man2','Contratações','E',2,0,'É possível contratar pessoas ou especialistas?',['Contratações congeladas','Só para repor saídas','Novas vagas com aprovação','Orçamento previsto para reforço e especialistas']],
  ['man3','Fornecedores e agências','P',2,0,'Há liberdade para trocar fornecedores e agências?',['Contratos fixos e intocáveis','Troca só no fim do contrato','Troca possível com justificativa','Autonomia para escolher por desempenho']],
  ['man4','Sistemas','F',2,0,'Há liberdade para mudar ferramentas e sistemas?',['Decisão exclusiva da TI','Muda só com longo processo de compras','Mudança possível com aprovação da TI','O marketing escolhe suas ferramentas dentro de regras de segurança']],
  ['man5','Regras com coordenadores e UNs','P',3,0,'Há liberdade para mudar processos que envolvem coordenadores e UNs (prazos, pedidos, aprovações)?',['Não; o marketing se adapta a todos','Só com aval caso a caso','Possível com comunicação da reitoria','Novas regras valem para todos, com patrocínio formal']]]},
 {id:'demandas',g:'Operação do marketing',nome:'Gestão de demandas',desc:'Como coordenadores e UNs pedem ao marketing, como o marketing prioriza e em quanto tempo entrega.',
  vol:[['recebidas','Demandas recebidas no mês','n'],['abertas','Demandas em aberto','n'],['prazo_medio','Prazo médio de entrega','d'],['no_prazo','Entregues no prazo','%'],['urgentes','Pedidos marcados como urgentes','%'],['solicitantes','Solicitantes ativos (coordenadores e gestores)','n'],['canais','Por onde os pedidos chegam hoje','t']],
  q:[
  ['dem1','Canal de entrada','P',3,0,'Como coordenadores e UNs pedem demandas ao marketing?',['WhatsApp, e-mail, corredor: cada um de um jeito','E-mail ou planilha central, sem padrão de informação','Formulário único de solicitação com campos obrigatórios','Portal de solicitações ligado à gestão de tarefas, com status visível ao solicitante']],
  ['dem2','Priorização','P',3,1,'Como o marketing decide o que fazer primeiro?',['Quem pressiona mais ou o cargo mais alto','O gestor decide caso a caso','Critérios definidos (impacto, prazo, calendário de captação)','Regra pública de priorização, com capacidade reservada por UN']],
  ['dem3','Prazo e SLA','P',3,0,'Existe prazo padrão por tipo de demanda?',['Não, tudo é para ontem','Prazos combinados caso a caso','SLA por tipo de peça, divulgado aos solicitantes','SLA monitorado, com cumprimento medido por UN']],
  ['dem4','Visibilidade do andamento','F',2,0,'O coordenador consegue ver o andamento do que pediu?',['Não; precisa perguntar','Só quando pergunta ao responsável','Quadro compartilhado com status','Avisos automáticos a cada mudança de etapa']],
  ['dem5','Planejamento antecipado','C',2,0,'As UNs planejam as demandas com antecedência?',['Tudo chega em cima da hora','Algumas datas fixas são conhecidas','Calendário semestral combinado com as UNs','Planejamento trimestral conjunto, com demandas previstas em backlog']],
  ['dem6','Porte e complexidade','P',2,0,'As demandas são classificadas por porte e complexidade?',['Tudo é tratado igual: um post e uma campanha entram na mesma fila','O time sabe o que é grande, mas sem regra escrita','Porte definido por tipo de peça, com prazo diferente para cada um','O porte define prazo, equipe e aprovação; projetos grandes têm plano e cronograma próprios']]]},
 {id:'relacionamento',g:'Operação do marketing',nome:'Atendimento às unidades',desc:'Como o marketing atende coordenadores de curso e administrativo, seus clientes internos: proximidade, conversa franca, acompanhamento e satisfação.',
  vol:[['satisf','Satisfação dos solicitantes (0 a 10)','n'],['reclamacoes','Reclamações sobre o atendimento no semestre','n'],['pontos_focais','Unidades com ponto focal no marketing','n'],['reunioes','Encontros com coordenadores no mês','n']],
  q:[
  ['rel1','Ponto focal por unidade','P',3,0,'Cada unidade ou coordenador sabe com quem falar no marketing?',['Não; fala com quem estiver disponível','Sabe a quem recorrer, mas a pessoa muda conforme a demanda','Ponto focal definido por unidade, que acompanha o pedido do início ao fim','Ponto focal que conhece o curso, participa do planejamento da unidade e responde por ela']],
  ['rel2','Conversa franca com o solicitante','E',3,0,'O marketing consegue negociar escopo, prazo e prioridade com quem pede?',['Não; aceita tudo e depois atrasa','Negocia só quando o prazo já estourou','Alinha escopo e prazo no briefing e diz "não" com alternativa','Atua como consultor: questiona o objetivo, propõe o melhor formato e combina prazo realista']],
  ['rel3','Atendimento humanizado','C',3,1,'Como coordenadores e administrativo descrevem o atendimento do marketing?',['Distante: só recebem a peça pronta, ou atrasada','Cordial, mas sem acompanhamento','Próximo, com retorno a cada etapa','Parceiro: o marketing entende o curso e sugere ações antes de ser pedido']],
  ['rel4','Rituais com as unidades','C',2,0,'Existem encontros regulares entre o marketing e os coordenadores?',['Só quando surge um problema','Reuniões pontuais antes das campanhas','Encontro mensal por unidade, com pauta','Ritual quinzenal com pauta, resultados e próximos pedidos planejados juntos']],
  ['rel5','Satisfação medida','F',2,0,'A satisfação de quem pede ao marketing é medida?',['Não; sabemos pelas reclamações','Percepção informal do gestor','Pesquisa periódica com os solicitantes','Avaliação a cada entrega, com resultado acompanhado por unidade']]]},
 {id:'fluxo',g:'Operação do marketing',nome:'Fluxo e metodologia',desc:'Como o trabalho anda dentro do marketing: etapas, método, aprovações, capacidade e retrabalho.',
  vol:[['metodo','Metodologia em uso hoje','t'],['etapas','Etapas do fluxo hoje (do pedido à publicação)','t'],['rodadas','Rodadas médias de aprovação','n'],['retrabalho','Peças com retrabalho','%'],['wip','Tarefas em andamento por pessoa','n']],
  q:[
  ['flu1','Metodologia de trabalho','P',3,0,'Existe uma metodologia de gestão do trabalho?',['Não; cada pessoa se organiza','Lista de tarefas compartilhada, sem método','Kanban ou ágil com etapas definidas','Método ágil com ritos, limite de trabalho em andamento e métricas de fluxo']],
  ['flu2','Aprovações','P',3,0,'Como funcionam as aprovações?',['Muitos aprovam, sem ordem e sem limite de rodadas','Um aprovador por UN, rodadas ilimitadas','Fluxo de aprovação com prazo de resposta','Aprovador único, até 2 rodadas e aprovação tácita no prazo']],
  ['flu3','Briefing completo','P',2,0,'As demandas chegam com as informações necessárias?',['Raramente; o marketing corre atrás','Às vezes, depende do solicitante','Briefing padrão obrigatório','Briefing validado antes de entrar na fila, devolvido se incompleto']],
  ['flu4','Gestão de capacidade','E',3,0,'O marketing conhece a própria capacidade de entrega?',['Não; aceita tudo e atrasa','Percebe a sobrecarga, sem medir','Mede volume por pessoa e renegocia prazos','Planeja capacidade por período e reserva cota por UN']],
  ['flu5','Retrabalho','C',2,0,'Com que frequência há retrabalho por mudança de pedido?',['Quase sempre','Com frequência','Às vezes, com causa registrada','Raramente; causas tratadas na origem']],
  ['flu6','Passagem de bastão','P',3,0,'Como a demanda passa de mão em mão: solicitante, atendimento do marketing, criação, aprovação do solicitante e publicação ou entrega?',['Sem etapas claras: a demanda se perde entre pessoas e mensagens','Etapas conhecidas, mas cada passagem depende de cobrar no WhatsApp','Cada etapa tem dono e a passagem é registrada no quadro, com o briefing junto','Dono e prazo por etapa, aprovação no próprio sistema e aviso ao solicitante na entrega']]]},
 {id:'sistemas',g:'Operação do marketing',nome:'Sistemas e ferramentas',desc:'Quais sistemas o marketing usa, se conversam entre si e onde geram trabalho manual. Detalhe cada sistema na aba Sistemas.',
  vol:[['qtd','Sistemas em uso','n'],['custo','Custo mensal de licenças','R$'],['horas_manuais','Horas por semana em tarefas manuais entre sistemas','n']],
  q:[
  ['sis1','Gestão de tarefas','F',3,0,'Onde o marketing controla as tarefas?',['WhatsApp e e-mail','Planilha','Ferramenta de gestão usada por parte do time','Ferramenta única usada por todos, com solicitantes dentro']],
  ['sis2','Sobreposição de ferramentas','F',2,0,'Existem ferramentas diferentes fazendo a mesma coisa?',['Muitas; cada time usa a sua','Algumas duplicidades conhecidas','Conjunto definido, poucas exceções','Conjunto único, com dono por ferramenta']],
  ['sis3','Trabalho manual entre sistemas','F',3,0,'Quanto trabalho manual existe para passar informação entre sistemas?',['Muito: copiar e colar é rotina','Exportações frequentes de planilha','Integrações cobrem os fluxos principais','Integrações automáticas; quase nada manual']],
  ['sis4','Domínio das ferramentas','E',2,0,'O time domina as ferramentas que tem?',['Usa o básico; muitas funções ignoradas','Alguns dominam, outros não','Treinamento inicial para todos','Trilha de capacitação e responsável por ferramenta']],
  ['sis5','Acessos e licenças','P',1,0,'Acessos e licenças são controlados?',['Logins compartilhados, sem controle','Controle informal','Acessos individuais e lista de licenças','Gestão central de acessos e custos']]]},
 {id:'smarketing',g:'Operação do marketing',nome:'Marketing & Comercial',desc:'Alinhamento entre marketing e comercial: definição de lead qualificado, feedback, passagem de bastão e velocidade de contato.',
  vol:[['conv_insc','Inscrito → matrícula','%'],['speed','Tempo médio do primeiro contato','min'],['reunioes','Reuniões de alinhamento no mês','n'],['dem_com','Pedidos do comercial e call center ao marketing no mês','n'],['dem_com_prazo','Pedidos do comercial entregues no prazo','%']],
  q:[
  ['sma1','Definição de lead qualificado','P',3,0,'Como é definido o momento em que um lead está pronto para o comercial?',['Qualquer contato com e-mail ou telefone vai direto para o comercial','Enviado por curso ou formulário, sem validar perfil','Acordo básico de perfil, com filtro manual da triagem','SLA documentado e automatizado no CRM (score ou validação obrigatória de dados)']],
  ['sma2','Feedback do comercial','P',3,0,'Com que frequência e de que forma o comercial devolve informação sobre a qualidade dos leads?',['Sem canal oficial; só reclamação informal','Status no CRM, que o marketing raramente analisa','Reunião mensal de fechamento, com correção lenta','Comitê semanal com motivos de perda; o marketing ajusta campanhas em tempo real']],
  ['sma3','Passagem de bastão','F',3,0,'Como o lead passa da ferramenta de marketing para o sistema de vendas?',['Planilha exportada e distribuída à mão','Integração básica: só nome e telefone','Integração com histórico, mas com duplicidade ou atraso','Integração em tempo real, com histórico completo e UN já segmentada']],
  ['sma4','Distribuição e velocidade','P',3,0,'Como os leads são distribuídos e em quanto tempo há a primeira abordagem?',['Lista geral; cada um pega o que quer; mais de 24h','Distribuição manual diária; 4 a 12h','Distribuição automática em fila; 1 a 2h','Distribuição imediata por especialidade; leads quentes em menos de 15 min']],
  ['sma5','Pedidos do comercial','P',3,0,'Como o comercial e o call center pedem material ao marketing (captação, peças de venda, branding comercial)?',['Pedem direto a quem conhecem, sem fila nem prazo','Entram na fila geral, sem prioridade para a captação','Fila própria do comercial, com tipos de peça e SLA','Kit comercial planejado por campanha, com SLA acompanhado junto com o comercial']],
  ['sma6','Fluxos e SLA de atendimento','P',2,0,'Os fluxos e SLAs de atendimento do comercial e do call center são desenhados junto com o marketing?',['Cada área tem o seu, sem combinar','Combinados de boca','Fluxo e SLA documentados para cada canal','Fluxo único entre marketing, comercial e call center, com SLA medido no CRM']]]},
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
  ['gro5','Decisão por dados','C',2,0,'Como as decisões de marketing são tomadas?',['Opinião do gestor','Dados consultados depois da decisão','Dados no centro das reuniões semanais','Hipótese, experimento e métrica antes de qualquer mudança']],
  ['gro6','Estrutura das campanhas','P',3,0,'As campanhas são verticalizadas por curso ou feitas por grupos de cursos?',['Campanhas genéricas da marca, sem separar cursos','Por unidade, sem separar grupos de cursos','Por grupos de cursos, com verba e meta próprias','Por curso ou por grupo conforme o potencial, com verba realocada pelo CAC de cada um']],
  ['gro7','Calendário de campanhas','C',2,0,'Existe um ritmo planejado de campanhas ou é tudo reativo?',['Reativo: campanha quando a matrícula cai','Datas principais conhecidas (vestibular, rematrícula)','Calendário anual de campanhas aprovado com as UNs','Calendário com ciclos de teste e revisão quinzenal por grupo']]]},
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
 {n:1,id:'diagnostico',nome:'Diagnóstico',ds:'Base de conhecimento, reitoria e entrevistas 1 a 1.'},
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


/* ================= BIBLIOTECA DE FOFA POR ÁREA =================
   Opções estratégicas prontas para incluir com um clique na matriz de cada área.
   f = Forças (interno, positivo) · w = Fraquezas (interno, negativo)
   o = Oportunidades (externo ou de evolução) · a = Ameaças (externo ou risco) */
const FOFA_LIB = {
 reitoria:{
  f:['Reitoria reconhece que o marketing precisa mudar e abriu espaço para o diagnóstico','Metas de matrícula e receita conhecidas pela liderança','Acesso direto da consultoria à reitoria','Marca institucional sólida construída ao longo dos anos'],
  w:['Marketing visto como área de apoio, fora das decisões do negócio','Metas sem desdobramento por UN e trimestre','Decisões lentas, passando por muitas instâncias','Sucesso do marketing medido por percepção, não por número'],
  o:['Comitê mensal de resultados com a reitoria e as UNs','Régua de sucesso pactuada: matrícula, receita e CAC por UN','Delegação de decisões ao marketing com regras claras','Patrocínio formal da reitoria às novas regras de pedidos e prioridade'],
  a:['Troca de liderança interrompendo a transformação','Pressão por resultado rápido sem dar tempo ao novo processo','Mantenedora cortando verba por falta de retorno comprovado','Expectativas diferentes entre reitoria e pró-reitorias']},
 proreitoria:{
  f:['Pró-reitorias com pontos focais conhecidos','Calendário acadêmico estável de um ano para o outro','Coordenadores engajados com a captação dos seus cursos','Abertura para planejamento conjunto'],
  w:['Calendário e editais chegam em cima da hora','Prioridades conflitantes entre pró-reitorias','Marketing fora das decisões de oferta e preço','Aprovações acadêmicas atrasam campanhas'],
  o:['Calendário de lançamentos com 6 meses de antecedência','Ponto focal único por pró-reitoria para pedidos','Marketing com dados de demanda na decisão de oferta','Prazo fixo para aprovações acadêmicas'],
  a:['Abertura de cursos sem demanda comprovada','Editais publicados sem tempo de divulgação','Conflitos entre pró-reitorias escalando para a reitoria','Mudanças regulatórias exigindo ajuste rápido de oferta']},
 financeiro:{
  f:['Orçamento de marketing garantido no ano','Financeiro disposto a compartilhar números','DRE fechada mensalmente','Histórico de investimento para comparar'],
  w:['Marketing sem acesso à DRE e às metas financeiras','Orçamento repetido do ano anterior, sem base em meta','Retorno do marketing não comprovado em receita','Folha do marketing sem relação com o volume entregue'],
  o:['Orçado x realizado mensal com realocação por resultado','Modelo de CAC e LTV por UN aceito pelo financeiro','Revisão do mix entre equipe interna e fornecedores','Business case para investimentos em sistemas e automação'],
  a:['Cortes de verba no meio do ano','Receita abaixo do orçado pressionando o caixa','Inadimplência crescente reduzindo a margem','Marketing visto como custo, primeiro a ser cortado']},
 mandato:{
  f:['Liberdade para redesenhar processos com patrocínio da reitoria','Abertura para trocar fornecedores com baixo desempenho','Orçamento previsto para especialistas','Equipe aberta à mudança'],
  w:['Equipe intocável, sem liberdade para realocar pessoas','Contratações congeladas','Sistemas decididos só pela TI','Contratos longos com fornecedores sem desempenho'],
  o:['Redesenho de papéis do time com base no diagnóstico','Reforço pontual com especialistas por projeto','Troca de ferramentas com regras de segurança acordadas com a TI','Novas regras de pedidos valendo para todas as UNs'],
  a:['Resistência interna travando mudanças de equipe','Mandato informal que pode ser revogado','Dependência de aprovações que demoram meses','Promessa de autonomia que não se confirma na prática']},
 demandas:{
  f:['Coordenadores reconhecem o marketing como parceiro e procuram o time','Time conhece bem o calendário acadêmico e os picos de cada UN','Existe um canal oficial de pedidos, mesmo que pouco usado','Gestor do marketing tem acesso direto à diretoria para priorizar'],
  w:['Pedidos chegam por WhatsApp individual e se perdem','Não há critério público de prioridade: vence quem pressiona mais','Coordenadores não sabem o status do que pediram','Urgências constantes impedem trabalho planejado','Ninguém mede prazo de entrega nem volume por UN'],
  o:['Formulário único de pedido com campos obrigatórios e prazo mínimo por tipo de peça','Calendário semestral de demandas combinado com cada coordenação','Cota de capacidade reservada por UN para dar previsibilidade','Portal de status para o solicitante acompanhar sem perguntar','Kit de autosserviço (templates aprovados) para pedidos simples'],
  a:['Coordenadores contratam fornecedores por fora e quebram a marca','Desgaste político entre UNs disputando o mesmo time','Perda de prazos de captação por fila de demandas internas','Saída de pessoas-chave que concentram o conhecimento dos pedidos']},
 fluxo:{
  f:['Time pequeno e próximo, decide rápido quando tem clareza','Já existe alguma ferramenta de gestão em uso por parte do time','Peças recorrentes já têm modelo de referência','Gestor disposto a mudar o método de trabalho'],
  w:['Muitos aprovadores e rodadas ilimitadas de alteração','Briefing incompleto gera retrabalho e atraso','Sem limite de trabalho em andamento: todos fazem tudo ao mesmo tempo','Etapas do fluxo não estão definidas nem visíveis','Capacidade do time não é medida'],
  o:['Kanban com etapas claras e limite de tarefas por pessoa','Aprovador único por demanda e no máximo 2 rodadas','Aprovação tácita depois do prazo de resposta','Rituais curtos: daily de 15 minutos e revisão semanal de fila','Medir tempo parado por etapa para atacar o gargalo certo'],
  a:['Burnout do time por excesso de urgências','Queda de qualidade das peças em período de captação','Perda de credibilidade do marketing junto à reitoria','Rotatividade alta do time criativo']},
 sistemas:{
  f:['A instituição já investe em ferramentas pagas','Parte do time domina bem as ferramentas principais','Existe sistema acadêmico com dados confiáveis de matrícula','Abertura da TI para integrar sistemas'],
  w:['Ferramentas duplicadas fazendo a mesma coisa','Muito trabalho manual copiando dados entre sistemas','Logins compartilhados e sem controle de acesso','Ferramentas subutilizadas por falta de treinamento','Nenhuma ferramenta concentra pedidos e tarefas do marketing'],
  o:['Consolidar o conjunto de ferramentas e cortar licenças sobrepostas','Integrar formulário de pedidos à ferramenta de tarefas','Automações simples (n8n, Zapier) para eliminar digitação manual','Trilha de capacitação por ferramenta com um responsável','Painel único de indicadores alimentado automaticamente'],
  a:['Dependência de um fornecedor que pode aumentar preço ou descontinuar','Vazamento de dados de alunos por acessos sem controle (LGPD)','Troca de sistema acadêmico sem envolver o marketing','Custos de licença crescendo sem retorno medido']},
 smarketing:{
  f:['Comercial próximo do marketing e aberto a conversar','CRM já recebe os leads do digital','Consultores conhecem bem as objeções de cada curso','Existe meta comercial clara por UN'],
  w:['Não há definição compartilhada de lead qualificado','Comercial não devolve motivo de perda ao marketing','Lead chega ao consultor sem histórico de interesse','Primeiro contato demora horas ou dias','Distribuição manual e desigual entre consultores'],
  o:['SLA de lead qualificado com 3 critérios obrigatórios','Reunião semanal de 30 minutos marketing e comercial','Primeiro contato automático por WhatsApp em até 2 minutos','Distribuição automática por curso ou UN','Relatório de motivos de perda alimentando campanhas'],
  a:['CAC subindo por volume de leads sem perfil','Concorrentes que respondem em minutos levam o aluno','Conflito aberto entre times por culpa de resultado','Consultores desmotivados com leads frios']},
 plataforma:{
  f:['Site institucional com boa autoridade de domínio','Tags e pixels básicos já instalados','Equipe de TI interna disponível','Páginas de curso já estruturadas'],
  w:['Rastreamento de conversão incompleto ou quebrado','Marketing depende da TI para qualquer página','Site lento no celular','Sistemas sem integração com o CRM'],
  o:['Plano de tagueamento por UN com eventos de inscrição','Construtor de landing pages com templates aprovados','Melhorar velocidade mobile para ganhar conversão e SEO','Páginas de curso otimizadas para busca e IA'],
  a:['Mudanças de privacidade reduzindo dados de mídia','Queda de tráfego orgânico com buscas respondidas por IA','Incidente de segurança ou indisponibilidade em pico de captação','Fila da TI travando lançamentos de campanha']},
 crm:{
  f:['CRM implantado e com licenças disponíveis','Funil com etapas já configuradas','Base histórica de leads e alunos','Automação de e-mail disponível'],
  w:['Parte dos contatos (balcão, telefone, visitas) fica fora do CRM','Consultores preenchem pouco ou usam WhatsApp pessoal','Sem lead scoring nem prioridade de atendimento','Bases de UNs separadas, sem cruzamento'],
  o:['Réguas automáticas por etapa e por curso','Cruzar base de formandos com a pós-graduação','Lead scoring baseado em matrículas reais','Integração do WhatsApp oficial ao CRM'],
  a:['Dados desatualizados levando a decisões erradas','Descumprimento da LGPD em disparos sem consentimento','Perda do histórico quando um consultor sai','Custo de licença sem uso efetivo']},
 redes:{
  f:['Perfis com audiência engajada de alunos e ex-alunos','Conteúdo de bastidores e vida acadêmica que performa bem','Professores com boa presença digital','Volume consistente de publicações'],
  w:['Mesma mensagem para pais, vestibulandos e profissionais','Directs respondidos com atraso e sem registro','Redes sem meta de geração de leads','Linha editorial inexistente ou genérica'],
  o:['Programa de embaixadores com alunos e professores','Linha editorial por UN e por etapa da jornada','Lead ads integrados ao CRM','Conteúdo de carreira e empregabilidade para graduação e pós'],
  a:['Crise de reputação viral sem protocolo de resposta','Queda de alcance orgânico pelos algoritmos','Concorrentes com creators fortes no mesmo público','Comentários negativos de alunos sem tratamento']},
 captacao:{
  f:['Volume de leads atende ou supera a meta','Marca reconhecida na região','Mix de canais pago e orgânico funcionando','Bom custo por lead em mídia'],
  w:['Dependência de um único canal de mídia','Leads sem nutrição depois do cadastro','Qualidade de lead questionada pelo comercial','Captação concentrada só nos meses de campanha'],
  o:['Captação contínua fora dos picos com conteúdo e eventos','Parcerias com escolas e empresas da região','SEO local e páginas por curso','Réguas de nutrição por curso e etapa'],
  a:['Aumento do custo de mídia em período de vestibular','Concorrência de EAD com preço agressivo','Mudanças em políticas de anúncios para educação','Queda de demanda por cursos específicos']},
 criacao:{
  f:['Time criativo com boa qualidade visual','Identidade de marca reconhecida','Banco de imagens próprio da instituição','Agilidade em peças simples'],
  w:['Fila de demandas maior que a capacidade','Retrabalho por briefing incompleto','Manual de marca sem diretrizes por UN','Cada peça nasce do zero'],
  o:['Templates aprovados por UN para pedidos recorrentes','Biblioteca de ativos organizada e compartilhada','IA para variações de peças e adaptações de formato','Reaproveitar 1 conteúdo em vários formatos'],
  a:['Coordenadores produzindo peças fora da marca','Picos de captação estourando prazos','Dependência de um único designer','Queda de qualidade por pressa constante']},
 growth:{
  f:['Cultura de olhar dados já começando','Ferramentas de análise disponíveis','Pessoas com perfil analítico no time','Histórico de campanhas para comparar'],
  w:['Não se sabe qual canal gerou a matrícula','Testes esporádicos e sem documentação','Relatórios manuais e atrasados','Decisões tomadas por opinião'],
  o:['Atribuição até a matrícula via UTM e CRM','Backlog de testes priorizado por impacto','Dashboard por UN com meta e realizado','Programa de otimização das páginas de inscrição'],
  a:['Cortar o canal errado por falta de atribuição','Perda de sinais de dados por privacidade','Verba desperdiçada em campanhas sem retorno','Concorrentes otimizando mais rápido']},
 callcenter:{
  f:['Atendentes experientes e que conhecem os cursos','Volume de atendimento bem distribuído fora dos picos','Roteiro básico de atendimento existente','Canal telefônico confiável'],
  w:['Fila e abandono altos nos picos de captação','Contatos não registrados no CRM','Respostas dependem do conhecimento de cada atendente','Pouca autonomia para resolver na hora'],
  o:['Chatbot e WhatsApp para dúvidas simples','Base de conhecimento por UN','Dimensionamento pelo calendário de captação','Monitoria de qualidade com feedback semanal'],
  a:['Candidatos desistindo na fila e indo para o concorrente','Reclamações públicas por mau atendimento','Rotatividade alta de atendentes','Custos crescentes de telefonia']},
 b2b:{
  f:['Relacionamento com empresas e convênios existentes','Portfólio relevante para educação corporativa','Ticket médio alto por contrato','Consultores com bom networking'],
  w:['Qualificação fraca antes da proposta','Sem previsão de receita B2B','Passagem para a entrega sem contexto','Motivos de perda não registrados'],
  o:['Programas in company e trilhas customizadas','Convênios com descontos para colaboradores','Parcerias com associações e sindicatos','Cadência de prospecção ativa por setor'],
  a:['Empresas cortando verba de treinamento','Concorrência de plataformas de cursos livres','Ciclo de venda longo afetando caixa','Dependência de poucos grandes clientes']},
 atendimento:{
  f:['Proximidade com alunos e boa reputação no relacionamento','Pesquisa de satisfação já aplicada','Equipe de secretaria experiente','Canais de contato variados'],
  w:['Evasão descoberta só no pedido de cancelamento','Postura reativa','Sem programa de indicação','Onboarding do aluno inexistente'],
  o:['Alertas de risco de evasão com playbook de retenção','Programa de indicação com benefício','Onboarding nas primeiras semanas de curso','Upsell para pós e cursos livres'],
  a:['Evasão por questões financeiras','Insatisfação virando reclamação pública','Concorrentes oferecendo transferência com desconto','Perda de rematrículas por atendimento lento']},
 eventos:{
  f:['Estrutura física para eventos presenciais','Professores dispostos a palestrar','Eventos com boa adesão de público','Marca forte em eventos tradicionais'],
  w:['Sem contato com o participante depois do evento','Inscrições fora do CRM','Retorno dos eventos não medido','Calendário desconectado da captação'],
  o:['Open house e aulas experimentais ligadas ao funil','Webinars com professores para pós e mestrado','Leads quentes ao comercial em até 24 horas','Eventos em parceria com empresas e escolas'],
  a:['Baixa presença por excesso de eventos concorrentes','Custo alto sem retorno em matrícula','Cancelamentos por clima ou logística','Desgaste da marca com eventos mal executados']},
 colegio:{
  f:['Reputação pedagógica reconhecida pelas famílias','Alta taxa de rematrícula','Indicação espontânea de pais','Estrutura física diferenciada'],
  w:['Visitas sem roteiro e sem acompanhamento','Conversão visita para matrícula não medida','Comunicação genérica, igual às outras UNs','Rematrícula tratada só no fim do ano'],
  o:['Programa de indicação de pais com benefício','Open house com roteiro de encantamento','SEO local e presença no Google Meu Negócio','Gestão de risco de rematrícula ao longo do ano'],
  a:['Queda de natalidade reduzindo o público','Escolas de rede com preço agressivo','Inadimplência das famílias','Crise de reputação em grupos de pais']},
 graduacao:{
  f:['Volume de inscritos estável','Cursos com boa empregabilidade','Diversas formas de ingresso','Marca forte na região'],
  w:['Candidato recebe só o boleto ou o link da prova','Abandono de inscrição sem recuperação','Aprovados que não se matriculam','Mesma régua para todos os cursos'],
  o:['Régua por curso com conteúdo de carreira','Recuperação automática de inscrição abandonada','Ofertas para transferência e segunda graduação','Parcerias com escolas de ensino médio'],
  a:['EAD de baixo custo atraindo o mesmo público','Mudanças em FIES e programas de bolsa','Queda de demanda em cursos tradicionais','Evasão no primeiro ano']},
 pos:{
  f:['Base de ex-alunos da graduação','Corpo docente com atuação de mercado','Cursos alinhados a demandas profissionais','Marca reconhecida por empregadores'],
  w:['Venda por preço e parcelamento, sem consultoria','Base de formandos não é trabalhada','Pouca prova social de resultado','Sem parcerias corporativas estruturadas'],
  o:['Régua de antecipação para formandos','Venda consultiva focada em carreira','Turmas in company e convênios','Cases de egressos com cargo e empresa'],
  a:['Cursos livres e certificações substituindo a pós','Concorrência de MBAs online de grandes marcas','Profissionais adiando decisão por crise econômica','Desvalorização de títulos genéricos']},
 mestrado:{
  f:['Linhas de pesquisa reconhecidas','Orientadores com produção relevante','Nota da CAPES competitiva','Laboratórios e estrutura de pesquisa'],
  w:['Divulgação limitada ao edital','Seleção fora do CRM','Orientadores pouco envolvidos na captação','Informação sobre bolsas difícil de achar'],
  o:['Webinars com orientadores por linha de pesquisa','Conteúdo científico e divulgação de artigos','Prospecção ativa de pesquisadores e egressos','Orientação sobre fomento durante o processo'],
  a:['Cortes de bolsas e fomento','Programas concorrentes com melhor nota','Baixa procura em linhas específicas','Dependência de poucos orientadores']},
 estrategia:{
  f:['Diretoria apoia o marketing','Metas de matrícula definidas','Verba de marketing garantida no orçamento','Posicionamento institucional claro'],
  w:['Metas sem desdobramento por UN e canal','Verba repetida do ano anterior','Sem projeção de retorno do investimento','Proposta de valor genérica'],
  o:['Matriz de priorização com critérios públicos','Modelo LTV/CAC por UN','Planejamento trimestral com revisão mensal','Posicionamento por UN validado com pesquisa'],
  a:['Corte de verba sem dados de retorno','Mudanças regulatórias no ensino superior','Concorrência crescente com preço baixo','Desalinhamento entre reitoria e UNs']},
 otimizacao:{
  f:['Abertura do time para testar e aprender','Dados de várias fontes disponíveis','Ferramentas com recursos de IA já contratadas','Histórico para comparar resultados'],
  w:['Aprendizados não são registrados','Dados espalhados e sem cruzamento','Criativos rodam até cansar','Segmentação apenas por UN'],
  o:['Repositório de aprendizados e playbooks','IA aplicada a segmentação, criativos e atendimento','Base unificada de marketing, CRM e acadêmico','Testes contínuos de criativos e páginas'],
  a:['Concorrentes aprendendo mais rápido','Uso de IA sem governança expondo dados','Decisões baseadas em dados incompletos','Dependência de consultorias externas']},
 geral:{
  f:['Marca reconhecida e com reputação no mercado educacional','Demanda de captação saudável','Diretoria aberta a reorganizar o marketing','Time comprometido e conhecedor do negócio'],
  w:['Marketing não consegue atender coordenadores e UNs com velocidade','Falta de processo de priorização e de fluxo de trabalho','Sistemas desconectados e trabalho manual','Indicadores pouco usados nas decisões'],
  o:['Redesenhar o fluxo de demandas com SLA e cota por UN','Unificar ferramentas e automatizar tarefas repetitivas','Planejamento conjunto com as UNs por semestre','Painel único de resultados por UN'],
  a:['Perda de matrículas por lentidão de resposta ao mercado','Desgaste interno levando UNs a agir por conta própria','Concorrentes mais rápidos e digitais','Saída de pessoas-chave do marketing']}
};

/* ================= EXPECTATIVAS DA REITORIA POR UN ================= */
const UN_EXP=[
 {k:'expect',label:'O que a reitoria espera desta UN',opts:['Manter','Crescer','Recuperar','Reposicionar']},
 {k:'esforco',label:'Investimento no próximo ano',opts:['Reduzir','Manter','Aumentar']},
 {k:'foco',label:'Prioridades (até 3)',multi:3,opts:['Aumentar captação','Melhorar retenção','Novos cursos e frentes','Aumentar ticket médio','Reduzir custo de aquisição','Fortalecer a marca','Convênios e B2B','Expandir EAD ou híbrido','Experiência do aluno']}
];

/* Opções prontas das perguntas de roteiro com escolha por prioridade (tipo 'p'). Sempre há "Outra". */
const OPC={
 'reitoria.dores':['Demora nas entregas do marketing','Falta de prioridade: tudo vira urgência','Captação abaixo da meta','Pouca visibilidade de resultados e números','Atendimento fraco a coordenadores e UNs','Retrabalho e muitas rodadas de aprovação','Lançamentos de cursos atrasados','Equipe sobrecarregada','Verba sem relação com retorno','Sistemas e dados que não conversam','Dependência de agência ou fornecedores','Marca pouco diferenciada'],
 'reitoria.sucesso':['Bater a meta de matrículas','Entregas no prazo combinado','Fluxo único de pedidos funcionando','Coordenadores satisfeitos com o atendimento','Indicadores de marketing acompanhados todo mês','Lançamentos no calendário','Redução do custo por matrícula','Equipe com papéis claros','Marca mais forte na região'],
 'reitoria.objetivos':['Crescer matrículas','Aumentar receita e margem','Abrir novos cursos','Expandir EAD e híbrido','Reduzir evasão','Fortalecer a marca','Abrir nova unidade ou polo','Crescer convênios e B2B','Melhorar indicadores do MEC','Digitalizar processos'],
 'reitoria.prioridade_un':['Colégio','Graduação presencial','Graduação EAD','Pós-Graduação','Mestrado e doutorado','Extensão e cursos livres'],
 'reitoria.tentativas':['Troca de agência','Aumento de verba em mídia','Novo CRM ou ferramenta','Contratação de pessoas','Reestruturação da equipe','Campanha de marca','Feirões e eventos','Bolsas e descontos agressivos','Influenciadores','Novo site'],
 'reitoria.decisores':['Reitor(a)','Pró-reitoria administrativa','Pró-reitoria acadêmica','Diretoria financeira','Mantenedora','Gestor(a) de marketing','Comitê','Cada UN decide sozinha'],
 'reitoria.sensiveis':['Mantenedora','Política interna','Sindicato e acordos coletivos','Contratos com fornecedores','Pessoas-chave intocáveis','Corte de orçamento','Regulação do MEC','Reputação e imprensa'],
 'proreitoria.dores':['Pedidos sem prazo e em cima da hora','Falta de alinhamento de calendário','Peças com erro de informação acadêmica','Muitas rodadas de aprovação','Não sabem o status dos pedidos','Marketing não conhece os cursos','Divulgação fraca de eventos e editais','Demora nas respostas'],
 'proreitoria.fluxos':['Aprovação de peças e textos','Editais e processos seletivos','Calendário acadêmico','Abertura de novos cursos','Bolsas e descontos','Eventos institucionais','Comunicação com alunos','Contratação de fornecedores'],
 'proreitoria.expectativa':['Prazo combinado e cumprido','Status visível dos pedidos','Calendário de campanhas antecipado','Mais leads qualificados','Material de apoio para coordenadores','Relatórios de resultado','Um ponto focal no marketing','Autonomia para pedidos simples'],
 'mandato.aprovadores':['Reitor(a)','Pró-reitoria administrativa','Diretoria financeira','Mantenedora','RH','Jurídico','Comitê'],
 'mandato.prazo':['Resultados rápidos em 90 dias','Plano de 6 meses','Transformação em 12 meses','Sem prazo definido'],
 'mandato.intocaveis':['Pessoas-chave da equipe','Contratos de agência','Sistemas atuais','Estrutura de cargos','Verba já comprometida','Processos da mantenedora','Nada é intocável']
};
