# Fluxo Codex CLI e Gemini CLI

## Codex CLI — verificação primeiro

```text
Leia AGENTS.md, README.md, docs/PRODUTO.md, docs/ARQUITETURA.md e docs/ROADMAP.md.
Não adicione funcionalidade antes de verificar a base v0.2.
Rode npm install, npm run typecheck e npm run build.
Corrija erros encontrados com mudanças pequenas. Gere package-lock.json e versione-o.
Revise navegação das 10 telas, recalculação do simulador e backup v1/v2.
Se um comando falhar, relate o erro real. Não faça deploy ou push sem aprovação.
```

## Gemini CLI — revisão independente

```text
Revise a central v0.2, sem editar arquivos. Leia os documentos do repositório.
Verifique erros na lógica de preços, armazenamento local, migração v1 para v2,
importação JSON, acessibilidade mobile e estados vazios. Dê severidade, caminho
e proposta de correção. Diferencie riscos do protótipo dos de produção.
```

## Codex CLI — próximo sprint (depois de validar build)

```text
Proponha um plano técnico em branch nova (sem implementar antes de revisão)
para uma API Node.js/Express + TypeScript + PostgreSQL, com Docker Compose
local, TypeORM, migrations, seed de modelos e Zod.
Planeje autenticação, autorização por usuário em cada query, teste contra IDOR,
logs sem dados sensíveis e interface preservada. O Supabase não é obrigatório.
Leia docs/ARQUITETURA.md. Não altere o portfólio pessoal. Não faça deploy.
```

## Processo

Use um agente para implementar e o outro para revisar, em sequência, sem alterações simultâneas sobre os mesmos arquivos. Valide o resultado e só depois faça merge.
