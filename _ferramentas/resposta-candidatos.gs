/* ==========================================================
   LORSO DIGITAL — Resposta automática aos candidatos
   Google Apps Script, rodando na conta alessandro@lorsodigital.com.br.

   Como funciona:
   - Os formulários de /trabalheconosco enviam via FormSubmit e chegam no
     Gmail com o assunto "💼 Nova candidatura: <vaga>" (página da vaga)
     ou "💼 Banco de talentos: novo perfil" (banco de talentos).
   - A cada 5 minutos, responderCandidaturas() procura essas mensagens,
     lê nome, e-mail e vaga da tabela do FormSubmit e envia ao candidato
     o e-mail de confirmação (com topo e assinatura).
   - Cada candidatura respondida recebe o rótulo "Candidatura respondida",
     para não ser respondida duas vezes. Se faltar o e-mail do candidato,
     recebe "Candidatura - verificar".

   Instalação (uma vez só):
   1. script.google.com > Novo projeto > colar este arquivo inteiro.
   2. Rodar testarUltimaCandidatura() e conferir o log (não envia nada).
   3. Rodar instalarGatilho() e autorizar o acesso ao Gmail.
   ========================================================== */

const CONFIG = {
  BUSCA: 'from:formsubmit.co subject:("Nova candidatura" OR "Banco de talentos") newer_than:7d',
  BANCO_DE_TALENTOS: 'Banco de talentos',
  ROTULO_OK: 'Candidatura respondida',
  ROTULO_ERRO: 'Candidatura - verificar',
  REMETENTE_NOME: 'LORSO Digital · Gente & Gestão',
  LOGO_URL: 'https://www.lorsodigital.com.br/assets/img/email/logo-lorso-email.png',
  SITE_URL: 'https://www.lorsodigital.com.br',
  INSTAGRAM_URL: 'https://www.instagram.com/lorsodigital/',
};

/* -----------------------------
   Rotina principal (roda pelo gatilho)
------------------------------ */
function responderCandidaturas() {
  const rotuloOk = obterRotulo(CONFIG.ROTULO_OK);
  const rotuloErro = obterRotulo(CONFIG.ROTULO_ERRO);
  const busca = `${CONFIG.BUSCA} -label:"${CONFIG.ROTULO_OK}" -label:"${CONFIG.ROTULO_ERRO}"`;

  GmailApp.search(busca, 0, 50).forEach((thread) => {
    const candidatura = lerCandidatura(thread.getMessages()[0]);

    if (!candidatura.email) {
      thread.addLabel(rotuloErro);
      console.warn('Candidatura sem e-mail: ' + thread.getFirstMessageSubject());
      return;
    }

    GmailApp.sendEmail(candidatura.email, assunto(candidatura), textoSimples(candidatura), {
      htmlBody: emailHtml(candidatura),
      name: CONFIG.REMETENTE_NOME,
    });
    thread.addLabel(rotuloOk);
    console.log(`Resposta enviada para ${candidatura.email} (${candidatura.vaga})`);
  });
}

