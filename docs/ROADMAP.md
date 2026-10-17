# Roadmap — Central Web

## Protótipo v0.2 — base funcional

- [x] Vue 3/TS + navegação responsiva
- [x] Dashboard, CRM, projetos, caixa e tarefas
- [x] Plano de lançamento da planilha (17 ações)
- [x] Catálogo e simulador de preços (7 serviços)
- [x] Calendário de divulgação (7 publicações)
- [x] Roteiro de briefing (13 perguntas)
- [x] Estado local e backup JSON v3 com migração de v1/v2
- [x] Oportunidades, serviços, projetos, tarefas e transações conectados por IDs no frontend
- [x] Conversão de oportunidade com preço combinado separado da estimativa e do caixa
- [x] Detalhe do projeto com edição, tarefas, recebimentos e despesas
- [x] Etapa 2: biblioteca de serviços contextualizada e retorno à oportunidade/projeto de origem
- [x] Etapa 2: links categorizados de materiais e ferramentas dentro do projeto; formato local v5 com migração de v4
- [x] Etapa 3: assistente guiado de atendimento, rascunho e retomada de oportunidades, serviço/valor ainda indefinidos e conversão com briefing configurável e tarefas automáticas
- [x] Etapa 4: visão Hoje com prazos, briefings, tarefas, negociação e revisão financeira calculados a partir dos registros atuais; atalhos para o contexto certo
- [x] Etapa 5: parcelas e vencimentos previstos vinculados a recebimentos confirmados, marcos de revisão/aprovação/entrega e migração v5→v6
- [x] Etapa 6: propostas comerciais por oportunidade, versões imutáveis após envio, aceite manual e migração v6→v7 (sem enviar e-mail ou gerar contrato)
- [x] Refinamento de UX/performance: modo Dark/Light global, preferência persistente, carregamento sob demanda e agrupamento de gravações locais
- [ ] QA visual do Dark Mode em todas as telas, incluindo responsividade/contraste, e medições de desempenho em navegador real
- [x] Testes de domínio, conversão, persistência e migração
- [x] GitHub Actions para checagem de tipos e build
- [x] Executar testes, typecheck e build no workspace local
- [ ] Executar instalação limpa e QA visual em desktop/mobile **em ambiente online**

## Etapa 7 — backend tradicional, sem Supabase obrigatório

- [x] **7.1:** estrutura Express/TypeScript em `apps/api`, configuração Zod, DataSource TypeORM sem entidades, PostgreSQL local via Docker Compose, healthcheck e testes/CI isolados.
- [ ] Versionar lockfile próprio da API para usar `npm ci` em instalações futuras.
- [x] **7.2 (código):** 17 entidades TypeORM, índices, constraints e migration inicial versionada, sem sincronização automática. CI testa PostgreSQL temporário.
- [ ] **7.2 (QA local):** executar migration na instância `central_dev` e validar no DBeaver as tabelas e relacionamentos antes de seguir para autenticação.
- [x] **7.3 (fundação local):** primeiro titular criado por CLI, hash scrypt, sessão opaca em cookie HttpOnly, login/me/logout, validação de origem e rate limiter em memória, com testes reais no PostgreSQL.
- [x] **Organização PostgreSQL:** migration incremental que move `users` e `auth_sessions` para schema `auth`, sem alterar as referências nem o frontend.
- [ ] **Identidade para produtos de clientes:** decisão arquitetural independente; avaliar provedor OIDC/OAuth2 e isolamento por aplicação somente se existir demanda real.
- [x] **Auditoria de login local:** origem obrigatória em mutações, limites por conta/IP e readiness de migrations; testes e plano em [`REVISAO-AUTENTICACAO.md`](REVISAO-AUTENTICACAO.md).
- [ ] **Biblioteca de autenticação para produção:** avaliar Better Auth em banco descartável, preservando IDs UUID dos titulares e contas existentes antes de integrar o frontend.
- [ ] **Menor privilégio no banco:** separar a conta de migrations da role de runtime da API.
- [ ] **7.3 (endurecimento):** autorização por titular em cada futura rota de dados, TLS/deploy seguro, limitação de tentativas distribuída, trilhas de auditoria e revisão antes de permitir dados reais.
- [ ] **7.4:** conectar frontend com loading/erros e migrar registros do localStorage de forma controlada.

## Demais tarefas do backend

- [ ] Confirmar contratos do domínio e adotar TypeORM como ORM
- [ ] Criar Docker Compose local com PostgreSQL e volume persistente
- [ ] Criar API Express/TypeScript, migrations e seed dos quatro modelos (sem dados reais)
- [ ] Implementar login, autorização server-side, logout, rate limiting e validação Zod
- [ ] Implementar CRUD com API, formulários com loading e erro, testes para acesso indevido
- [ ] Decidir hospedagem de API e PostgreSQL só quando necessário
- [ ] Backup, retenção e cuidados com LGPD

## Após o backend — operação comercial

- [x] Converter oportunidade em projeto no protótipo local; uso comercial real depende de backend e autorização
- [x] Montar proposta/orçamento com escopo, exclusões, rodadas de revisão e histórico de versões no protótipo; distribuição, assinatura e PDF final ainda dependem de integração futura
- [x] Registrar parcelas previstas e associar manualmente um ou mais recebimentos reais (inclusive parciais), sem somar previsões ao caixa
- [ ] Vincular briefing a cada projeto com controle de acesso
- [ ] Melhorar calendário com datas reais e histórico de resultados

## Depois — lançamento comercial e identidade visual

- [ ] Definir nome e identidade da marca
- [ ] Revisar site e comunicação comercial do portfólio
- [ ] Divulgação local, funil e primeiros pedidos

**Critério de produto:** operar o negócio, não desenvolver um ERP desnecessário antes do primeiro cliente.
