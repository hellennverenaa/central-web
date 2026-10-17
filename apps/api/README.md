# Central Web · API — etapas 7.1 e 7.2

Backend **local e isolado** do frontend. A etapa 7.2 acrescenta tabelas do domínio e migrations, mas **ainda não há login, CRUD, endpoints de clientes ou integração com o `localStorage`**. Não hospede esta API publicamente nem insira informações reais ou dados pessoais de clientes.

## Requisitos

- Node.js 22+ e npm.
- Docker Desktop/Engine com Docker Compose, para o PostgreSQL local.

## Primeira instalação

No diretório do repositório:

```bash
cd apps/api
cp .env.example .env
```

No Windows PowerShell, use `Copy-Item .env.example .env` no lugar de `cp`.
**Troque `DB_PASSWORD` no arquivo `.env`** por uma senha local forte. Não envie esse
arquivo ao GitHub (ele é ignorado pelo Git). A mesma configuração é utilizada pelo Docker
Compose e pela API.

```bash
npm install
docker compose up -d db
npm run dev
```

O frontend **continua separado**: em outro terminal, a partir da raiz,
`npm ci && npm run dev`. A API não altera suas oportunidades ou projetos atuais.

## Etapa 7.2 — criar tabelas no banco local

Antes de alterar o schema, confirme que o Docker está iniciado e que existe uma cópia do banco se você já tiver colocado informações de teste nele. **Não execute `docker compose down -v`**; isso apaga o volume.

```bash
# Dentro de apps/api, com o .env local configurado:
npm install
sudo docker compose up -d db
npm run db:status
npm run db:migrate
npm run db:status
```

- **`db:migrate`** aplica somente migrations pendentes e é seguro repetir: o TypeORM registra cada versão na tabela `schema_migrations`. Não cria cadastros nem dados fictícios.
- **`db:status`** indica se há migrations pendentes.
- **`db:revert:test`** é deliberadamente bloqueado no banco `central_dev`: reversão apagaria tabelas e dados. Só pode ser executado em banco exclusivo `*_test` com `CONFIRM_TEST_RESET=YES`.
- A API `npm run dev` continua expondo apenas `/health` e `/health/ready`. **Nenhuma tabela é criada automaticamente ao iniciar o servidor** (`synchronize: false`).
- No DBeaver, abra `central_dev → Esquemas → public → Tabelas`, atualize a árvore de navegação (F5) e veja as tabelas. A tabela `schema_migrations` registra a versão.
- As tabelas permanecem **vazias**. O usuário de login e os dados do frontend só serão tratados nas etapas 7.3/7.4.

### Modelo e integridade

A migration `1792200000000-InitialDomainSchema.ts` cria **17 tabelas de domínio**, mais `schema_migrations` gerenciada pelo TypeORM:

- Titularidade e catálogo: `users`, `clients`, `services`, `briefing_templates`.
- Comercial: `leads`, `proposals`, `proposal_revisions`.
- Execução: `projects`, `project_briefings`, `tasks`, `project_materials`, `project_deliveries`.
- Financeiro: `transactions`, `project_installments`, `installment_receipts`.
- Organização: `plan_items`, `publications`.

Os dados numéricos de dinheiro são `NUMERIC(14,2)`; dinheiro previsto em parcelas **não é** dinheiro recebido. A tabela `installment_receipts` só aceita transações de entrada do **mesmo projeto e titular**, e uma transação pode se vincular a somente uma parcela.

Os IDs de domínio são `TEXT` para aceitar tanto novos UUIDs como identificadores legados do catálogo local. Todas as tabelas de negócio exigem `owner_id` (UUID) e as referências usam chaves compostas por titular para prevenir vínculos entre usuários diferentes. Campos de briefing são `JSONB`, mantendo a cópia de perguntas/respostas existente no frontend; os modelos independem dos briefings criados nos projetos.

### Testar com PostgreSQL real (somente banco descartável!)

O GitHub Actions já usa um PostgreSQL **temporário** para aplicar/reverter a migration e verificar os relacionamentos. Para repetir localmente, **crie outro banco chamado `central_test`** e use variáveis `NODE_ENV=test`, `DB_NAME=central_test`, `TEST_DATABASE=1` e suas credenciais locais de teste. **Nunca rode `test:db` no banco `central_dev`.**

## Verificações

- `http://127.0.0.1:3333/health` — `200 {"status":"ok"}` indica processo HTTP ativo.
- `http://127.0.0.1:3333/health/ready` — `200 {"status":"ready"}` indica que a
  API conseguiu consultar o PostgreSQL. Sem banco, responde **503** (não confundir
  com erro do frontend).
- `npm run typecheck` — checagem estrita de TypeScript.
- `npm test` — testes de configuração, saúde e infraestrutura **sem banco real**.
- `npm run build && npm start` — compilação e execução JavaScript.

Para parar o banco, use `docker compose down`. Não adicione `-v`, a menos que
queira **apagar o volume com os dados locais** do PostgreSQL. A porta do banco é
vinculada a `127.0.0.1:5433`, não à rede inteira.

## Próximas subetapas

**7.2:** schema e migrations iniciais implementadas, pendente execução/validação no PostgreSQL local via DBeaver;
**7.3:** autenticação, sessões/cookies HttpOnly, autorização por titular, rate limiting
e testes de acesso proibido; **7.4:** migração controlada do frontend para a API.

A configuração do TypeORM usa `synchronize: false` para impedir criação/destruição automática de tabelas. Apenas `npm run db:migrate` aplica mudanças de esquema. Nunca coloque credenciais no código nem exponha portas sem os
controles necessários.

> Dependências da API terão lockfile versionado antes de operações reais. Esta
> primeira estrutura usa instalação `npm install` separada do frontend.
