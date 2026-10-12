# Jornada de trabalho simplificada — proposta de UX

> Documento de produto. A implementação inicial desta branch cobre **menu agrupado**, botão de novo atendimento e **abas de projetos**. As automações mais profundas descritas abaixo são planejamento para sprints seguintes.

## Objetivo

A Central Web deve **diminuir trabalho administrativo**, não reproduzir várias planilhas ligadas por cliques. A usuária trabalha sozinha, tem pouco tempo e está construindo o negócio enquanto mantém outro emprego.

## Decisão: menu por áreas + entrada guiada

**Não** organizar dez telas soltas em uma sequência rígida. Isso obrigaria quem já conhece o sistema a percorrer etapas desnecessárias.

**Não** usar somente um wizard obrigatório. Alguns trabalhos já chegam fechados, enquanto outros passam por conversas e orçamentos.

**Usar os dois, com objetivos diferentes:**

- Navegação lateral para **consultar**, **encontrar** e **editar** informações, agrupada por áreas.
- Ação principal **Novo atendimento**, que inicia o cadastro de uma oportunidade. Na versão atual, ela abre diretamente o formulário existente; não é ainda um assistente completo.
- Futuro atendimento guiado: informar cliente uma só vez; selecionar serviço; ver referência e escopo; registrar proposta; confirmar fechamento; preparar projeto, briefing e checklist automaticamente.
- Oferecer também **Novo projeto direto** para contratos fechados fora do CRM.
- Ao entrar no projeto, mostrar **Resumo e próxima ação**, com seções independentes de Briefing, Tarefas e Financeiro.

## Mapa de navegação

| Grupo | Telas atuais | Direção futura |
| --- | --- | --- |
| Acompanhar | Visão geral, Plano de lançamento | Dashboard com próximos passos mais relevantes, plano durante lançamento |
| Atender e produzir | Oportunidades, Projetos, Tarefas | Cadastro guiado, pipeline, lista global de tarefas e detalhe contextual |
| Organizar negócio | Financeiro, Publicações | Recebimentos/despesas, divulgação e acompanhamento |
| Modelos e dados | Serviços e preços, Briefing, Backup | Administração **ocasional** de templates, não necessária a cada novo cliente |

Os modelos de serviço e de questionário só devem ser alterados quando o produto ofertado mudar. Não são etapas obrigatórias para cada venda.

## Organização do detalhe do projeto

**Resumo** — cliente, status, prazo, preço acordado, recebido, despesas, *a receber* e **próxima ação sugerida**.

**Briefing** — modelo já instanciado para esse projeto; uma seção por vez; perguntas condicionais; respostas salvas por projeto.

**Tarefas** — geradas automaticamente a partir do modelo; adicionar tarefas avulsas ou específicas; checklist e progresso sem duplicação.

**Financeiro** — registrar entradas ou saídas do projeto; distinguir **valor contratado**, **previsto a receber**, **recebido** e **saldo de caixa**.

**Entrega** — futura etapa para aprovações, revisões e links de publicação.

## Automação planejada: máquina de estados por atendimento/projeto

1. **Novo contato:** capturar nome/contato, tipo de serviço e necessidade. Se ainda não souber preço, deixá-lo pendente.
2. **Proposta:** estimar valores a partir do serviço e do briefing inicial; usuária aprova valor final e escopo.
3. **Fechamento:** ação única e idempotente cria projeto associado à oportunidade; não registrar receita fictícia.
4. **Preparação:** criar **uma** instância do questionário e as tarefas do modelo; reutilizar todos os dados conhecidos sem perguntar novamente.
5. **Produção:** destacar a próxima tarefa não concluída ou o próximo campo relevante do briefing; não depender de navegar à tela global.
6. **Cobrança:** gerar cronograma de cobranças **previstas** se houver condições acordadas; só efetivar entrada após confirmação.
7. **Entrega:** verificar checklist, registrar aprovação e finalizar o projeto.

## Regras de produto

- **Automatizar vínculo por IDs**, não por nomes.
- **Nunca inventar dados ou cobranças.** O sistema pode sugerir, mas valores, prazos e recebimentos precisam de confirmação explícita.
- **Não gerar tarefas em duplicidade** se um projeto for editado ou o atendimento for retomado.
- **Dados digitados uma vez:** preencher campos a partir do cadastro e permitir correções sem replicação manual.
- **Salvar com clareza:** confirmar sucesso e avisar quando persistência falhar.
- **Não exigir briefings completos para salvar rascunhos.**
- **Deixar tarefas avulsas disponíveis.**
- **Não usar dados pessoais reais no protótipo em localStorage.** O backend Express + TypeORM + PostgreSQL e controle de acesso são necessários para operação segura.

## Critérios de aceite para a etapa visual

1. A ação **Novo atendimento** deve abrir o formulário de oportunidade em um clique, também na navegação mobile.
2. O menu precisa ser compreensível sem leitura de documentação.
3. Ao abrir o projeto, a aba padrão deve ser **Resumo**, e briefings longos não devem esconder tarefas e financeiro.
4. A seção do briefing deve apresentar um grupo de perguntas por vez.
5. Caixas de seleção de múltipla escolha devem ter dimensões normais, rótulos alinhados e uma área clicável acessível.
6. Valores a receber devem ficar separados do saldo realizado.
7. Projetos e questionários existentes devem continuar íntegros.
8. A CI deve executar `npm test`, `npm run typecheck` e `npm run build`. QA visual manual em Firefox e mobile segue obrigatório.

## Próximos incrementos

1. Corrigir os problemas apontados no PR original: `ganho` sem conversão, condições encadeadas do briefing e testes de UI.
2. Implementar o **assistente de atendimento** (não somente o botão), com confirmação de transições.
3. Criar **visão Hoje** com próximas ações derivadas de projetos, evitando status manual redundante.
4. Adicionar etapas de cobrança prevista e revisão/entrega, sem lançar receita antes da confirmação.
5. Migrar persistência para API segura e TypeORM/PostgreSQL **após** validar a jornada no frontend.
