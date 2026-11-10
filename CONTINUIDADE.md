# Estado atual do Montante

10/11/2026 · branch `main`. A versão educacional inclui as três telas do protótipo, laboratório de mercado e carteira, metas, cenários e quiz.

`npm start` executa o servidor estático local em Node.js, no endereço `http://127.0.0.1:4178`. A aplicação roda no navegador.

# Módulos concluídos

- Início (`js/pages/inicio.js`) com CTAs e gráfico do protótipo.
- Simulador (`js/pages/simulador.js`) com juros compostos, comparação de juros simples, tabela, gráfico interativo, cenários salvos e CSV.
- Comparador (`js/pages/comparador.js`) com taxas editáveis, três modalidades e inclusão opcional da taxa de uma simulação salva.
- Motor (`js/core/financial-engine.js`) com aporte ao fim do mês e conversão efetiva anual/mensal. Persistência local versionada em `js/services/storage.js`.
- Mercado (`js/pages/mercado.js`, `market-engine.js`, `market-provider.js`) com 18 ativos, filtro, favoritos, histórico e relógio reproduzível.
- Carteira e Painel (`js/pages/carteira.js`, `painel.js`) com ordens fictícias, valor a mercado, resultados, distribuição, extrato e CSV.
- Dados e demonstração (`js/pages/dados.js`, `js/services/demo.js`) com exemplos, importação/exportação JSON e restauração.
- Metas e cenários (`js/pages/metas.js`, `js/core/planning.js`) com metas editáveis, aporte necessário, inflação e análise de sensibilidade.
- Aprender (`js/pages/aprender.js`, `js/data/educacao.js`) com glossário e quiz persistido. Tema claro padrão e escuro opcional em Dados e demonstração.

# Módulos em andamento

Os módulos de primeira entrega estão implementados. A aceitação acadêmica depende de um ensaio humano.

# Próximas tarefas por prioridade

1. Abrir Dados e demonstração, carregar a carteira de exemplo e ensaiar o roteiro em desktop e celular.
2. Testar com usuários e leitor de tela, conforme os próximos passos do A3.
3. Avaliar hospedagem estática e eventuais melhorias de acessibilidade identificadas no ensaio.

# Contratos e arquitetura

Leia `docs/ARQUITETURA.md`, `docs/REGRAS_FINANCEIRAS.md` e `docs/REFERENCIAS.md`. Projeções usam taxa mensal percentual. A carteira é derivada do extrato em centavos, com preços congelados. O estado v3 migra versões 1 e 2 e permite backup local validado.

# Bugs e limitações conhecidos

Os dados salvos ficam vinculados ao navegador e à origem HTTP. O relógio automático depende de uma aba visível. O histórico de cotações conserva até 366 pontos diários. Renda fixa é explorada no Comparador. Testes com leitor de tela, usuários e celulares físicos seguem pendentes.

# Testes executados

24 testes unitários passaram, incluindo a base P0, compras, vendas, arredondamento, extrato, persistência, histórico, backup, metas, cenários e migração. Sintaxe JavaScript passou. Os três smoke tests passaram no Edge, em nove telas e cinco larguras, sem erros no console ou respostas HTTP inesperadas. O teste de compra também cobre cotação alterada em outra aba e tentativa de envio duplicado. A grade do Mercado foi ajustada para conter a rolagem da tabela a partir de 360 px. Comandos em `docs/TESTES.md`.

# GitHub

O marco de mercado e carteira anterior foi confirmado em `96a33ea` (10/11/2026). Use `git status -sb` e `git ls-remote origin refs/heads/main` para verificar o hash publicado do marco atual. O checkout usa Git Credential Manager.

# Como continuar com a próxima conta

Abra este checkout, leia README e AGENTS, confirme a versão remota, rode `npm test` e `npm start`, e retome a primeira tarefa pendente.
