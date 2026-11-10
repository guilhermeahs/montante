# Estado atual do Montante

10/11/2026 · branch `main`. As três telas do protótipo e o laboratório de mercado e carteira estão disponíveis.

`npm start` executa o servidor estático local em Node.js, no endereço `http://127.0.0.1:4178`. A aplicação roda no navegador.

# Módulos concluídos

- Início (`js/pages/inicio.js`) com CTAs e gráfico do protótipo.
- Simulador (`js/pages/simulador.js`) com juros compostos, comparação de juros simples, tabela, gráfico interativo, cenários salvos e CSV.
- Comparador (`js/pages/comparador.js`) com taxas editáveis, três modalidades e inclusão opcional da taxa de uma simulação salva.
- Motor (`js/core/financial-engine.js`) com aporte ao fim do mês e conversão efetiva anual/mensal. Persistência local versionada em `js/services/storage.js`.
- Mercado (`js/pages/mercado.js`, `market-engine.js`, `market-provider.js`) com 18 ativos, filtro, favoritos, histórico e relógio reproduzível.
- Carteira e Painel (`js/pages/carteira.js`, `painel.js`) com ordens fictícias, valor a mercado, resultados, distribuição, extrato e CSV.
- Dados e demonstração (`js/pages/dados.js`, `js/services/demo.js`) com exemplos, importação/exportação JSON e restauração.

# Módulos em andamento

O próximo marco acrescenta metas, cenários e a área Aprender.

# Próximas tarefas por prioridade

1. Criar metas persistidas e cálculo do aporte necessário.
2. Adicionar cenários, sensibilidade a aportes e comparação nominal/real.
3. Implementar glossário, quiz, preferências e testes.

# Contratos e arquitetura

Leia `docs/ARQUITETURA.md`, `docs/REGRAS_FINANCEIRAS.md` e `docs/REFERENCIAS.md`. Projeções usam taxa mensal percentual. A carteira é derivada do extrato em centavos, com preços congelados. O estado v2 migra as simulações v1 e permite backup local validado.

# Bugs e limitações conhecidos

Os dados salvos ficam vinculados ao navegador e à origem HTTP. O relógio automático depende de uma aba visível. O histórico de cotações conserva até 366 pontos diários. Renda fixa é explorada no Comparador. Metas e educação ainda são pendentes.

# Testes executados

21 testes unitários passaram, incluindo a base P0, compras, vendas, arredondamento, extrato, persistência, histórico, semente e backup. Sintaxe JavaScript passou. Os smoke tests de Início, Simulador, Comparador, Mercado, Carteira, Painel e Dados e demonstração passaram no Edge, sem erros no console. A grade do Mercado foi ajustada para conter a rolagem da tabela a partir de 360 px. Comandos em `docs/TESTES.md`.

# GitHub

O marco P0 anterior foi confirmado em `4661880` (10/11/2026). Use `git status -sb` e `git ls-remote origin refs/heads/main` para verificar o hash publicado do marco atual. O checkout usa Git Credential Manager.

# Como continuar com a próxima conta

Abra este checkout, leia README e AGENTS, confirme a versão remota, rode `npm test` e `npm start`, e retome a primeira tarefa pendente.
