# Central Web · API — etapa 7.1

Backend **local e isolado** do frontend. Ainda não há endpoints de clientes, login, CRUD, tabelas,
migrations nem integração com o `localStorage`. Não hospede esta API publicamente nem
coloque dados pessoais ou financeiros reais nela.

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

**7.2:** entidades do domínio e migrations versionadas (ainda sem dados de clientes);
**7.3:** autenticação, sessões/cookies HttpOnly, autorização por titular, rate limiting
e testes de acesso proibido; **7.4:** migração controlada do frontend para a API.

A configuração do TypeORM usa `synchronize: false` para evitar criação/destruição
automática de tabelas. Nunca coloque credenciais no código nem exponha portas sem os
controles necessários.

> Dependências da API terão lockfile versionado antes de operações reais. Esta
> primeira estrutura usa instalação `npm install` separada do frontend.
