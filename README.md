# Central Web — Protótipo v0.2.1

Aplicação local e individual para organizar o lançamento de um pequeno estúdio de criação digital. O projeto é **separado** do portfólio profissional.

## Stack atual

- Vue 3 + TypeScript + Vite
- CSS responsivo com paletas completas Light/Dark e `lucide-vue-next`
- Vue reativo + `localStorage` para demonstrar fluxos sem backend

**Etapas 7.1–7.3:** a API Express/TypeScript usa TypeORM/PostgreSQL com migrations de domínio e de sessões versionadas em `apps/api`, além de login local por cookie HttpOnly. Ainda não há rotas de negócio ou integração com o frontend; a API não está pronta para uso público. Veja [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md).

## Iniciar no computador

```bash
npm install
npm run typecheck
npm test
npm run dev
npm run build
```

`npm run build` cria a pasta `dist/` quando a checagem de tipos e o Vite terminam sem erro. Para esta alteração, `npm test`, `npm run typecheck` e `npm run build` foram executados com sucesso no workspace. `npm install` não foi necessário porque as dependências já estavam presentes; o repositório ainda não tem lockfile e uma instalação limpa requer acesso ao registro.

## Backend local — etapa 7.1

O backend está **isolado** em [`apps/api/`](apps/api), com instruções completas em [`apps/api/README.md`](apps/api/README.md). Para desenvolver a API, em outro terminal:

```bash
cd apps/api
cp .env.example .env
# Escolha uma senha local forte em DB_PASSWORD no .env
npm install
docker compose up -d db
npm run dev
```

Os endpoints de verificação são `http://127.0.0.1:3333/health` (processo) e `http://127.0.0.1:3333/health/ready` (PostgreSQL). Na raiz do repositório, `npm run dev` continua iniciando somente o frontend.

### Criar as tabelas (etapa 7.2)

Após iniciar o Docker e atualizar a branch, em `apps/api` execute:

```bash
npm install
npm run db:status
npm run db:migrate
npm run db:status
```

Atualize o DBeaver e expanda `central_dev → Esquemas → public → Tabelas`. A migration cria as **tabelas vazias**, sem importar dados do navegador. Consulte o guia completo em [`apps/api/README.md`](apps/api/README.md).

### Login local da API (etapa 7.3)

Depois de `npm run db:migrate` e com PostgreSQL ativo, dentro de `apps/api` execute `npm run auth:create-owner`. A senha será solicitada sem aparecer na tela; não existe cadastro público. A API oferece login, verificação da própria sessão e logout, **mas o frontend Vue continua utilizando dados locais** e ainda não possui formulário integrado. Veja [`apps/api/README.md`](apps/api/README.md) para limites e comandos.

## Módulos

| Tela | Função |
| --- | --- |
| Visão geral | Indicadores de pipeline, projetos, saldo, andamento do plano e publicações; atalho para Hoje |
| Hoje | Lista de prioridades calculadas a partir de prazos de projetos, briefings incompletos, tarefas e oportunidades abertas |
| Plano de lançamento | 17 ações de 30 dias com semana, prioridade, horas e status editável |
| Serviços e preços | Biblioteca de modelos reutilizáveis, com simulação ilustrativa de piso e preço sugerido |
| Oportunidades | CRM, assistente, propostas com escopo e histórico de versões, retomada e conversão em projeto |
| Projetos | Lista e detalhes com oportunidade, serviço, briefing, tarefas, materiais/links, parcelas previstas, revisão/entrega e caixa vinculado |
| Financeiro | Entradas e saídas gerais ou associadas a um projeto |
| Publicações | 7 ideias para Instagram e WhatsApp; calendário, legenda e resultado |
| Briefing | 13 perguntas de atendimento com fases, justificativa e próximo passo; copiar perguntas |
| Tarefas | Checklist pessoal e tarefas associadas a projetos |
| Dados e backup | Exportação/importação JSON v7, migração v1/v2/v3/v4/v5/v6, restaurar modelos, dados fictícios |

Os modelos de plano, serviço, publicação e briefing **foram extraídos da planilha original**, sem incluir nomes/contatos de clientes reais. Números no simulador são somente exemplos, **não são pesquisa de mercado ou proposta comercial definitiva**.

## Aparência e desempenho

- O botão **Dark/Light** fica no cabeçalho e alterna as cores **sem recarregar** a página. A preferência explícita é armazenada separadamente como `central-web:theme`; quando não há escolha salva, a Central segue o tema claro/escuro do sistema.
- `src/theme-colors.css` contém as variações de todas as cores da interface; `src/style.css` utiliza os tokens correspondentes. Ao adicionar uma nova cor, crie os tokens claro/escuro para evitar elementos ilegíveis.
- As áreas da Central são carregadas sob demanda por `defineAsyncComponent`, mantendo o painel inicial e o modal global disponíveis sem precisar carregar o código de todas as telas.
- Alterações em campos ligados ao workspace usam uma gravação agrupada em aproximadamente **300 ms**; ações explícitas de salvar, importar ou excluir persistem imediatamente, e operações pendentes são gravadas quando a página é ocultada/fechada.
- A lógica da visão **Hoje** indexa as relações entre projetos, tarefas, parcelas, briefings e propostas uma vez por atualização, em vez de percorrer todas as coleções a cada projeto.
- Estas melhorias reduzem trabalho e carregamento inicial, mas **não substituem medições reais** de desempenho e testes visuais no seu dispositivo.

