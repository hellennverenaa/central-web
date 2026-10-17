# Decisão de arquitetura — 11/10/2026

## Escolha

- Frontend: Vue 3, TypeScript, Vite; hospedagem futura em Vercel.
- Backend: Node.js, Express, TypeScript, Zod; autenticação por sessão ou token em cookie HttpOnly (a definir), nunca confiar apenas no frontend.
- Database: PostgreSQL. Para desenvolvimento: Docker Compose em máquina local. Em produção: PostgreSQL gerenciado e API em plataforma de hospedagem, ou ambos numa VPS.
- ORM: TypeORM (decisão), com DataSource, entidades, repositories e migrations versionadas.
- DBeaver: cliente para administrar o PostgreSQL; **não é banco nem hospedagem**.
- Supabase: opcional; não é requisito da arquitetura.

## Diagrama

Browser Vue (Vercel) -> HTTPS -> Node/Express API (hospedagem) -> conexão privada/TLS -> PostgreSQL (hospedagem)
DBeaver do computador -> conexão TLS/rede autorizada -> PostgreSQL.

## Backend — etapa 7.1 (estrutura inicial)

- API Express/TypeScript em `apps/api`, independente do Vite; comandos em [`apps/api/README.md`](../apps/api/README.md).
- PostgreSQL local em Docker Compose (`apps/api/compose.yaml`), com volume persistente e porta vinculada a `127.0.0.1`.
- Credenciais em `apps/api/.env` (ignorado pelo Git). Exemplo em `apps/api/.env.example`.
- DataSource TypeORM configurado com `synchronize: false`, **sem entidades e migrations** até a etapa 7.2.
- `GET /health` confirma que o processo está ativo; `GET /health/ready` verifica a conexão com o PostgreSQL.
- Nenhuma rota de cliente, proposta ou financeiro foi exposta. Sem autenticação, **não disponibilize esta API publicamente**. CORS não é autenticação.
- O frontend segue usando workspace local v7. A migração de dados e a conexão à API serão tratadas depois da segurança.

## Limites do protótipo v0.2

- Dados e modelos persistidos apenas em `localStorage`; a API desta etapa não armazena registros de domínio.
- Não usar informações pessoais de clientes reais ou movimentações financeiras sensíveis.
- Catálogo contém **simulações ilustrativas**, não preços de mercado.
- Schema local v7. Backups v1 até v7 são aceitos, com migração que preserva registros compatíveis e templates.
- IDs conectam oportunidade a serviço/projeto, projeto a serviço/oportunidade de origem e tarefas/transações ao projeto.
- Ao restaurar modelos, dados locais são apagados; antes faça backup.

## Migração para a aplicação real

1. Monorepo `apps/web`, `apps/api`, `packages/shared` (se necessário); não reorganizar sem testes.
2. Docker Compose local: PostgreSQL com volume persistente, rede interna e `.env.example` (nenhum segredo no Git).
3. API com validação Zod, auth, autorização por titular em todas as rotas e testes de acesso negado.
4. TypeORM migrations e seeds de **templates sem dados de clientes**; índices, integridade referencial e controle de versões.
5. Adaptar o `store.ts` para composables/repositories assíncronos, estados de loading, erros e tratamento de concorrência.
6. Backup/restore testados e documentação LGPD para dados de clientes.
7. Decidir hospedagem quando estiver pronta para uso real. Não expor a porta 5432 publicamente sem controles adequados; preferir conexões privadas.

## Build no GitHub Actions

O CI verifica frontend e API em jobs separados. O frontend instala dependências via `npm ci`; inicialmente, a API usa `npm install` até que seu lockfile seja gerado e versionado em ambiente com registro npm. Os testes da etapa 7.1 não exigem conexão a banco real.

## Padrões do TypeORM definidos

- `synchronize: false` em produção. Alterações de schema devem passar por migrations versionadas.
- PostgreSQL local em Docker Compose, acesso via DBeaver usando as credenciais do ambiente local.
- Secrets ficam em variáveis de ambiente; não devem ser enviados ao GitHub.
- Banco de testes da CI será temporário, não conectado ao banco de produção.
