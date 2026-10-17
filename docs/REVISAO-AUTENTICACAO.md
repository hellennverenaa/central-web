# Revisão de autenticação — Central Web (17/10/2026)

## Escopo e decisão

Revisão do backend local em `apps/api` **antes** de ligar o login ao frontend Vue.
O frontend ainda utiliza `localStorage`. Nenhuma mudança nesta revisão transforma a
Central em serviço público de identidade, cria usuários ou migra projetos.

**Decisão:** manter a API exclusivamente local até terminar os controles abaixo.
Para a aplicação real, preferir integrar uma **biblioteca de autenticação mantida**,
em vez de ampliar indefinidamente a autenticação própria.
Better Auth é um candidato compatível com Express e PostgreSQL (inclusive
schema específico `auth`), mas **não foi instalado ou ativado** nesta revisão.

## Mapa de controles atuais

| Área | Estado | Observações |
| --- | --- | --- |
| Senhas | Implementado localmente | `scrypt` com salt individual; comparações seguras; sem armazenar senha em texto puro. |
| Sessões | Implementado localmente | Token aleatório; servidor guarda somente SHA-256; cookie HttpOnly + SameSite Strict; logout revoga sessão. |
| Cadastro | Bloqueado na web | Apenas CLI `auth:create-owner`, exigindo terminal interativo. |
| CORS/CSRF | Endurecido | Toda mutação HTTP na API exige `Origin` exata; CORS restringe a origem configurada. CORS/Origin **não substituem autenticação**. |
| Tentativas de login | Endurecido para localhost | Contagem por IP e por conta, sem apagar todos os bloqueios quando a memória enche; ainda limitada a um processo. |
| Prontidão | Endurecida | `/health/ready` falha com 503 quando a conexão ou as migrations não estão prontas. |
| Schemas | Implementados | `auth.users`/`auth.auth_sessions` ficam separados de `public` sem migração destrutiva. |
| Rotas de domínio | Não habilitadas | Nenhum CRUD de projetos, clientes ou financeiro pela API. |
| Autorização por titular | Pendente | Toda futura consulta/mutação deve obter `owner_id` da sessão no servidor e filtrar por ele, com testes para dois titulares. |
| Banco com mínimo privilégio | Pendente | O usuário atual do PostgreSQL gerado pelo Docker também administra o banco. Criar role **runtime** distinta da role de migrations antes de produção. |
| TLS, hospedagem e cookies | Pendente | HTTP e cookies sem flag Secure são aceitáveis apenas no loopback de desenvolvimento. Requer HTTPS e revisão de `SameSite`/proxy da mesma origem para deploy. |
| Recuperação/MFA/observabilidade | Pendente | Ainda não há troca/redefinição de senha, MFA, auditoria e alerta de tentativas abusivas. |
| Instalação reproduzível | Pendente | Versionar o lockfile da API e adotar `npm ci` na CI. |
| Dados do frontend | Pendente | Projetos/briefings/financeiro continuam no `localStorage`. Não usar dados pessoais reais até a migração autenticada com backups testados. |

## Compatibilidade com biblioteca de autenticação

- O banco existente usa `auth.users` (ID **UUID** referenciado por
  `owner_id` em muitas tabelas) e `auth.auth_sessions`.
- **Better Auth não possui por padrão o mesmo modelo relacional**: seus modelos
  incluem tabelas de usuário, sessão, conta e verificação. Não apontar a biblioteca
  para as tabelas atuais e executar uma migração automática sem inspeção.
- Planejar uma prova de conceito em **banco descartável `*_test`**, com geração
  e revisão do SQL, manutenção dos mesmos IDs UUID do titular e teste de
  autenticação das contas já criadas.
- Better Auth permite adaptar a função de verificação de senha; avaliar uma
  transição compatível com os hashes `scrypt-v1` existentes. Se houver alguma
  incompatibilidade, preferir redefinição explícita de senha pelo titular,
  nunca mover senhas em claro.
- A autorização em `projects`, `clients`, `transactions` etc. **não é fornecida
  automaticamente pela biblioteca**; continuará sendo uma responsabilidade da API.
- A decisão não exige pagar um provedor mensal nem criar um servidor compartilhado
  para sites de clientes.

Referências do fornecedor:
- https://better-auth.com/docs/integrations/express
- https://better-auth.com/docs/adapters/postgresql
- https://better-auth.com/docs/concepts/database
- https://better-auth.com/docs/authentication/email-password

Recomendações de segurança:
- https://top10.owasp.org/2025/pt-BR/A07_2025-Authentication_Failures/
- https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html

## Critérios para começar a tela de login e integração

1. Decidir biblioteca e planejar migração de `auth.users`/contas existentes **sem perda de IDs**.
2. Definir proxy de mesma origem no ambiente de desenvolvimento para cookies HttpOnly;
   padronizar `localhost`/porta do Vue e da API.
3. Implementar componente Vue para login/logout e estados de sessão, carregamento,
   erro e expiração, sem mostrar a Central com dados locais desprotegidos após login.
4. Preparar uma role SQL de runtime com privilégio mínimo e migrations com conta separada.
5. Criar rotas reais protegidas por sessão + `owner_id` e testes de acesso indevido.
6. Fazer backup JSON antes da migração de qualquer workspace local, testar restauração
   e resolver conflitos/sobrescritas sem perda de dados.

Aprovado nos testes **não significa seguro para produção**. A `main` não foi alterada;
o trabalho continua no PR de backend em rascunho.
