# Central de Diagnóstico · LORSO Digital

Sistema de diagnóstico de maturidade de marketing educacional, publicado em
`www.lorsodigital.com.br/diagnostico/`. HTML, CSS e JS puros (sem build), como o
resto do site: sobe junto com o GitHub Pages a cada push na `main`.

## Arquivos

| Arquivo | O que é |
| --- | --- |
| `index.html` | Casca da página (login + app) |
| `style.css` | Visual, nas cores e na fonte da LORSO |
| `perguntas.js` | Banco de perguntas, áreas, UNs e as 5 fases. É aqui que você edita perguntas |
| `app.js` | Cálculo de maturidade, motor de cruzamento, telas, login e gravação no Supabase |
| `config.js` | Endereço e chave **pública** do Supabase (pode ficar no navegador) |
| `supabase/0001_estrutura.sql` | Estrutura do banco e regras de acesso (já aplicada no projeto) |
| `supabase/0002_base_e_priorizacao.sql` | Cursos da base de conhecimento e matriz de priorização interna |
| `supabase/0003_tarefas_internas.sql` | Kanban interno da equipe LORSO, fora do contexto do cliente |
| `supabase/0004_fontes_conhecimento.sql` | Fontes da base de conhecimento (NotebookLM, arquivos, site) |
| `supabase/0005_modulos.sql` | Módulos por cliente (DRE, lançamento) e quais cada cliente usa |
| `supabase/0006_recursos_privados.sql` | Chave do módulo de lançamento (só usuários logados leem) |
| `supabase/functions/ler-site` | Função que lê o site do cliente para a base de conhecimento |
| `dre.js` | Módulo DRE e orçamento, ligado ao financeiro e às UNs do diagnóstico |
| `tema.css` | Visual da Central (claro e escuro), gráficos de resultados e módulos |
| `modulos/lancamento.enc` | App de lançamento de curso **criptografado**. A versão aberta fica no Project do Claude (modulos/lancamento-curso-integrado.html); para atualizar, criptografe de novo com a chave de `app_recursos` |

## Banco (Supabase)

- Projeto: `lorso-diagnostico` (região São Paulo, id `wloetjknoxynstzsfchp`).
- Só entra quem está na tabela `convites`. Ao criar a senha, o perfil nasce com o papel do convite:
  - `admin`: vê tudo e convida pessoas;
  - `equipe`: vê e preenche todos os diagnósticos;
  - `cliente`: só vê diagnósticos liberados em `membros_diagnostico`.
- Vários usuários podem preencher ao mesmo tempo: cada alteração grava só o trecho que mudou,
  e as telas abertas se atualizam em tempo real.

### Ajustes únicos no painel do Supabase

Em **Authentication → URL Configuration**:

1. **Site URL:** `https://www.lorsodigital.com.br/diagnostico/`
2. **Redirect URLs:** adicione `https://www.lorsodigital.com.br/diagnostico/`

Em **Authentication → Sign In / Providers → Email**:

3. Desligue **Confirm email**. O convite já controla quem pode entrar, e o envio de e-mails
   padrão do Supabase tem limite baixo por hora. Se preferir manter a confirmação, configure um
   SMTP próprio em **Authentication → Emails → SMTP Settings**.

## Primeiro acesso

1. Abra `/diagnostico/`, clique em **Primeiro acesso** e use `alecochetti@gmail.com`
   (ou `alessandro@lorsodigital.com.br`). Os dois já estão convidados como administrador.
2. Crie o primeiro diagnóstico.
3. Na aba **Equipe**, convide cada funcionário. O sistema copia um texto pronto com o link
   e as instruções para você enviar.

## Editar perguntas

Cada pergunta em `perguntas.js` é:

```
[id, título curto, pilar, impacto, eliminatória, enunciado, [N1, N2, N3, N4]]
```

- Pilar: `P` Processos, `E` Pessoas, `F` Ferramentas, `C` Cultura.
- Impacto: 3 alto, 2 médio, 1 baixo. Eliminatória: `1` limita a área a Estruturado se a resposta for N1.
- Nunca reaproveite um `id` para outra pergunta: as respostas ficam gravadas pelo id.

As regras do motor de cruzamento (`CRZ-01` a `CRZ-56`) ficam em `app.js`, na seção
`MOTOR DE CRUZAMENTO`.
