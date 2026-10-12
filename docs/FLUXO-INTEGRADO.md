# Fluxo integrado do frontend — escopo de implementação

> **Status:** planejamento técnico. Este documento **não** implementa as funcionalidades.
> **Branch:** `feature/fluxo-integrado-frontend`.

## Problema observado na v0.2.1

Leads, projetos, tarefas e lançamentos são listas isoladas. `Project.client` e
`Lead.name` são textos livres; `Task` e `Transaction` não possuem identificador
de projeto. Assim, criar uma oportunidade não gera uma sequência rastreável
de atendimento, produção e recebimento.

## Jornada principal (critérios de aceite)

1. Cadastrar **oportunidade** com serviço vinculado opcionalmente ao catálogo.
2. **Converter oportunidade em projeto** uma única vez, reaproveitando o vínculo,
   mantendo histórico e sem criar receita automaticamente.
3. Abrir **detalhes do projeto**, editar informações, mudar status e consultar
   atividades relacionadas.
4. Criar **tarefas vinculadas ao projeto** (ou tarefas independentes); concluí-las
   na tela do projeto ou em **Minha rotina**, mantendo o mesmo estado.
5. Registrar **entradas e despesas vinculadas ao projeto** (ou avulsas);
   consultar recebimentos, despesas e saldo a receber.
6. Dashboard usa **os mesmos dados de origem**, sem contagens divergentes.
7. Recarregar a página, exportar e importar backup sem perder os vínculos.

## Evolução de domínio (IDs, não nomes)

- `Lead.serviceId?: string`: referência opcional a `Service.id`.
- `Project.leadId?: string`: origem no funil.
- `Project.serviceId?: string`: serviço contratado, se houver.
- `Task.projectId?: string`: associação opcional de atividade com projeto.
- `Transaction.projectId?: string`: associação opcional de lançamento com projeto.
- Respostas de briefing devem ser **por projeto**; as perguntas globais
  permanecem modelos reutilizáveis.
- Publicações e ações do plano podem originar tarefas sem duplicar registros
  involuntariamente.

## Regras de negócio e integridade

- Valor **estimado do lead**, **valor contratado** e **recebimentos** são coisas
  diferentes. Somente lançamentos financeiros do tipo entrada compõem receita.
- Não permitir conversões duplicadas, vínculos com IDs inexistentes ou exclusões
  que deixem referências órfãs. Toda exclusão com dependências deve ter
  tratamento explícito e confirmação.
- Formulários de criação e edição precisam de **Salvar / Cancelar**, feedback,
  validação e indicação clara de persistência local.
- Permitir tarefas e transações gerais sem projeto.
- Garantir migração dos backups/localStorage v1/v2 ao novo esquema, preservando
  os registros já existentes e os modelos de catálogo, plano e publicações.
- Em erro de importação, não substituir o workspace existente.
- Identificar falhas de gravação no navegador em vez de descartá-las silenciosamente.

## Qualidade e limites

- Manter Vue 3 + TypeScript e a arquitetura existente nesta etapa.
- Não adicionar banco/API agora; backend futuro será Express + TypeORM +
  PostgreSQL, conforme decisão do projeto.
- `npm ci`, `npm run typecheck`, `npm run test:pricing`, novos testes de
  relações/migração e `npm run build` devem passar.
- Testar manualmente a jornada oportunidade → projeto → tarefa/recebimento →
  dashboard → reload → backup/restauração.
- Versão local não é adequada a dados pessoais reais: sem autenticação,
  autorização e armazenamento seguro ainda.