## Persistência / atualização do workspace

O schema atual é `central-web:workspace:v7`. Na primeira abertura, dados v1, v2, v3 ou v4 são migrados para a nova chave, mantendo os registros antigos. As chaves anteriores ficam preservadas. Backups JSON v1, v2, v3, v4, v5, v6 e v7 são aceitos; backups antigos vinculam uma oportunidade a um serviço somente quando o nome corresponde a um único item do catálogo.

Oportunidades guardam o ID do serviço e do projeto convertido. Projetos guardam o serviço e a oportunidade de origem; tarefas e lançamentos guardam o ID do projeto. Ao excluir uma entidade relacionada, os vínculos restantes são limpos e tarefas/lançamentos ficam preservados. A estimativa comercial, o preço combinado e o dinheiro recebido continuam separados.

Use backup JSON antes de apagar ou importar dados. A ação “Restaurar modelos” substitui o armazenamento por um conjunto limpo de templates e **apaga os registros**.

## Segurança

O frontend **não tem autenticação, criptografia em repouso nem sincronização**. A API tem autenticação local, mas ainda não expõe rotas de clientes e não oferece proteção de produção; não está pronta para receber dados reais de clientes. `localStorage` não protege registros de clientes. **Não armazene dados pessoais reais, números de telefone, respostas de briefing ou dados financeiros sensíveis, nem exponha esta versão como aplicação de produção.** Os arquivos de backup não são criptografados.

A futura versão para uso real precisa de autenticação, autorização na API para todas as entidades, migrations, backups e critérios de privacidade (LGPD).

## Organização

```
src/
  App.vue                    navegação
  lib/catalog.ts             modelos extraídos da planilha
  lib/types.ts               contratos do domínio
  lib/store.ts               armazenamento temporário com gravações agrupadas
  lib/theme.ts               modo claro/escuro e preferência do navegador
  lib/writeScheduler.ts      coalescência e salvamento imediato
  theme-colors.css           paletas light/dark completas
  lib/workspace.ts           schema v7, migração e validação de backups
  views/                     páginas da central
.github/workflows/ci.yml     verificação em pull request
```

Consulte `AGENTS.md`, `docs/PRODUTO.md`, `docs/ROADMAP.md`, `docs/ARQUITETURA.md` e `docs/PROMPTS-CLI.md`.

## Patch v0.2.1

- Removido import de tipo `Task` não utilizado em `src/lib/store.ts`, que causava erro TS6196 no `vue-tsc`.
- Documentação alinhada à decisão pelo TypeORM.
- O CI continua usando `npm install` até que `package-lock.json` seja gerado e versionado. Depois, substituir por `npm ci`.
- O build completo requer dependências instaladas e ainda deve ser executado localmente.

## Fluxo integrado

- Oportunidades podem ser relacionadas a um serviço do catálogo, editadas e convertidas em projeto com preço combinado confirmado separadamente.
- O botão **Novo atendimento** abre um assistente em quatro etapas: cliente, serviço, proposta e decisão. É possível salvar a oportunidade em qualquer momento, retomar pelo CRM ou criar o projeto com briefing específico e tarefas copiadas do modelo.
- Trabalhos contratados fora do CRM continuam podendo ser cadastrados diretamente na página Projetos.
- O assistente não registra pagamento automaticamente e impede conversões duplicadas.
- **Etapa 6:** na lista **Oportunidades**, o ícone de documento abre uma proposta com escopo, exclusões, prazo, rodadas de revisão, pagamento e preço. Marcar como enviada e registrar aceite são ações manuais, sem disparo de e-mail ou criação de projeto. A proposta aceita sugere o preço na conversão, mas não cria pagamentos. Versões enviadas são preservadas e ajustes criam uma nova versão.
- **Etapa 5:** a aba **Financeiro** do projeto permite cadastrar parcelas previstas com vencimento e associar pagamentos já registrados, inclusive parciais; uma previsão nunca aumenta o saldo realizado. A aba **Entrega** registra envio para revisão, aprovação e entrega final, com links em Materiais.
- **Hoje** agrupa tarefas de acompanhamento com uma ação por projeto, sem adicionar estados artificiais. Ao clicar, abre a aba relevante do projeto ou retoma um atendimento. Prazos urgentes usam apenas datas cadastradas; valores a receber não são classificados como pagamentos vencidos.
- O detalhe do projeto reúne serviço, oportunidade de origem, tarefas, recebimentos, despesas, materiais/ferramentas e saldo do projeto.
- Na aba **Materiais e ferramentas**, é possível cadastrar, editar, abrir e excluir links HTTP/HTTPS categorizados. A Central não hospeda arquivos nessa versão.
- O catálogo é uma biblioteca de modelos, com retorno ao atendimento/projeto de origem quando aberto por seus vínculos.
- A migração v4 → v5 inicializa os materiais vazios sem alterar os clientes, projetos ou briefings existentes.
- Testes de domínio e migração: `npm test`. Checagem de tipos: `npm run typecheck`. Build: `npm run build`.
