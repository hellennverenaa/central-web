# Central Web · API — etapas 7.1, 7.2 e 7.3

Backend **local e isolado** do frontend. A etapa 7.2 acrescenta tabelas do domínio e migrations; a etapa 7.3 acrescenta login e sessões locais. **Ainda não há CRUD de clientes nem integração com o `localStorage`.** Não hospede esta API publicamente nem insira informações reais ou dados pessoais de clientes.

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

A primeira migration `1792200000000-InitialDomainSchema.ts` cria **17 tabelas de domínio**, mais `schema_migrations` gerenciada pelo TypeORM; a migration posterior organiza `users` dentro de `auth`:

- Titularidade e catálogo: `auth.users`, `clients`, `services`, `briefing_templates`.
- Comercial: `leads`, `proposals`, `proposal_revisions`.
- Execução: `projects`, `project_briefings`, `tasks`, `project_materials`, `project_deliveries`.
- Financeiro: `transactions`, `project_installments`, `installment_receipts`.
- Organização: `plan_items`, `publications`.

Os dados numéricos de dinheiro são `NUMERIC(14,2)`; dinheiro previsto em parcelas **não é** dinheiro recebido. A tabela `installment_receipts` só aceita transações de entrada do **mesmo projeto e titular**, e uma transação pode se vincular a somente uma parcela.

Os IDs de domínio são `TEXT` para aceitar tanto novos UUIDs como identificadores legados do catálogo local. Todas as tabelas de negócio exigem `owner_id` (UUID) e as referências usam chaves compostas por titular para prevenir vínculos entre usuários diferentes. Campos de briefing são `JSONB`, mantendo a cópia de perguntas/respostas existente no frontend; os modelos independem dos briefings criados nos projetos.

### Testar com PostgreSQL real (somente banco descartável!)

O GitHub Actions já usa um PostgreSQL **temporário** para aplicar/reverter a migration e verificar os relacionamentos. Para repetir localmente, **crie outro banco chamado `central_test`** e use variáveis `NODE_ENV=test`, `DB_NAME=central_test`, `TEST_DATABASE=1` e suas credenciais locais de teste. **Nunca rode `test:db` no banco `central_dev`.**

## Organização por schemas do PostgreSQL

O banco continua sendo **central_dev**. O schema `public` é o padrão do PostgreSQL;
ele não indica acesso público pela rede. A autenticação agora fica em um schema
dedicado: **`auth.users`** (e-mail e hash de senha com scrypt e sal)
e **`auth.auth_sessions`** (hash SHA-256 do token de sessão, titular e validade).
Os outros dados continuam no `public` (`projects`, `transactions`, `leads`, etc.).

A migration incremental `1792200002000-SeparateAuthSchema` **move** as duas tabelas
existentes, sem recriar nem apagar usuários, sessões, índices e referências.
As duas migrations originais permanecem intactas para bancos criados anteriormente.
`public.schema_migrations` continua registrando o histórico do TypeORM.

Para aplicar **após atualizar a branch**:

```bash
cd apps/api
npm run db:status
npm run db:migrate
npm run db:status
```

Antes de qualquer migration, faça backup se já inseriu dados de teste. Não execute
`docker compose down -v` nem mova as tabelas manualmente no DBeaver. Depois de
aplicar a migration, atualize o DBeaver: `central_dev → Schemas → auth → Tables`
exibe as tabelas de login; `central_dev → Schemas → public → Tables` mantém os
dados comerciais. A mudança de schema **é organização**, não substitui isolamento
por permissões, autenticação e autorização.

**Serviço de login para outras aplicações:** o módulo `auth` é exclusivo da
administração Central Web. Se no futuro sites de clientes exigirem contas, criar
um provedor de identidade **separado** (possivelmente OIDC/OAuth 2.0), com usuários,
aplicações, ambientes e permissões isolados — não reutilizar esta API administrativa
como autenticação de clientes.

