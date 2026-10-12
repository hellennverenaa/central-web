# Produto — Central Web v0.2

Central particular para lançar e operar um microestúdio de convites digitais, sites para eventos e páginas de pequenos negócios.

## Jornada central

1. Consultar **Plano de lançamento** e atualizar ações (17 modelos da planilha original).
2. Consultar **Serviços e preços**, calcular referência de horas/custos e definir escopo (7 modelos).
3. Preparar **Publicações** e acompanhar status/resultado (7 modelos).
4. Copiar perguntas em **Briefing** para conversas de atendimento (13 modelos).
5. Organizar **Oportunidades**, vincular um serviço do catálogo e converter contatos fechados em projetos.
6. No detalhe de cada **Projeto**, acompanhar tarefas, recebimentos, despesas e saldo relacionado.
7. Usar **Tarefas** para ações pessoais ou vinculadas; acompanhar os totais no **Financeiro**.
8. Acompanhar indicadores na **Visão geral** e usar **Dados & backup**.

## Regras de negócio

- Oportunidade estimada não é faturamento nem dinheiro recebido.
- Valor de projeto não é automaticamente entrada no caixa.
- Projetos convertidos preservam os IDs da oportunidade e do serviço; tarefas e lançamentos podem apontar para o projeto.
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
