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
npm test
npm run dev
npm run build
```

`npm run build` cria a pasta `dist/` quando a checagem de tipos e o Vite terminam sem erro. Para esta alteração, `npm test`, `npm run typecheck` e `npm run build` foram executados com sucesso no workspace. `npm install` não foi necessário porque as dependências já estavam presentes; o repositório ainda não tem lockfile e uma instalação limpa requer acesso ao registro.

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

## Persistência / atualização do workspace

O schema atual é `central-web:workspace:v7`. Na primeira abertura, dados v1, v2, v3 ou v4 são migrados para a nova chave, mantendo os registros antigos. As chaves anteriores ficam preservadas. Backups JSON v1, v2, v3, v4, v5, v6 e v7 são aceitos; backups antigos vinculam uma oportunidade a um serviço somente quando o nome corresponde a um único item do catálogo.

Oportunidades guardam o ID do serviço e do projeto convertido. Projetos guardam o serviço e a oportunidade de origem; tarefas e lançamentos guardam o ID do projeto. Ao excluir uma entidade relacionada, os vínculos restantes são limpos e tarefas/lançamentos ficam preservados. A estimativa comercial, o preço combinado e o dinheiro recebido continuam separados.

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
  lib/store.ts               armazenamento temporário e persistência reativa
  lib/workspace.ts           schema v3, migração e validação de backups
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
