// Texto do contrato: modelo a partir dos dados do formulário e leitura segura para tela e impressão.
// O texto é guardado como texto simples (nunca HTML): "## " vira título, "**...**" vira negrito,
// linhas "1. " viram itens. Tudo é escapado antes de virar HTML, então nada digitado executa código.

import { esc, renderizar } from "/admin/assets/contrato-render.js";
export { esc, renderizar };

// ---------- números por extenso (reais e inteiros) ----------
const UN = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez", "onze", "doze", "treze",
  "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
const DZ = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const CT = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];
function ate999(n) {
  if (n === 0) return "";
  if (n === 100) return "cem";
  const c = Math.floor(n / 100), r = n % 100, p = [];
  if (c) p.push(CT[c]);
  if (r) p.push(r < 20 ? UN[r] : DZ[Math.floor(r / 10)] + (r % 10 ? " e " + UN[r % 10] : ""));
  return p.join(" e ");
}
export function inteiroExtenso(n) {
  n = Math.floor(Math.abs(Number(n) || 0));
  if (n === 0) return "zero";
  const milhoes = Math.floor(n / 1e6), milhares = Math.floor((n % 1e6) / 1000), resto = n % 1000;
  const p = [];
  if (milhoes) p.push(milhoes === 1 ? "um milhão" : ate999(milhoes) + " milhões");
  if (milhares) p.push(milhares === 1 ? "mil" : ate999(milhares) + " mil");
  if (resto) p.push(ate999(resto));
  if (p.length > 1 && resto && (resto < 100 || resto % 100 === 0)) return p.slice(0, -1).join(" ") + " e " + p[p.length - 1];
  return p.join(" ");
}
export function reaisExtenso(v) {
  const centavos = Math.round((Number(v) || 0) * 100);
  const r = Math.floor(centavos / 100), c = centavos % 100, p = [];
  if (r) p.push(inteiroExtenso(r) + (r % 1e6 === 0 ? " de" : "") + (r === 1 ? " real" : " reais"));
  if (c) p.push(inteiroExtenso(c) + (c === 1 ? " centavo" : " centavos"));
  return p.join(" e ") || "zero real";
}
export const moeda = (v) => (Number(v) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const numeroDe = (s) => {
  const t = String(s ?? "").trim();
  if (!t) return 0;
  const n = t.includes(",") ? Number(t.replace(/\./g, "").replace(",", ".")) : Number(t);
  return Number.isFinite(n) ? n : 0;
};
const cpfFmt = (c) => { const d = String(c ?? "").replace(/\D/g, ""); return d.length === 11 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : (c || "[CPF]"); };
const dataExtenso = (iso) => {
  if (!iso) return "[data de início]";
  const [a, m, d] = iso.split("-").map(Number);
  const meses = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  return `${d} de ${meses[m - 1]} de ${a}`;
};
const ou = (v, ph) => (String(v ?? "").trim() ? String(v).trim() : `[${ph}]`);

// ---------- dados em branco ----------
// Nada de dados reais aqui: este arquivo é público (fica no site). Os dados de cada contrato
// vivem só no banco, protegidos por RLS. "Novo contrato" copia os dados do último contrato do administrador.
export function dadosPadrao() {
  return {
    contratante: { razao: "", cnpj: "", endereco: "", rep_nome: "", rep_cargo: "", rep_cpf: "", rep_email: "", email_comunicacao: "" },
    contratada: { razao: "", cnpj: "", endereco: "", rep_nome: "", rep_cpf: "", rep_email: "" },
    valor: "", pct_ferias: 100, meses: 12, data_inicio: "", bolsa: "",
    testemunhas: [{ nome: "", cpf: "", email: "" }, { nome: "", cpf: "", email: "" }],
  };
}

// ---------- quem assina, a partir dos dados ----------
export function signatariosDe(d) {
  const t = d.testemunhas || [];
  return [
    { ordem: 1, nome: d.contratante?.rep_nome || "", papel: `${d.contratante?.razao ? "CONTRATANTE" : "Contratante"}${d.contratante?.rep_cargo ? " · " + d.contratante.rep_cargo : ""}`, email: d.contratante?.rep_email || "" },
    { ordem: 2, nome: d.contratada?.rep_nome || "", papel: "CONTRATADA · L'ORSO Comunicação Ltda", email: d.contratada?.rep_email || "" },
    ...t.map((x, i) => ({ ordem: 3 + i, nome: x.nome || "", papel: `Testemunha ${i + 1}`, email: x.email || "" })),
  ];
}

// ---------- o modelo do contrato de consultoria ----------
export function gerarTexto(d) {
  const ct = d.contratante || {}, cd = d.contratada || {};
  const valor = numeroDe(d.valor), pct = Math.max(0, Math.min(100, Math.round(Number(d.pct_ferias) || 0)));
  const ferias = Math.round(valor * pct) / 100;
  const meses = Math.max(1, Math.round(Number(d.meses) || 1));
  const t = d.testemunhas || [];
  const bolsa = String(d.bolsa ?? "").trim();
  const L = [];
  const p = (...x) => L.push(...x, "");

  p("# Contrato de Prestação de Serviços de Consultoria");
  p("## Das partes");
  p(`**CONTRATANTE:** ${ou(ct.razao, "razão social")}, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº ${ou(ct.cnpj, "CNPJ")}, com sede na ${ou(ct.endereco, "endereço")}, neste ato representada por seu ${ou(ct.rep_cargo, "cargo")}, ${ou(ct.rep_nome, "representante")}, portador do CPF nº ${cpfFmt(ct.rep_cpf)}, doravante denominada **CONTRATANTE**.`);
  p(`**CONTRATADA:** ${ou(cd.razao, "razão social")}, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº ${ou(cd.cnpj, "CNPJ")}, com sede na ${ou(cd.endereco, "endereço")}, neste ato representada por ${ou(cd.rep_nome, "representante")}, brasileiro, inscrito no CPF sob o nº ${cpfFmt(cd.rep_cpf)}, e-mail ${ou(cd.rep_email, "e-mail")}, residente e domiciliado no mesmo endereço, doravante denominada **CONTRATADA**.`);
  p("As partes acima qualificadas celebram o presente **Contrato de Prestação de Serviços de Consultoria**, que se regerá pelas cláusulas e condições a seguir.");

  p("## Considerandos");
  p("CONSIDERANDO que a CONTRATANTE atravessa um período de transição na gestão de sua área de Marketing e necessita assegurar a continuidade das operações e da campanha de captação em curso;");
  p("CONSIDERANDO que a CONTRATADA é um hub de inteligência operacional e escala, que presta consultoria de operações com foco em resultado, atuando lado a lado com o time do cliente para destravar gargalos, estruturar processos e integrar marketing, comercial e gestão com inteligência, automação e escalabilidade;");
  p("CONSIDERANDO que os serviços serão prestados por escopo e resultado, com plena autonomia técnica da CONTRATADA, sem controle de jornada, sem horário definido e sem contabilização de horas;");
  p("RESOLVEM as partes firmar o presente contrato, nos termos dos artigos 593 a 609 do Código Civil.");

  p("## Cláusula 1. Do objeto");
  p("**1.1.** O presente contrato tem por objeto a prestação de serviços de consultoria estratégica em Marketing pela CONTRATADA à CONTRATANTE, tendo como objetivo principal a **condução da transição da gestão de Marketing e o treinamento da nova gestora ou do novo gestor de Marketing** da CONTRATANTE.");
  p("**1.2.** Integram ainda o objeto:");
  p("1. Revisão do fluxo de atendimento do time de Marketing às unidades de negócio, com mapeamento de demandas, prazos, responsáveis e gargalos, e proposta de fluxo otimizado.",
    "2. Revisão da estrutura do time de Marketing: papéis, responsabilidades, competências e eventuais lacunas.",
    "3. Revisão do orçamento de Marketing: alocação por unidade de negócio e por canal, e recomendações de realocação.",
    "4. Acompanhamento da campanha de captação vigente junto à nova gestão de Marketing, para que siga de forma fluida e com resultados positivos.");
  p("**1.3.** Os serviços abrangem **todas as unidades de negócio da CONTRATANTE**, compreendendo seus níveis de ensino, cursos e demais frentes institucionais que demandem atuação da área de Marketing.");
  p("**1.4.** A CONTRATADA atua em caráter consultivo e de orientação. As decisões finais de gestão, contratação, orçamento e aprovação de campanhas permanecem de competência exclusiva da CONTRATANTE.");
  p("**1.5.** O escopo abrange, de forma integral, a estratégia e a operação de Marketing da CONTRATANTE em todas as unidades de negócio, incluindo as demandas que surgirem durante a vigência, sem qualquer cobrança adicional além da remuneração prevista na Cláusula 6. Custos de terceiros, como verba de mídia, ferramentas e fornecedores, permanecem a cargo da CONTRATANTE.");
  p("**1.6. Da indicação de profissionais externos.** Identificado e validado um gargalo cuja solução demande competência especializada não coberta por este escopo (por exemplo, um profissional de mídia paga, dados ou desenvolvimento), a CONTRATADA se compromete a indicar à CONTRATANTE profissionais ou empresas aptos a atender a demanda, observando-se que:");
  p("1. Os profissionais indicados não integram o quadro nem o CNPJ da CONTRATADA, e sua remuneração **não está incluída** no valor previsto na Cláusula 6.",
    "2. A contratação será feita **diretamente entre a CONTRATANTE e o profissional ou empresa indicada**, por instrumento próprio, com emissão de nota fiscal diretamente à CONTRATANTE, sem intermediação da CONTRATADA.",
    "3. A CONTRATANTE é livre para aceitar ou recusar as indicações e para negociar diretamente valores, prazos e condições.",
    "4. A CONTRATADA poderá orientar tecnicamente a atuação desses profissionais no âmbito do projeto, mas não responde pela execução de seus serviços nem por suas obrigações contratuais, trabalhistas, previdenciárias ou fiscais.");

  p("## Cláusula 2. Do escopo e da metodologia");
  p("**2.1.** Os serviços serão executados conforme a metodologia da CONTRATADA, organizada em cinco fases, aplicadas a cada unidade de negócio conforme sua prioridade:");
  p("**2.1.1. Fase 1, Diagnóstico:** análise da maturidade da área de Marketing, do fluxo de atendimento às unidades de negócio, da estrutura do time, do orçamento e dos gargalos de conversão da captação, resultando em relatório de diagnóstico com o mapeamento dos gargalos por unidade de negócio.");
  p("**2.1.2. Fase 2, Estratégia:** elaboração do plano de ação para a transição da gestão e para a campanha de captação, contemplando o desenho do novo fluxo de atendimento, a proposta de estrutura do time e a recomendação de alocação de verba por unidade de negócio e por canal.");
  p("**2.1.3. Fase 3, Execução:** implantação, em conjunto com a nova gestão de Marketing, do fluxo de atendimento, dos rituais de acompanhamento e dos ajustes de campanha, bem como início do plano de treinamento da nova gestão.");
  p("**2.1.4. Fase 4, Otimização:** acompanhamento contínuo e recomendação de ajustes em criativos, segmentações e taxas de conversão da campanha de captação, com registro das decisões tomadas.");
  p("**2.1.5. Fase 5, Resultados:** acompanhamento dos indicadores de desempenho e conclusão da passagem integral das atividades à nova gestão, formalizada em relatório final de transição e de desempenho da captação.");
  p("**2.2.** O **treinamento da nova gestão** compreende: repasse do histórico e do contexto de cada unidade de negócio; mentoria em planejamento, orçamento e gestão de campanhas; acompanhamento das primeiras decisões; e entrega de documentação de processos.");
  p("**2.3.** A ordem e a intensidade das fases poderão ser ajustadas de comum acordo, conforme o calendário de captação de cada unidade.");

  p("## Cláusula 3. Da autonomia e da forma de prestação");
  p("**3.1.** Os serviços são contratados por **escopo e resultado**. Não haverá contabilização, registro ou controle de horas, nem fixação de jornada ou horário de trabalho.");
  p("**3.2.** A CONTRATADA definirá livremente a forma, o local, os dias e os horários de execução dos serviços, presencialmente ou a distância, observadas apenas as datas de reuniões e entregas acordadas entre as partes.");
  p("**3.3.** A CONTRATADA atua com plena autonomia técnica, sem subordinação hierárquica à CONTRATANTE. Seus profissionais não integram o quadro funcional nem o organograma da CONTRATANTE e não exercem cargo de gestão, embora orientem e treinem a nova gestão de Marketing.");
  p("**3.4.** A CONTRATADA poderá indicar profissionais de sua equipe para a execução dos serviços, sob sua exclusiva responsabilidade, sendo vedada a exigência de pessoalidade, salvo quanto à coordenação geral do projeto.");
  p("**3.5.** A CONTRATADA poderá prestar serviços a terceiros durante a vigência deste contrato, observada a Cláusula 8 (confidencialidade).");
  p("**3.6.** O presente contrato não gera vínculo empregatício, societário ou de representação entre as partes ou entre a CONTRATANTE e os profissionais da CONTRATADA, cabendo a esta todos os encargos trabalhistas, previdenciários e fiscais relativos à sua equipe.");

  p("## Cláusula 4. Da cadência de acompanhamento");
  p("**4.1.** A CONTRATADA fará o acompanhamento da equipe de Marketing e das unidades de negócio no formato e na frequência que o projeto exigir, podendo adotar, entre outros, rituais diários (dailys), semanais (weeklys) e reuniões pontuais, presenciais ou a distância.");
  p("**4.2.** A definição dos formatos, da periodicidade, dos participantes e das pautas de acompanhamento cabe à CONTRATADA, conforme as necessidades identificadas no dia a dia do projeto.");
  p("**4.3.** A CONTRATADA reportará a evolução do projeto **diretamente à Reitoria** da CONTRATANTE, no formato e na periodicidade que julgar adequados, apresentando o andamento dos trabalhos, os gargalos identificados e as recomendações necessárias para subsidiar a tomada de decisões estratégicas. Esse reporte constitui o instrumento de aferição dos serviços, em substituição a qualquer controle de horas.");
  p("**4.4.** Mudanças na estrutura da equipe, mudanças de rota estratégica, contratações e desligamentos recomendados pela CONTRATADA dependerão de **aprovação prévia e expressa da Reitoria**. A execução e os trâmites dessas decisões caberão exclusivamente à equipe administrativa da CONTRATANTE, não cabendo à CONTRATADA praticar atos de gestão de pessoal em nome da CONTRATANTE.");
  p("**4.5.** Durante a vigência deste contrato, a CONTRATADA disponibilizará à CONTRATANTE, sem custo adicional, acesso à sua plataforma de diagnóstico (www.lorsodigital.com.br/diagnostico), para acompanhamento do andamento das entrevistas e das etapas de trabalho. O acesso é pessoal, limitado aos usuários indicados pela CONTRATANTE, e será encerrado ao término do contrato. A Reitoria terá acesso integral de leitura a todo o conteúdo da plataforma, e os relatórios nela gerados serão encaminhados diretamente à Reitoria, contemplando todo o trabalho realizado. Os dados da CONTRATANTE inseridos na plataforma permanecem de sua titularidade e serão tratados nos termos do item 8.2.");

  p("## Cláusula 5. Das obrigações das partes");
  p("**5.1. São obrigações da CONTRATADA:**");
  p("1. Executar os serviços com zelo, diligência e as melhores práticas de mercado.",
    "2. Realizar o acompanhamento da equipe e reportar a evolução do projeto à Reitoria, nos termos da Cláusula 4.",
    "3. Comunicar à CONTRATANTE, de forma tempestiva, riscos identificados à campanha de captação ou à transição.",
    "4. Manter sigilo sobre as informações da CONTRATANTE, nos termos da Cláusula 8.");
  p("**5.2. São obrigações da CONTRATANTE:**");
  p("1. Indicar um interlocutor responsável pelo contrato e apresentar a nova gestão de Marketing à CONTRATADA.",
    "2. Disponibilizar à CONTRATADA, ao longo de toda a execução do contrato, as informações, documentos, dados e acessos necessários à efetivação do trabalho proposto, conforme forem solicitados.",
    "3. Viabilizar a participação dos representantes das unidades de negócio nas reuniões necessárias.",
    "4. Efetuar os pagamentos nos prazos ajustados.",
    "5. Disponibilizar à CONTRATADA, sem custo, vaga de estacionamento em suas dependências sempre que houver reuniões presenciais ou atividades de acompanhamento dos serviços na instituição.");
  p("**5.3.** Atrasos decorrentes da falta de acesso, informações ou aprovações por parte da CONTRATANTE não serão imputados à CONTRATADA.");

  p("## Cláusula 6. Da remuneração");
  p(`**6.1.** Pelos serviços, a CONTRATANTE pagará à CONTRATADA o valor **fixo mensal de R$ ${moeda(valor)} (${reaisExtenso(valor)})**, independentemente da quantidade de horas dedicadas, dada a natureza de escopo e resultado do contrato.`);
  if (pct < 100) p(`**6.1.1.** Nos meses de **julho e dezembro**, em razão do período de férias acadêmicas, o valor mensal será de **R$ ${moeda(ferias)} (${reaisExtenso(ferias)})**, correspondente a ${pct}% (${inteiroExtenso(pct)} por cento) do valor previsto no item 6.1, sem redução do escopo contratado.`);
  if (bolsa) p(`**6.1.2.** Adicionalmente, a título de bonificação, ${bolsa}`);
  p("**6.2.** O pagamento será feito até o **dia 5 (cinco) de cada mês**, referente aos serviços prestados no mês anterior, sendo o primeiro pagamento devido no mês subsequente ao início da prestação dos serviços. O pagamento será efetuado mediante emissão de nota fiscal pela CONTRATADA, via PIX, exclusivamente para conta de titularidade da pessoa jurídica CONTRATADA" +
    ` (${ou(cd.razao, "razão social")}, CNPJ ${ou(cd.cnpj, "CNPJ")}), chave PIX: CNPJ ${ou(cd.cnpj, "CNPJ")}.`);
  p("**6.3.** Sempre que a CONTRATANTE solicitar a participação da CONTRATADA em reuniões, eventos ou atividades **fora de suas dependências**, ou viagens de qualquer natureza, as despesas decorrentes, tais como locomoção (inclusive por aplicativo de transporte, táxi ou combustível), passagens, hospedagem e alimentação, serão **custeadas pela CONTRATANTE**, diretamente ou por reembolso, mediante apresentação dos comprovantes, em até 15 (quinze) dias contados da sua apresentação. Esses valores não integram a remuneração prevista no item 6.1.");
  p("**6.4.** O atraso no pagamento sujeitará a CONTRATANTE a multa de 2% (dois por cento), juros de mora de 1% (um por cento) ao mês e correção monetária pelo IPCA, calculados pro rata die.");
  p("**6.5.** Em caso de renovação, o valor será reajustado anualmente, na data de aniversário do contrato, pela variação acumulada do IPCA (Índice Nacional de Preços ao Consumidor Amplo), apurado oficialmente pelo IBGE, nos 12 (doze) meses anteriores. Na hipótese de extinção do IPCA, será adotado o índice oficial que vier a substituí-lo.");
  p("**6.6.** Os tributos incidentes sobre os serviços são de responsabilidade de quem a lei determinar, cabendo à CONTRATANTE as retenções legais na fonte, quando aplicáveis.");
  p("**6.7.** O atraso no pagamento superior a 15 (quinze) dias autoriza a CONTRATADA, mediante notificação prévia por escrito com antecedência de 5 (cinco) dias, a suspender a prestação dos serviços até a regularização, sem que isso configure descumprimento contratual, permanecendo devidos os valores do período.");

  p("## Cláusula 7. Do prazo e da rescisão");
  p(`**7.1.** O contrato vigorará por **${meses} (${inteiroExtenso(meses)}) ${meses === 1 ? "mês" : "meses"}**, a contar de ${dataExtenso(d.data_inicio)}, podendo ser renovado por iguais períodos mediante termo aditivo.`);
  p("**7.2.** Qualquer das partes, CONTRATANTE ou CONTRATADA, poderá rescindir este contrato a qualquer tempo, sem justa causa, mediante **aviso prévio por escrito de 30 (trinta) dias**, **sem incidência de multa ou indenização** de qualquer natureza, observadas as seguintes premissas:");
  p("1. Durante o período de aviso prévio, os serviços continuarão sendo prestados normalmente e a remuneração continuará devida.",
    "2. Serão devidos apenas os valores proporcionais aos serviços prestados até o último dia do aviso prévio, além de eventuais despesas a reembolsar nos termos do item 6.3.",
    "3. A CONTRATADA realizará a entrega prevista no item 7.4.",
    ...(bolsa ? ["4. A bolsa de estudos prevista no item 6.1.2 será mantida nos termos ali estabelecidos.",
      "5. Permanecem em vigor, após a rescisão, as obrigações de confidencialidade, proteção de dados e propriedade intelectual previstas na Cláusula 8."]
      : ["4. Permanecem em vigor, após a rescisão, as obrigações de confidencialidade, proteção de dados e propriedade intelectual previstas na Cláusula 8."]));
  p("**7.3.** O contrato poderá ser rescindido de imediato, por justa causa, em caso de descumprimento de obrigação contratual não sanado em 10 (dez) dias após notificação, de falência ou recuperação judicial de qualquer das partes, ou de violação da Cláusula 8.");
  p("**7.4.** Encerrado o contrato por qualquer motivo, a CONTRATADA entregará à CONTRATANTE, em até 30 (trinta) dias, o relatório de transição e a documentação produzida, limitados ao que tiver sido levantado e desenvolvido até a data do encerramento. Caso o contrato se encerre antes da conclusão das fases previstas na Cláusula 2, a entrega será parcial, correspondente ao trabalho efetivamente realizado. A CONTRATADA devolverá, no mesmo prazo, os acessos recebidos.");

  p("## Cláusula 8. Da confidencialidade, proteção de dados e propriedade intelectual");
  p("**8.1.** A CONTRATADA manterá **absoluta confidencialidade** sobre todas as informações a que tiver acesso em razão deste contrato, incluindo as estratégicas, financeiras, comerciais, institucionais e as relativas a alunos, candidatos e colaboradores. A CONTRATADA obriga-se a jamais compartilhar essas informações com terceiros e a não utilizá-las, direta ou indiretamente, para qualquer finalidade que possa causar prejuízo à CONTRATANTE. Essa obrigação vigora desde a assinatura deste contrato e **por prazo indeterminado**, inclusive após o seu término, qualquer que seja o motivo, ressalvadas apenas as hipóteses de determinação legal ou judicial.");
  p("**8.2.** As partes cumprirão a Lei nº 13.709/2018 (LGPD). A CONTRATADA tratará dados pessoais apenas na qualidade de operadora, conforme instruções da CONTRATANTE e exclusivamente para a execução deste contrato, adotando medidas de segurança adequadas e comunicando qualquer incidente em até 48 (quarenta e oito) horas.");
  p("**8.3.** Os relatórios, planos e documentos produzidos especificamente para a CONTRATANTE serão de sua propriedade após o pagamento integral. Metodologias, modelos, ferramentas e conhecimentos prévios da CONTRATADA permanecem de propriedade desta, que concede à CONTRATANTE licença de uso interno e não exclusiva.");
  p("**8.3.1.** A plataforma de diagnóstico mencionada no item 4.5, incluindo seu modelo, metodologia, estrutura, funcionalidades, telas, código, questionários e critérios de avaliação, é de **propriedade intelectual exclusiva da CONTRATADA**. O acesso concedido não transfere à CONTRATANTE qualquer direito sobre a plataforma, sendo vedado à CONTRATANTE, por si ou por terceiros, copiar, reproduzir, adaptar, desenvolver solução similar a partir dela ou utilizá-la fora do escopo deste contrato, durante a vigência e após o seu término, sob pena de responder por perdas e danos. Os relatórios gerados pela plataforma e entregues à CONTRATANTE poderão ser livremente consultados e utilizados por ela para fins internos, sem que isso implique cessão do modelo, do formato ou da metodologia da plataforma.");
  p("**8.4.** Durante a vigência e por 12 (doze) meses após o término, nenhuma das partes contratará, diretamente ou por terceiros, profissionais da outra parte que tenham atuado neste projeto, salvo concordância por escrito.");
  p("**8.5.** A CONTRATADA poderá citar a CONTRATANTE como cliente em seu portfólio somente mediante autorização prévia e por escrito.");

  p("## Cláusula 9. Das disposições gerais e do foro");
  p("**9.1.** A responsabilidade da CONTRATADA limita-se a obrigações de meio, não garantindo resultados numéricos específicos de captação, que dependem de fatores externos e de decisões da CONTRATANTE. Sua responsabilidade total fica limitada ao valor recebido nos 3 (três) últimos meses de contrato.");
  p("**9.2.** Alterações deste contrato somente terão validade por termo aditivo assinado pelas partes.");
  p("**9.3.** A tolerância de uma parte quanto ao descumprimento de qualquer cláusula não constitui novação ou renúncia.");
  p(`**9.4.** As comunicações entre as partes serão feitas por escrito, inclusive por e-mail, aos endereços: CONTRATANTE: ${ou(ct.email_comunicacao || ct.rep_email, "e-mail")}; CONTRATADA: ${ou(cd.rep_email, "e-mail")}.`);
  p("**9.5.** As partes admitem a assinatura deste contrato por meio eletrônico, nos termos do art. 10, § 2º, da MP nº 2.200-2/2001, e reconhecem como válida a assinatura realizada pela plataforma da CONTRATADA, com verificação de e-mail por código, confirmação de CPF e registro de data, hora, endereço IP e impressão digital (SHA-256) do documento.");
  p("**9.6.** Fica eleito o foro da Comarca de São Paulo/SP para dirimir quaisquer questões oriundas deste contrato, com renúncia a qualquer outro.");
  p("E, por estarem justas e contratadas, as partes assinam eletronicamente o presente instrumento, na presença das testemunhas abaixo.");
  p("## Testemunhas");
  p(...t.map((x, i) => `${i + 1}. ${ou(x.nome, "nome")}, CPF ${cpfFmt(x.cpf)}`));
  return L.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}
