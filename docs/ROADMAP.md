# Roadmap — Central Web

## Protótipo v0.2 — base funcional

- [x] Vue 3/TS + navegação responsiva
- [x] Dashboard, CRM, projetos, caixa e tarefas
- [x] Plano de lançamento da planilha (17 ações)
- [x] Catálogo e simulador de preços (7 serviços)
- [x] Calendário de divulgação (7 publicações)
- [x] Roteiro de briefing (13 perguntas)
- [x] Estado local e backup JSON v2 com leitura de v1
- [x] GitHub Actions para checagem de tipos e build
- [ ] Executar instalação, typecheck, build e QA visual **em ambiente online**

## Próximo sprint — backend tradicional, sem Supabase obrigatório

- [ ] Confirmar contratos do domínio e adotar TypeORM como ORM
- [ ] Criar Docker Compose local com PostgreSQL e volume persistente
- [ ] Criar API Express/TypeScript, migrations e seed dos quatro modelos (sem dados reais)
- [ ] Implementar login, autorização server-side, logout, rate limiting e validação Zod
- [ ] Implementar CRUD com API, formulários com loading e erro, testes para acesso indevido
- [ ] Decidir hospedagem de API e PostgreSQL só quando necessário
- [ ] Backup, retenção e cuidados com LGPD

## Após o backend — operação comercial

- [ ] Converter lead ganho em projeto
- [ ] Gerar proposta/orçamento com escopo e rodadas de revisão
- [ ] Registrar pagamento parcial e contas a receber (distinto de caixa)
- [ ] Vincular briefing a cada projeto com controle de acesso
- [ ] Melhorar calendário com datas reais e histórico de resultados

## Depois — lançamento comercial e identidade visual

- [ ] Definir nome e identidade da marca
- [ ] Revisar site e comunicação comercial do portfólio
- [ ] Divulgação local, funil e primeiros pedidos

**Critério de produto:** operar o negócio, não desenvolver um ERP desnecessário antes do primeiro cliente.
