# Produto — Central Web v0.2

Central particular para lançar e operar um microestúdio de convites digitais, sites para eventos e páginas de pequenos negócios.

## Jornada central

1. Consultar **Plano de lançamento** e atualizar ações (17 modelos da planilha original).
2. Consultar **Serviços e preços**, calcular referência de horas/custos e definir escopo (7 modelos).
3. Preparar **Publicações** e acompanhar status/resultado (7 modelos).
4. Copiar perguntas em **Briefing** para conversas de atendimento (13 modelos).
5. Quando houver contatos, organizar **Oportunidades** e registrar **Projetos**.
6. Lançar receitas/despesas no **Financeiro** e tarefas avulsas na **Rotina**.
7. Acompanhar tudo na **Visão geral** e usar **Dados & backup**.

## Regras de negócio

- Oportunidade estimada não é faturamento nem dinheiro recebido.
- Valor de projeto não é automaticamente entrada no caixa.
- Simulador: `piso = (horas × valor_hora) × (1 + reserva) + custos_extras`; arredondamento para a próxima dezena.
- Planejamento, serviços, publicações e briefing começam **com modelos editáveis**; as demais telas não contêm dados fictícios por padrão.
- Modelos e simulações **não são cotações de mercado**.
- Tudo local por enquanto; não usar dados pessoais reais até haver autenticação e autorização na API.

## Checklist de QA antes de considerar a entrega executável

- [ ] `npm install` finaliza em ambiente com acesso ao registro de pacotes.
- [ ] `npm run typecheck` passa.
- [x] Testes unitários do simulador passaram no Node.js 22.
- [ ] `npm run build` passa e cria `dist/`.
- [ ] Navegação das 10 telas funciona em desktop e mobile.
- [ ] Status do plano altera KPI do painel.
- [ ] Simulador recalcula com base em horas, taxa, custos e reserva.
- [ ] Legendas são copiadas quando navegador permitir clipboard.
- [ ] JSON v2 exporta/importa os oito conjuntos de dados.
- [ ] Backup v1 preserva CRM/caixa e inicializa os quatro novos módulos.
- [ ] Recarregar mantém dados no mesmo browser sem corrompê-los.
