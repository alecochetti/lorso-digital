# LORSO Digital — Landing Page

Landing page institucional da LORSO Digital (consultoria de Marketing, Growth e Operações Comerciais), gerada a partir do export do Stitch e reestruturada em HTML/CSS/JS puro, pronta para deploy estático (GitHub Pages, Netlify, Vercel etc.).

## Estrutura do projeto

```
lorso-digital/
├── index.html          # Estrutura e conteúdo da página
├── css/
│   └── style.css        # Reset, menu mobile, estilos do formulário
├── js/
│   └── script.js         # Menu mobile, máscara de WhatsApp, validação e envio do form
├── assets/
│   └── img/               # Pasta reservada para imagens locais (ver "Imagens" abaixo)
└── README.md
```

O layout usa **Tailwind CSS via CDN** (`cdn.tailwindcss.com`) com a configuração de cores, tipografia e espaçamentos definida no `<head>` do `index.html`, seguindo o design system em `DESIGN.md` (Kinetic Executive Dark).

## Como visualizar localmente

Não há build step. Basta abrir o `index.html` no navegador, ou rodar um servidor estático simples:

```bash
# Python
python3 -m http.server 8080

# Node (npx)
npx serve .
```

Depois acesse `http://localhost:8080`.

## Responsividade

- Header com menu hambúrguer abaixo de 1024px (`lg`), incluindo o CTA "Agendar Diagnóstico" que antes só aparecia no desktop.
- Grids de 12/4/3/2 colunas colapsam para 1 coluna em mobile automaticamente (classes `md:` / `lg:` do Tailwind).
- Tipografia com escalas mobile-first (`text-headline-xl-mobile` → `sm:` → `lg:`).
- Ancoragem de navegação corrigida (Serviços, O Método, Cases, Liderança e o CTA de diagnóstico agora apontam para seções reais da página, tanto no header quanto no rodapé).

## Formulário de contato

Campos: **Nome, Empresa, E-mail, WhatsApp (com máscara automática), Faturamento Médio Mensal e Canal de Preferência**, mais o checkbox de consentimento (LGPD).

O envio é feito via **[FormSubmit.co](https://formsubmit.co/)** — um serviço gratuito que recebe o POST do formulário e encaminha por e-mail, sem precisar de backend próprio nem chave de API.

- **E-mail de destino configurado (provisório):** `alecochetti@gmail.com`
- Está definido em dois lugares — troque nos dois se for mudar o e-mail:
  1. `action="https://formsubmit.co/SEU-EMAIL"` no `<form>` do `index.html`
  2. O JS (`js/script.js`) lê esse mesmo e-mail automaticamente para montar o endpoint de envio via AJAX — **não precisa editar o JS**, só o `action` do form.

### ⚠️ Ativação obrigatória (primeira vez)

Na primeira submissão do formulário em produção, o FormSubmit envia um **e-mail de confirmação** para `alecochetti@gmail.com` pedindo para clicar em um link de ativação. Até essa confirmação, os envios seguintes não chegam à caixa de entrada. Ou seja: assim que subir o site, faça um teste de envio e confirme o e-mail que chegar do FormSubmit.

Depois de confirmado, o fluxo continua sem novas confirmações.

Mensagem exibida ao usuário após o envio (sem sair da página, via AJAX):

> "Recebemos seu contato! Nosso time vai analisar as informações e em breve entraremos em contato."

Se quiser trocar para outro serviço (Web3Forms, Formspree, EmailJS etc.) no futuro, o ponto de integração está isolado na função `setupContactForm()` em `js/script.js`.

## Imagens

O export original do Stitch referencia o logo e a foto do fundador através de links temporários do Google (`lh3.googleusercontent.com/aida/...`), usados durante o preview no Stitch/AI Studio. Esses links **podem expirar** a qualquer momento — o ideal antes de ir para produção é:

1. Baixar o logo (`logo.png`) e a foto do Alessandro (`founder.jpg`) para `assets/img/`.
2. Trocar os `src` correspondentes no `index.html` (busque por `lh3.googleusercontent.com`) para `assets/img/logo.png` e `assets/img/founder.jpg`.

## Deploy no GitHub Pages

```bash
git remote add origin <URL_DO_SEU_REPOSITORIO>
git branch -M main
git push -u origin main
```

Depois, em **Settings → Pages** do repositório, selecione a branch `main` (pasta raiz `/`) como fonte. O site fica disponível em `https://SEU-USUARIO.github.io/NOME-DO-REPO/`.

## Próximos passos sugeridos

- Substituir imagens externas por arquivos locais (ver "Imagens").
- Revisar textos institucionais (endereço, telefone e e-mail no rodapé são placeholders do export original).
- Definir e-mail definitivo de recebimento de leads no FormSubmit.
- Adicionar Google Analytics/Meta Pixel, se aplicável.