/* -----------------------------
   Configuração e teste
------------------------------ */
function instalarGatilho() {
  ScriptApp.getProjectTriggers()
    .filter((t) => t.getHandlerFunction() === 'responderCandidaturas')
    .forEach((t) => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('responderCandidaturas').timeBased().everyMinutes(5).create();
  console.log('Gatilho instalado: responderCandidaturas a cada 5 minutos.');
}

// Mostra no log o que seria lido da candidatura mais recente, sem enviar nada.
function testarUltimaCandidatura() {
  const threads = GmailApp.search(CONFIG.BUSCA, 0, 1);
  if (!threads.length) {
    console.log('Nenhuma candidatura encontrada nos últimos 7 dias.');
    return;
  }
  console.log(JSON.stringify(lerCandidatura(threads[0].getMessages()[0]), null, 2));
}

// Envia o e-mail de exemplo para a própria conta, para ver o visual.
function enviarExemploParaMim() {
  const eu = Session.getActiveUser().getEmail();
  ['Gerente de Marketing Educacional', CONFIG.BANCO_DE_TALENTOS].forEach((vaga) => {
    const exemplo = { nome: 'Maria Silva', primeiroNome: 'Maria', email: eu, vaga: vaga };
    GmailApp.sendEmail(eu, '[Exemplo] ' + assunto(exemplo), textoSimples(exemplo), {
      htmlBody: emailHtml(exemplo),
      name: CONFIG.REMETENTE_NOME,
    });
  });
}

/* -----------------------------
   Leitura do e-mail do FormSubmit
------------------------------ */
function lerCandidatura(mensagem) {
  const campos = lerTabela(mensagem.getBody());
  const texto = mensagem.getPlainBody();

  const nome = campos['Nome'] || campoNoTexto(texto, 'Nome') || '';
  const email = validarEmail(campos['E-mail']) || validarEmail(campoNoTexto(texto, 'E-mail')) || primeiroEmailExterno(texto);
  const vaga = campos['Vaga'] || (mensagem.getSubject().split(':')[1] || '').trim() || 'nossa vaga';

  return { nome: nome, primeiroNome: primeiroNome(nome), email: email, vaga: vaga };
}

// Tabela do template "table" do FormSubmit: cada <tr> tem rótulo e valor.
function lerTabela(html) {
  const campos = {};
  (html.match(/<tr[\s\S]*?<\/tr>/gi) || []).forEach((linha) => {
    const celulas = (linha.match(/<t[hd][^>]*>[\s\S]*?<\/t[hd]>/gi) || []).map(limparHtml);
    if (celulas.length >= 2 && celulas[0]) campos[celulas[0]] = celulas[1];
  });
  return campos;
}

function campoNoTexto(texto, rotulo) {
  const achado = texto.match(new RegExp('^\\s*' + rotulo + '\\s*[:\\t]?\\s*\\n?\\s*(.+)$', 'mi'));
  return achado ? achado[1].trim() : '';
}

function primeiroEmailExterno(texto) {
  const emails = texto.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [];
  return emails.find((e) => !/lorsodigital|formsubmit/i.test(e)) || '';
}

function validarEmail(valor) {
  const achado = (valor || '').match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return achado ? achado[0] : '';
}

function limparHtml(trecho) {
  return trecho
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function primeiroNome(nome) {
  const primeiro = (nome || '').trim().split(/\s+/)[0] || '';
  return primeiro ? primeiro.charAt(0).toUpperCase() + primeiro.slice(1).toLowerCase() : '';
}

function obterRotulo(nome) {
  return GmailApp.getUserLabelByName(nome) || GmailApp.createLabel(nome);
}

/* -----------------------------
   Conteúdo do e-mail ao candidato
   (um texto para vaga e outro para o banco de talentos)
------------------------------ */
function ehBancoDeTalentos(c) {
  return c.vaga === CONFIG.BANCO_DE_TALENTOS;
}

function assunto(c) {
  return ehBancoDeTalentos(c)
    ? 'Recebemos seu perfil no Banco de Talentos'
    : `Recebemos sua candidatura: ${c.vaga}`;
}

// Parágrafos do corpo; o trecho entre ** vira negrito no HTML.
function paragrafos(c) {
  if (ehBancoDeTalentos(c)) {
    return [
      'Agradecemos pelo seu interesse em fazer parte da rede de talentos da **LORSO Digital**.',
      'Confirmamos o recebimento do seu currículo. Seu perfil ficará no nosso banco de talentos e será considerado nos próximos processos seletivos, na LORSO e em nossos clientes.',
      'Quando surgir uma oportunidade alinhada com a sua experiência, entraremos em contato.',
      'Desejamos muito sucesso em sua trajetória!',
    ];
  }
  return [
    `Agradecemos pelo seu interesse em fazer parte do nosso time e por se candidatar à vaga de **${c.vaga}**.`,
    'Confirmamos o recebimento do seu currículo. Nosso time de Gente & Gestão analisará seu perfil e histórico profissional com atenção para avaliar a compatibilidade com os desafios do cargo.',
    'Caso seu perfil esteja alinhado com o que buscamos, entraremos em contato para dar sequência às próximas etapas do processo seletivo.',
    'Desejamos muito sucesso em sua trajetória!',
  ];
}

function textoSimples(c) {
  const saudacao = c.primeiroNome ? `Olá, ${c.primeiroNome}!` : 'Olá!';
  return [
    saudacao,
    '',
    paragrafos(c).map((t) => t.replace(/\*\*/g, '')).join('\n\n'),
    '',
    'Atenciosamente,',
    'Time de Gente & Gestão',
    'LORSO Digital',
    CONFIG.SITE_URL,
  ].join('\n');
}

function emailHtml(c) {
  const saudacao = c.primeiroNome ? `Olá, ${escapar(c.primeiroNome)}!` : 'Olá!';
  const p = 'margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#334155;';
  const corpo = paragrafos(c)
    .map((t) => `<p style="${p}">${escapar(t).replace(/\*\*(.+?)\*\*/g, '<strong style="color:#0f172a;">$1</strong>')}</p>`)
    .join('\n        ');
  const selo = ehBancoDeTalentos(c) ? 'Perfil recebido' : 'Candidatura recebida';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapar(assunto(c))}</title></head>
<body style="margin:0;padding:0;background-color:#eef1f4;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#eef1f4;">
  <tr><td align="center" style="padding:24px 12px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background-color:#ffffff;border-radius:8px;overflow:hidden;">

      <!-- Topo -->
      <tr><td style="background-color:#090A0F;padding:28px 32px;">
        <a href="${CONFIG.SITE_URL}" style="text-decoration:none;"><img src="${CONFIG.LOGO_URL}" width="150" height="53" alt="LORSO Digital" style="display:block;border:0;width:150px;height:auto;"></a>
      </td></tr>
      <tr><td style="background-color:#00ff87;height:4px;line-height:4px;font-size:0;">&nbsp;</td></tr>

      <!-- Corpo -->
      <tr><td style="padding:36px 32px 8px;">
        <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#00a85a;font-weight:bold;">${selo}</p>
        <h1 style="margin:0 0 24px;font-family:Arial,Helvetica,sans-serif;font-size:22px;line-height:30px;color:#0f172a;">${saudacao}</h1>
        ${corpo}
        <p style="margin:24px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#334155;">Atenciosamente,</p>
      </td></tr>

      <!-- Assinatura -->
      <tr><td style="padding:16px 32px 32px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="border-left:3px solid #00ff87;padding:2px 0 2px 14px;">
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:22px;color:#0f172a;font-weight:bold;">Time de Gente &amp; Gestão</p>
              <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:#64748b;">LORSO Digital · Hub de Inteligência Operacional &amp; Escala</p>
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;">
                <a href="${CONFIG.SITE_URL}" style="color:#00a85a;text-decoration:none;font-weight:bold;">lorsodigital.com.br</a>
                <span style="color:#cbd5e1;">&nbsp;|&nbsp;</span>
                <a href="${CONFIG.INSTAGRAM_URL}" style="color:#00a85a;text-decoration:none;font-weight:bold;">@lorsodigital</a>
              </p>
            </td>
          </tr>
        </table>
      </td></tr>

      <!-- Rodapé -->
      <tr><td style="background-color:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;">
        <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#94a3b8;">Este é um e-mail automático de confirmação. Seus dados são usados apenas em processos seletivos.</p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function escapar(texto) {
  return String(texto || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