## Revisão de segurança da API local

Leia [`docs/REVISAO-AUTENTICACAO.md`](../../../docs/REVISAO-AUTENTICACAO.md)
antes de conectar a tela de login à aplicação.

A API agora exige o cabeçalho `Origin` aprovado em toda operação mutável,
limita tentativas de login por IP e conta e só retorna `ready` quando o
PostgreSQL estiver acessível **e não houver migrations pendentes**. Assim,
`/health` pode retornar `ok` com `/health/ready` em 503; nesse caso,
verifique `npm run db:status` e execute `npm run db:migrate` se necessário.

A implementação de login continua **exclusivamente local**, não é certificada
para produção. O parecer recomenda estudar uma biblioteca mantida, separar o
usuário de runtime do banco e implementar autorização por titular nas rotas
antes de permitir dados reais.

## Etapa 7.3 — login e sessões locais

Execute `npm run db:migrate` antes de cadastrar o titular. A migration de sessões adiciona a tabela `auth_sessions` e a migration seguinte a move para `auth.auth_sessions`; nenhuma delas cria usuários automaticamente.

```bash
# Dentro de apps/api, com .env configurado e PostgreSQL iniciado
npm run db:migrate
npm run db:status
npm run auth:create-owner
```

O cadastro pergunta e-mail e senha **diretamente no terminal**. A senha não aparece, não é passada por argumento e não deve ser compartilhada por prints ou logs. Use pelo menos **12 caracteres**. Só é permitido criar o **primeiro titular** por esse comando; cadastro público está desabilitado.

Reinicie o servidor: `npm run dev`.

| Endpoint | Método | Comportamento |
| --- | --- | --- |
| `/health` | GET | Disponibilidade HTTP sem login |
| `/health/ready` | GET | Conexão com PostgreSQL |
| `/auth/login` | POST | JSON com e-mail e senha; cabeçalho `Origin` deve coincidir com `WEB_ORIGIN` |
| `/auth/me` | GET | Devolve somente ID/e-mail quando a sessão é válida; sem cookie responde `401` |
| `/auth/logout` | POST | Revoga a sessão no banco e remove o cookie; valida `Origin` |

- Senhas: scrypt assíncrono com sal aleatório; senha em claro não vai para o banco.
- Sessões: token opaco e aleatório; **somente o hash SHA-256** fica no PostgreSQL. Cookie HttpOnly, SameSite=Strict, Path=/, expira em 7 dias.
- Restrições: CORS com credenciais só para `WEB_ORIGIN`, exigência de Origin para POST e limite simples por IP em memória para login.
- **Ambiente local apenas.** Rate limiting em memória e HTTP local não substituem TLS, controles distribuídos, auditoria e autorização por titular nas futuras rotas de projetos e clientes.
- **Frontend continua sem login:** a tela Vue ainda usa dados locais. A etapa 7.4 vai integrar API/frontend com proxy da mesma origem para não conflitar os cookies Strict entre `localhost` e `127.0.0.1`.
- `GET /auth/me` sem cookie deve devolver `401`; isso é um bloqueio esperado. A suíte de integração usa banco temporário e contas fictícias para verificar login, expiração e logout.

**Não coloque senhas em comandos `curl` com argumentos visíveis ou que fiquem gravados no histórico do terminal.**

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
**7.3:** autenticação e sessões locais prontas no código; autorização por titular de endpoints de domínio e endurecimento para produção continuam pendentes; **7.4:** conexão protegida do frontend e migração controlada dos registros.

A configuração do TypeORM usa `synchronize: false` para impedir criação/destruição automática de tabelas. Apenas `npm run db:migrate` aplica mudanças de esquema. Nunca coloque credenciais no código nem exponha portas sem os
controles necessários.

> Dependências da API terão lockfile versionado antes de operações reais. Esta
> primeira estrutura usa instalação `npm install` separada do frontend.
