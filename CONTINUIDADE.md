# Estado atual do Montante

10/11/2026 · branch `main`. O Montante está organizado em Início, Simular, Investir e Aprender. Configurações abre Dados e demonstração.

`npm start` executa o servidor estático local em Node.js, no endereço `http://127.0.0.1:4178`. A aplicação roda no navegador.

# Reorganização da experiência

1. **Auditoria e checkpoint.** Base `d3dc3c5` conferida na `main` e no GitHub. As páginas dos dois PDFs foram revistas. `npm run lint`, 24 testes unitários e os três smoke tests no Edge passaram. As nove URLs diretas e o botão Voltar abriram as telas esperadas. A interface de origem descartava entradas ainda não calculadas ao sair do Simulador.
2. **Navegação principal.** Início, Simular, Investir e Aprender agrupam as telas existentes. Configurações abre `#dados` fora do menu principal. Os nove hashes anteriores continuam válidos, com aliases `#simular` e `#investir`. Os quatro smoke tests passaram no Edge, com foco, estados ativos, Voltar/Avançar e seis larguras cobertos no teste de navegação.
3. **Início.** Duas jornadas com CTAs para juros compostos e Mercado simulado, gráfico calculado pelo motor existente e três passos de apoio. Navegação, Simular e Investir passaram no Edge. As capturas de 360 e 1440 px confirmaram o contraste e os dois CTAs na área inicial após o ajuste de espaçamento mobile.
4. **Simular e Investir.** O Simulador conserva os campos editados ao voltar de Metas e pode enviar os valores calculados ao Comparador. Investir abre uma visão geral com patrimônio, saldo, resultado e uma primeira ação para carteira vazia. A cotação de um ativo abre em diálogo na lista ou na carteira e devolve o foco à origem. No Edge passaram os fluxos de rascunho, valor de referência, compra, recarga, venda parcial, filtros, relógio e extrato.
5. **Aprender e Configurações.** `#aprender` concentra conceitos e busca, e `#quiz` tem navegação própria e respostas persistidas. Configurações mantém `#dados`, com backup, demonstração, tema e restauração confirmada. Navegação, Aprender e dados passaram no Edge, incluindo retorno ao glossário, persistência do quiz e importação/exportação.
6. **Regressão final.** Passaram a checagem de sintaxe, os 24 testes unitários e os quatro smoke tests no Edge. Foram abertas dez telas em seis larguras, com teclado, hashes anteriores, aliases, Voltar/Avançar, contraste dos CTAs nos dois temas, movimento reduzido e um estado v3 existente intacto. README, AGENTS e documentação técnica foram atualizados.
7. **Gráficos e celular.** Gráficos receberam escala em reais, marcadores por série e valores do período selecionado. A interação funciona por toque, arraste, botões e teclado. Em telas estreitas, Simular leva ao resultado e as tabelas de Mercado e posições mantêm o código do ativo visível durante a rolagem horizontal. Lint, 24 testes unitários, quatro smoke tests e o smoke de toque em 360 e 390 px passaram no Edge.
8. **Textos de negociação.** O detalhe do ativo usa “Comprar” e as confirmações de compra e venda explicam que a operação movimenta saldo virtual. Foram validados a compra, a venda parcial, o saldo e o extrato no Edge, além do lint e dos 24 testes unitários.

# Módulos concluídos

- Início (`js/pages/inicio.js`) com CTAs e gráfico do protótipo.
- Simulador (`js/pages/simulador.js`) com juros compostos, comparação de juros simples, tabela, gráfico interativo, cenários salvos e CSV.
- Comparador (`js/pages/comparador.js`) com taxas editáveis, três modalidades e inclusão opcional da taxa de uma simulação salva.
- Motor (`js/core/financial-engine.js`) com aporte ao fim do mês e conversão efetiva anual/mensal. Persistência local versionada em `js/services/storage.js`.
- Mercado (`js/pages/mercado.js`, `market-engine.js`, `market-provider.js`) com 18 ativos, filtro, favoritos, histórico e relógio reproduzível.
- Minha carteira e Visão geral (`js/pages/carteira.js`, `painel.js`) com ordens fictícias, valor a mercado, resultados, distribuição, extrato e CSV.
- Dados e demonstração (`js/pages/dados.js`, `js/services/demo.js`) com exemplos, importação/exportação JSON e restauração.
- Metas e cenários (`js/pages/metas.js`, `js/core/planning.js`) com metas editáveis, aporte necessário, inflação e análise de sensibilidade.
- Aprender (`js/pages/aprender.js`, `js/data/educacao.js`) com glossário e quiz persistido. Tema claro padrão e escuro opcional em Dados e demonstração.

