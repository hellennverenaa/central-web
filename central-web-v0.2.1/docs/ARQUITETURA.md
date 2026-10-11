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

## Limites do protótipo v0.2

- Dados e modelos persistidos apenas em `localStorage`, sem backend.
- Não usar informações pessoais de clientes reais ou movimentações financeiras sensíveis.
- Catálogo contém **simulações ilustrativas**, não preços de mercado.
- O `Backup` v2 exporta todos os módulos; importação aceita backup v1 válido preservando modelos da v0.2.
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

Workflow `.github/workflows/ci.yml` roda checagem de tipos + build em push/PR. Assim que gerar o `package-lock.json` em ambiente online, versioná-lo e substituir `npm install` por `npm ci` no workflow, para builds reproduzíveis.

## Padrões do TypeORM definidos

- `synchronize: false` em produção. Alterações de schema devem passar por migrations versionadas.
- PostgreSQL local em Docker Compose, acesso via DBeaver usando as credenciais do ambiente local.
- Secrets ficam em variáveis de ambiente; não devem ser enviados ao GitHub.
- Banco de testes da CI será temporário, não conectado ao banco de produção.
