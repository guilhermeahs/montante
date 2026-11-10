# Estado atual do Montante

10/11/2026 · branch `main`. O marco P0 contém as três telas do protótipo operacionais.

`npm start` executa o servidor estático local em Node.js, no endereço `http://127.0.0.1:4178`. A aplicação roda no navegador.

# Módulos concluídos

- Início (`js/pages/inicio.js`) com CTAs e gráfico do protótipo.
- Simulador (`js/pages/simulador.js`) com juros compostos, comparação de juros simples, tabela, gráfico interativo, cenários salvos e CSV.
- Comparador (`js/pages/comparador.js`) com taxas editáveis, três modalidades e inclusão opcional da taxa de uma simulação salva.
- Motor (`js/core/financial-engine.js`) com aporte ao fim do mês e conversão efetiva anual/mensal. Persistência local versionada em `js/services/storage.js`.

# Módulos em andamento

O próximo marco implementa o provedor de preços e a carteira simulada.

# Próximas tarefas por prioridade

1. Criar o catálogo, relógio de simulação e provedor determinístico.
2. Desenvolver compra/venda, carteira, visão geral e extrato.
3. Implementar metas, cenários, educação, backup e demonstração.

# Contratos e arquitetura

Leia `docs/ARQUITETURA.md` e `docs/REFERENCIAS.md`. O motor recebe a taxa mensal percentual. O patrimônio projetado é independente da carteira.

# Bugs e limitações conhecidos

Os dados salvos ficam vinculados ao navegador e à origem HTTP. Ainda não há backup, mercado, carteira, metas ou área educacional.

# Testes executados

11 testes unitários passaram, incluindo projeção, cenários extremos, comparador, persistência e CSV. A checagem de sintaxe passou. No Edge, as três telas passaram nas cinco larguras, sem erros no console ou nos recursos HTTP. O fluxo de salvar, recarregar, renomear, comparar e excluir foi exercitado, assim como taxa anual, validação, exportação e restauração das taxas. Comandos em `docs/TESTES.md`.

# GitHub

O marco de infraestrutura anterior foi confirmado em `b3d097b` (10/11/2026). Use `git status -sb` e `git ls-remote origin refs/heads/main` para verificar o hash publicado do marco atual. O checkout usa Git Credential Manager.

# Como continuar com a próxima conta

Abra este checkout, leia README e AGENTS, confirme a versão remota, rode `npm test` e `npm start`, e retome a primeira tarefa pendente.