# Módulos em andamento

Os seis marcos da reorganização foram implementados e validados localmente. A próxima etapa é o ensaio de uso com o público da apresentação.

# Próximas tarefas por prioridade

1. Abrir a revisão local, entrar em Configurações, carregar a carteira de exemplo e ensaiar as duas jornadas com um aluno iniciante em desktop e celular físico.
2. Fazer a verificação manual com leitor de tela, incluindo navegação secundária, gráfico e diálogos.
3. Conferir no aparelho físico a rolagem dos gráficos, a interação por toque e os controles das tabelas.

# Contratos e arquitetura

Leia `docs/ARQUITETURA.md`, `docs/REGRAS_FINANCEIRAS.md` e `docs/REFERENCIAS.md`. Projeções usam taxa mensal percentual. A carteira é derivada do extrato em centavos, com preços congelados. A reorganização preserva a chave `montante.state`, o formato v3 e os nove hashes existentes. O estado v3 migra versões 1 e 2 e permite backup local validado.

# Bugs e limitações conhecidos

Os dados salvos ficam vinculados ao navegador e à origem HTTP. O relógio automático depende de uma aba visível. O histórico de cotações conserva até 366 pontos diários. Renda fixa é explorada no Comparador. Testes com leitor de tela, usuários e celulares físicos seguem pendentes.

# Testes executados

24 testes unitários passaram e a checagem de sintaxe cobriu 40 arquivos JavaScript. Os quatro smoke tests passaram no Edge em 360, 390, 601, 768, 1024 e 1440 px, sem erros no console ou recursos ausentes. A referência de R$ 1.000 mais R$ 500 por mês, a 0,8% por 60 meses, continuou dando R$ 39.924,92 de montante, R$ 31.000,00 investidos e R$ 8.924,92 de juros. Os testes cobriram compra, venda parcial, extrato, recarga e backup. As capturas confirmaram as duas jornadas do Início e a leitura dos principais fluxos em desktop e mobile. Comandos em `docs/TESTES.md`.

# GitHub

Os marcos da reorganização foram enviados à `main`, incluindo Aprender e Configurações em `ecda377`. O checkout usa Git Credential Manager. Use `git status -sb`, `git log --oneline -6` e `git ls-remote origin refs/heads/main` para confirmar o commit de validação final.

# Publicação

Em 10/11/2026, os rótulos de negociação do commit `74916e4ac0a5dfb49e1f6ed0c3fdf549f377ddc7` foram publicados na produção do Cloudflare Pages. O fluxo de compra, venda parcial, saldo e extrato passou por HTTPS no Edge, sem erros no console. [Deploy dos rótulos de negociação](https://7a3c849b.montante-educacao.pages.dev/).

Em 10/11/2026, a reorganização e os ajustes de gráficos e celular do commit `86b548e949d9a7ada7c214509322e4fd3a3f9821` foram publicados na branch de produção `main` do projeto `montante-educacao` no Cloudflare Pages. O [endereço público](https://montante-educacao.pages.dev/) respondeu com os arquivos da revisão, e os cinco smoke tests passaram por HTTPS no Edge, incluindo toque emulado, sem erros no console. A [URL específica do deploy](https://dec647d5.montante-educacao.pages.dev/) identifica esta publicação.

O projeto usa upload direto. Para publicar uma nova revisão, gere o pacote a partir da raiz do repositório e envie o ZIP pelo painel do projeto, em **Create a new deployment → Production**.

```sh
git archive --format=zip --output=../Montante-publicacao.zip HEAD index.html css js assets LICENSE
```

# Como continuar com a próxima conta

Abra este checkout, leia README e AGENTS, rode `git status -sb` e `git fetch origin` para conferir a revisão remota. Se a árvore estiver limpa e houver avanço remoto linear, rode `git pull --ff-only`. Em seguida, execute `npm test` e `npm start`. Abra `http://127.0.0.1:4178/#dados` para o roteiro de demonstração e siga a primeira tarefa pendente.
