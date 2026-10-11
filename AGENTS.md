# Instruções para agentes de código (Codex CLI / Gemini CLI)

## Contexto

Central privada de um microestúdio digital conduzido por uma única desenvolvedora. O objetivo é lançar um negócio pequeno de criação de convites interativos, sites para eventos e páginas para comércios. Não transformar este MVP em SaaS ou ERP genérico.

## Stack e arquitetura

- Vue 3 SFC (`<script setup lang="ts">`), TypeScript strict e Vite.
- `src/lib/types.ts` é o contrato do domínio.
- `src/lib/store.ts` é **temporário**; não criar dependência rígida em `localStorage` nas novas features.
- Componentes/páginas na pasta `src/views` por responsabilidade.
- Não modificar o repositório de portfólio pessoal.
- Não inserir credenciais, tokens, contatos reais ou segredos no repositório.

## Regras obrigatórias

1. Antes de implementar, leia README, docs/PRODUTO.md, docs/ARQUITETURA.md e docs/ROADMAP.md.
2. Não marque trabalho como testado se não rodou os comandos.
3. Alterações pequenas e revisáveis, preferir commits `feat(scope): ...`.
4. Não usar dados fictícios como reais; CRM/projetos/caixa iniciam vazios; planejamento, serviços, publicações e briefing começam com modelos ilustrativos.
5. Separar estimativa de pipeline, preço de projeto, recebimento e saldo.
6. Tratar dados de clientes como privados: antes da operação real, implementar autenticação, autorização no servidor/RLS e políticas de acesso.
7. Não implantar protótipo local exposto na web com dados reais.
8. Identidade e nome são placeholders até etapa comercial.
9. Incluir estados de carregamento/erro/vazio ao introduzir API.
10. Fazer avaliação de acessibilidade e mobile ao alterar interfaces.

## Entrega esperada por PR

- Resumo funcional e técnico
- Arquivos alterados
- Evidências de build/testes (ou por que não foram possíveis)
- Riscos e próximos passos
- Sem push/merge em branch `main` sem revisão

## Decisão backend

Na futura API, utilizar **TypeORM + PostgreSQL**; não adicionar Prisma nem Supabase sem uma mudança de arquitetura aprovada. A v0.2.1 é apenas frontend: não implemente backend antes de começar o sprint correspondente.
