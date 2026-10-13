# Produto — Central Web v0.2

Central particular para lançar e operar um microestúdio de convites digitais, sites para eventos e páginas de pequenos negócios.

## Jornada central

1. Consultar **Plano de lançamento** e atualizar ações (17 modelos da planilha original).
2. Consultar **Serviços e preços**, calcular referência de horas/custos e definir escopo (7 modelos).
3. Preparar **Publicações** e acompanhar status/resultado (7 modelos).
4. Copiar perguntas em **Briefing** para conversas de atendimento (13 modelos).
5. Usar **Novo atendimento** para registrar cliente, escolher serviço ou deixar indefinido, revisar valor estimado e salvar oportunidade ou converter após confirmação. Retomar atendimentos pelo CRM.
6. No detalhe de cada **Projeto**, acompanhar briefing, tarefas, materiais e ferramentas (links), recebimentos, despesas e saldo relacionado.
7. Usar **Tarefas** para ações pessoais ou vinculadas; acompanhar os totais no **Financeiro**.
8. Acompanhar indicadores na **Visão geral** e usar **Dados & backup**.

## Regras de negócio

- Oportunidade estimada não é faturamento nem dinheiro recebido.
- Valor de projeto não é automaticamente entrada no caixa.
- Projetos convertidos preservam os IDs da oportunidade e do serviço; tarefas e lançamentos podem apontar para o projeto.
- O assistente permite salvar o atendimento em qualquer etapa após informar o cliente; oportunidades retomadas são editadas, não duplicadas.
- A etapa **ganho** é consequência da conversão em projeto: não se marca uma oportunidade como ganha sem criar o projeto.
- Ao criar o projeto pelo assistente, é possível selecionar outro modelo de briefing somente para aquele projeto; o catálogo e os projetos existentes não são modificados.
- Converter gera um briefing e as tarefas iniciais uma vez só, sem lançar recebimento.
- **Serviços e preços** é a biblioteca de modelos, não a página de um projeto; projetos existentes não herdam automaticamente alterações posteriores do modelo.
- **Materiais e ferramentas** guarda links por projeto, com nome, categoria e notas. Links só podem usar HTTP/HTTPS; não existe upload de arquivos no protótipo.
- Ao excluir um projeto, seus links e o briefing próprio são removidos, enquanto tarefas e lançamentos permanecem sem vínculo.
- Backups v1 a v4 migram para o formato v5; a chave local v4 permanece preservada na migração.
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
