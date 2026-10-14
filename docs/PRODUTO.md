# Produto — Central Web v0.2

Central particular para lançar e operar um microestúdio de convites digitais, sites para eventos e páginas de pequenos negócios.

## Jornada central

1. Consultar **Plano de lançamento** e atualizar ações (17 modelos da planilha original).
2. Consultar **Serviços e preços**, calcular referência de horas/custos e definir escopo (7 modelos).
3. Preparar **Publicações** e acompanhar status/resultado (7 modelos).
4. Copiar perguntas em **Briefing** para conversas de atendimento (13 modelos).
5. Usar **Novo atendimento** para registrar cliente, escolher serviço ou deixar indefinido, revisar estimativa e salvar oportunidade. Na lista de Oportunidades, preparar **Proposta** com escopo, exclusões, valor, revisões incluídas, condições de pagamento e entrega. Registrar envio e aceite separadamente e converter o atendimento depois, se fechar.
6. No detalhe de cada **Projeto**, acompanhar briefing, tarefas, materiais, cobranças previstas, recebimentos reais, revisão/aprovação e entrega.
7. Usar **Tarefas** para ações pessoais ou vinculadas; acompanhar os totais no **Financeiro**.
8. Consultar **Hoje** para ver próximos passos calculados automaticamente (prazos, briefings incompletos, tarefas e oportunidades abertas), além dos indicadores na **Visão geral** e **Dados & backup**.

## Experiência de uso

- **Aparência:** alternador Dark/Light no cabeçalho em qualquer módulo, incluindo propostas, materiais, briefings e modais. A preferência visual é salva separadamente dos dados de projetos; a ausência de preferência segue o sistema operacional.
- **Fluidez:** telas não abertas são carregadas sob demanda; edições repetidas são agrupadas antes de persistir, enquanto ações de cadastro e fechamento permanecem imediatas.

## Regras de negócio

- Oportunidade estimada não é faturamento nem dinheiro recebido.
- Valor de projeto não é automaticamente entrada no caixa.
- **Confirmações:** ações que exigem confirmação usam um diálogo visual da Central, com título, explicação e opção segura de Cancelar; as ações destrutivas são destacadas. O botão Cancelar/Esc/fechar não executa a operação, e nenhuma ação é confirmada automaticamente.
- **Propostas:** cada oportunidade pode ter uma proposta com versões. Um rascunho é editável; uma versão marcada como enviada fica congelada e ajustes geram nova versão. O usuário registra manualmente envio, aceite ou recusa; **a Central não envia mensagens nem coleta assinatura**.
- Aceite comercial não cria projeto ou cobrança: preço da versão aceita é sugerido (mas pode ser revisto) na conversão guiada ou rápida.
- Os valores propostos são cópias do modelo e da oportunidade no momento do rascunho; editar modelos depois não modifica propostas antigas. Histórico permanece consultável ao converter a oportunidade.
- A visão **Hoje** não cria registros: exibe apenas uma prioridade por projeto e as oportunidades/tarefas avulsas que exigem acompanhamento.
- Prazos vencidos/para hoje/próximos 7 dias usam **somente** as datas cadastradas dos projetos. Tarefas sem prazo não recebem data inventada.
- Valor contratado ainda não recebido é diferente de pagamento vencido. Só parcelas explicitamente cadastradas com vencimento combinado geram alertas de vencimento na visão Hoje.
- **Cobranças previstas:** registros de parcelas planejadas não criam receita. É possível associar manualmente um ou vários recebimentos reais a cada parcela (inclusive pagamentos parciais), sem contar uma entrada duas vezes.
- **Revisão e entrega:** datas reais de envio para revisão, aprovação do cliente e entrega final são registradas manualmente na aba Entrega. Confirmar data de entrega coloca o projeto como Entregue; sem preencher uma data, nada é inventado.
- Um projeto excluído também exclui seus registros previstos e marcos de entrega, mas mantém transações reais desvinculadas. Quando um recebimento é excluído ou desvinculado do projeto, seu vínculo com a parcela é removido.
- Projetos convertidos preservam os IDs da oportunidade e do serviço; tarefas e lançamentos podem apontar para o projeto.
- **Briefing:** ao salvar, a área mostra uma consulta de todas as respostas por seção, sem campos de formulário. Para alterar algo, use **Editar respostas** (ou **Continuar preenchimento** se houver perguntas obrigatórias pendentes). Após confirmar o salvamento, a consulta volta a aparecer. O estado é derivado das respostas persistidas; não há mudança de schema.
- O assistente permite salvar o atendimento em qualquer etapa após informar o cliente; oportunidades retomadas são editadas, não duplicadas.
- A etapa **ganho** é consequência da conversão em projeto: não se marca uma oportunidade como ganha sem criar o projeto.
- Ao criar o projeto pelo assistente, é possível selecionar outro modelo de briefing somente para aquele projeto; o catálogo e os projetos existentes não são modificados.
- Converter gera um briefing e as tarefas iniciais uma vez só, sem lançar recebimento.
- **Serviços e preços** é a biblioteca de modelos, não a página de um projeto; projetos existentes não herdam automaticamente alterações posteriores do modelo.
- **Materiais e ferramentas** guarda links por projeto, com nome, categoria e notas. Links só podem usar HTTP/HTTPS; não existe upload de arquivos no protótipo.
- Ao excluir um projeto, seus links e o briefing próprio são removidos, enquanto tarefas e lançamentos permanecem sem vínculo.
- Backups v1 a v6 migram para o formato v7; as chaves locais antigas permanecem preservadas na migração.
- Ao excluir uma entidade relacionada, as referências são desassociadas; tarefas e lançamentos não são apagados junto com o projeto.
- Simulador: `piso = (horas × valor_hora) × (1 + reserva) + custos_extras`; arredondamento para a próxima dezena.
- Planejamento, serviços, publicações e briefing começam **com modelos editáveis**; as demais telas não contêm dados fictícios por padrão.
- Modelos e simulações **não são cotações de mercado**.
- Tudo local por enquanto; não usar dados pessoais reais até haver autenticação e autorização na API.

## Checklist de QA antes de considerar a entrega executável

- [ ] `npm install` finaliza em ambiente com acesso ao registro de pacotes.
- [x] `npm run typecheck` passa.
- [x] `npm test` cobre simulador, relacionamentos, conversão e persistência/migração.
- [x] `npm run build` passa e cria `dist/`.
- [ ] Navegação das telas funciona em desktop e mobile (QA visual no navegador).
- [ ] Status do plano altera KPI do painel.
- [ ] Simulador recalcula com base em horas, taxa, custos e reserva.
- [ ] Legendas são copiadas quando navegador permitir clipboard.
- [ ] JSON v3 exporta/importa os oito conjuntos de dados e relacionamentos.
- [x] Migração v1/v2 preserva os registros e inicializa vínculos inexistentes como vazios.
- [ ] Recarregar mantém dados no mesmo browser sem corrompê-los.
