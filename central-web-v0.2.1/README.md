# Central Web — Protótipo v0.2.1

Aplicação local e individual para organizar o lançamento de um pequeno estúdio de criação digital. O projeto é **separado** do portfólio profissional.

## Stack atual

- Vue 3 + TypeScript + Vite
- CSS responsivo temporário e `lucide-vue-next`
- Vue reativo + `localStorage` para demonstrar fluxos sem backend

**Arquitetura planejada:** Vue + Node.js/Express + TypeORM + PostgreSQL, com Docker Compose durante desenvolvimento. Supabase **não é obrigatório**. Veja [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md).

## Iniciar no computador

```bash
npm install
npm run typecheck
npm run test:pricing
npm run dev
npm run build
```

`npm run build` cria a pasta `dist/` quando a checagem de tipos e o Vite terminam sem erro. **Este arquivo não prova que o build foi realizado.** Não conseguimos completar `npm install` no ambiente de geração; rode os comandos localmente e use a CI em `.github/workflows/ci.yml`.

## Módulos

| Tela | Função |
| --- | --- |
| Visão geral | Indicadores de pipeline, projetos, saldo, andamento do plano e publicações |
| Plano de lançamento | 17 ações de 30 dias com semana, prioridade, horas e status editável |
| Serviços e preços | 7 serviços exemplificativos; simulação dinâmica de piso e arredondamento |
| Oportunidades | CRM básico para leads |
| Projetos | Status, clientes e prazos |
| Financeiro | Entradas, saídas e saldo histórico |
| Publicações | 7 ideias para Instagram e WhatsApp; calendário, legenda e resultado |
| Briefing | 13 perguntas de atendimento com fases, justificativa e próximo passo; copiar perguntas |
| Minha rotina | Checklist pessoal editável |
| Dados e backup | Exportação/importação JSON v2, restaurar modelos, dados fictícios |

Os modelos de plano, serviço, publicação e briefing **foram extraídos da planilha original**, sem incluir nomes/contatos de clientes reais. Números no simulador são somente exemplos, **não são pesquisa de mercado ou proposta comercial definitiva**.

## Persistência / atualização da v0.1

O schema de armazenamento agora é `central-web:workspace:v2`. Se houver dados da v0.1 no mesmo navegador/origem e ainda não existir v2, o app tenta migrá-los, preservando as tabelas antigas e acrescentando os novos modelos. A importação de JSON v1 válido também é aceita e acrescenta esses modelos.

Use backup JSON antes de apagar ou importar dados. A ação “Restaurar modelos” substitui o armazenamento por um conjunto limpo de templates e **apaga os registros**.

## Segurança

Este projeto **não tem autenticação, criptografia em repouso, backend ou sincronização**. `localStorage` não protege registros de clientes. **Não armazene dados pessoais reais, números de telefone, respostas de briefing ou dados financeiros sensíveis, nem exponha esta versão como aplicação de produção.** Os arquivos de backup não são criptografados.

A futura versão para uso real precisa de autenticação, autorização na API para todas as entidades, migrations, backups e critérios de privacidade (LGPD).

## Organização

```
src/
  App.vue                    navegação
  lib/catalog.ts             modelos extraídos da planilha
  lib/types.ts               contratos do domínio
  lib/store.ts               armazenamento temporário e migração v1 -> v2
  views/                     10 páginas da central
.github/workflows/ci.yml     verificação em pull request
```

Consulte `AGENTS.md`, `docs/PRODUTO.md`, `docs/ROADMAP.md`, `docs/ARQUITETURA.md` e `docs/PROMPTS-CLI.md`.

## Patch v0.2.1

- Removido import de tipo `Task` não utilizado em `src/lib/store.ts`, que causava erro TS6196 no `vue-tsc`.
- Documentação alinhada à decisão pelo TypeORM.
- O CI continua usando `npm install` até que `package-lock.json` seja gerado e versionado. Depois, substituir por `npm ci`.
- O build completo requer dependências instaladas e ainda deve ser executado localmente.
