# Estado atual do Montante

10/11/2026 · branch `main`. Base remota `a6bd294`. Este marco cria a estrutura executável com Início e projeção calculada.

`npm start` executa o servidor estático local em Node.js, no endereço `http://127.0.0.1:4178`. A aplicação roda no navegador.

# Módulos concluídos

- Início (`js/pages/inicio.js`) com identidade e gráfico do protótipo.
- Motor de projeção (`js/core/financial-engine.js`) com aporte ao fim do mês.

# Módulos em andamento

O menu e os CTAs ganharão rotas operacionais no marco P0.

# Próximas tarefas por prioridade

1. Implementar Simulador e Comparador, navegação, persistência, exportação e testes.
2. Desenvolver mercado, carteira, visão geral e extrato.
3. Implementar metas, cenários, educação e demonstração.

# Contratos e arquitetura

Leia `docs/ARQUITETURA.md` e `docs/REFERENCIAS.md`. O motor recebe a taxa mensal percentual. O patrimônio projetado é independente da carteira.

# Bugs e limitações conhecidos

O primeiro marco contém somente a rota Início.

# Testes executados

Exemplo de referência, sintaxe JavaScript e carregamento local do Início.

# GitHub

Use `git status -sb` e `git ls-remote origin refs/heads/main` para verificar o hash publicado. O checkout usa Git Credential Manager.

# Como continuar com a próxima conta

Abra este checkout, leia README e AGENTS, confirme a versão remota, rode `npm test` e `npm start`, e retome a primeira tarefa pendente.
