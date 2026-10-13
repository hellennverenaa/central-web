# Jornada de trabalho simplificada — proposta de UX

> Documento de produto. As etapas 1–4 do fluxo local já incluem menu agrupado, detalhes de projeto, assistente de atendimento, conversão com briefing/tarefas e visão Hoje derivada dos registros. Propostas comerciais versionadas, parcelas previstas e revisão/entrega já têm registros locais explícitos. Distribuição automatizada, assinaturas e API segura permanecem planejadas.

## Objetivo

A Central Web deve **diminuir trabalho administrativo**, não reproduzir várias planilhas ligadas por cliques. A usuária trabalha sozinha, tem pouco tempo e está construindo o negócio enquanto mantém outro emprego.

## Decisão: menu por áreas + entrada guiada

**Não** organizar dez telas soltas em uma sequência rígida. Isso obrigaria quem já conhece o sistema a percorrer etapas desnecessárias.

**Não** usar somente um wizard obrigatório. Alguns trabalhos já chegam fechados, enquanto outros passam por conversas e orçamentos.

**Usar os dois, com objetivos diferentes:**

- Navegação lateral para **consultar**, **encontrar** e **editar** informações, agrupada por áreas.
- Ação principal **Novo atendimento**, que abre um assistente guiado com cliente, serviço, proposta e decisão comercial, sem exigir contrato fechado.
- Atendimento guiado: informar cliente uma só vez; selecionar serviço (inclusive indefinido ou personalizado); consultar referência e escopo; registrar proposta; confirmar fechamento; preparar projeto, briefing e checklist automaticamente. Oportunidades existentes podem ser retomadas no assistente.
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

**Briefing** — modelo já instanciado para esse projeto; durante edição, uma seção por vez com perguntas condicionais. Após salvar, apresentar todas as respostas visíveis agrupadas por seção em **modo de consulta**, com botão explícito para editar. Ao reabrir um briefing já respondido, começar em consulta.

**Tarefas** — geradas automaticamente a partir do modelo; adicionar tarefas avulsas ou específicas; checklist e progresso sem duplicação.

**Financeiro** — registrar entradas ou saídas do projeto e parcelas com vencimentos combinados; distinguir **valor contratado**, **parcelas previstas**, **recebido** e **saldo de caixa**. Vincular pagamentos reais manualmente à parcela, permitindo recebimentos parciais sem criar novas entradas.

**Entrega** — aba para registrar datas reais de revisão, aprovação e entrega. Os links de publicação/entrega continuam vinculados via Materiais; confirmar a entrega muda o status do projeto.

## Automação planejada: máquina de estados por atendimento/projeto

1. **Novo contato:** capturar nome/contato, tipo de serviço e necessidade. Se ainda não souber preço, deixá-lo pendente.
2. **Proposta:** gerar rascunho a partir do serviço e da estimativa, revisar escopo, exclusões, rodadas, condições de pagamento e entrega; registrar o envio manual e preservar versões anteriores imutáveis. Registrar aceite não converte nem cria recebimento.
3. **Fechamento:** ação única e idempotente cria projeto associado à oportunidade; não registrar receita fictícia.
4. **Preparação:** criar **uma** instância do questionário e as tarefas do modelo; reutilizar todos os dados conhecidos sem perguntar novamente.
5. **Produção:** destacar a próxima tarefa não concluída ou o próximo campo relevante do briefing; não depender de navegar à tela global.
6. **Cobrança:** gerar cronograma de cobranças **previstas** se houver condições acordadas; só efetivar entrada após confirmação.
7. **Entrega:** verificar checklist, registrar aprovação e finalizar o projeto.

## Regras de produto

- Na lista de Oportunidades, a ação **Proposta** abre um documento de consulta ou um formulário de rascunho; depois de salvar, a proposta é visualizada como documento com opção de editar (rascunho) ou criar nova versão (após envio).
- O status de uma proposta é registrado manualmente. Enviar/clicar em Aceita não faz contato remoto, não gera contrato ou pagamento, não muda o preço de projeto existente.


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
2. [x] Implementar o **assistente de atendimento** (não somente o botão), com confirmação de transições e reaproveitamento dos dados.
3. [x] Criar **visão Hoje** com próximas ações derivadas de projetos, oportunidades, briefings, tarefas e prazo cadastrado, evitando status manual redundante.
   - Exibe no máximo uma ação principal por projeto; ações críticas de prazo têm prioridade.
   - Abre a aba correspondente no projeto, retoma a oportunidade ou leva às tarefas independentes.
   - Um saldo a receber **não tem vencimento inferido**, e nenhuma ação gera lançamentos financeiros automáticos.
4. [x] Adicionar etapas de cobrança prevista e revisão/entrega, sem lançar receita antes da confirmação. A visão Hoje só alerta vencimentos informados e não pressupõe inadimplência.
5. Migrar persistência para API segura e TypeORM/PostgreSQL **após** validar a jornada no frontend.
