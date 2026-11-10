# Arquitetura

O Montante é estático. `index.html` mantém cabeçalho e rodapé. `js/app.js` monta a página pelo fragmento da URL, permitindo servir o projeto em subdiretórios. `js/pages` compõe as telas. `js/components` contém elementos visuais.

As rotas por hash são agrupadas em Início, Simular, Investir e Aprender. O cabeçalho destaca o grupo e a página atuais. Configurações é um link separado para `#dados`. Os hashes anteriores são canônicos. `#simular` e `#investir` são aliases de entrada, e `#quiz` complementa `#aprender`.

`js/core/financial-engine.js` calcula a projeção mês a mês com taxa efetiva mensal percentual e aporte no fim de cada período. A projeção é independente do estado de carteira. O Simulador guarda o rascunho em memória durante a navegação e encaminha os últimos valores calculados ao Comparador quando solicitado.

`DemoMarketProvider` expõe `source`, `list()`, `metadata(id)`, `quote(id)`, `history(id, days)` e `timestamp()`. Recebe uma fotografia do estado simulado. No modo padrão, `market-engine.js` combina fatores geral, de categoria e individual com choques de alta ou queda em blocos sorteados pela semente. Cada avanço mantém os pontos anteriores até o limite de retenção. `market-clock.js` avança manualmente ou em uma aba visível. A ordem usa um Web Lock compartilhado e temporário para impedir o avanço automático durante o diálogo. Quando Web Locks estão indisponíveis, a suspensão vale na aba da ordem. Em ambos os casos, a confirmação valida a cotação e o extrato atuais.

A carteira é reconstruída do extrato em `portfolio-engine.js`. Operações trazem quantidade em unidades escaladas e cotação em centavos com timestamp congelado. `market-v1` identifica operações com taxa e recebimento no dia seguinte à venda. Ordens antigas conservam a regra original. A cada consulta, o caixa é reconstruído pelo extrato e pelo dia observado. Avançar o relógio libera o valor sem gravar um lançamento adicional. Mercado, Minha carteira e Visão geral usam a mesma fotografia e regra de marcação.

`storage.js` valida um documento local versionado. Operações usam uma gravação indivisível com Web Locks onde disponíveis para serializar abas. A versão 5 aceita backups das versões 1 a 4. O desafio fica vazio na migração das versões 1 a 3. A versão 4 preserva o desafio, as cotações e os registros da carteira. O armazenamento local comporta os limites de 366 dias, 500 ordens, 100 simulações e 100 metas. `demo.js` valida backup, restauração e exemplos sem rede. Os dados são independentes por navegador e origem.

`challenges.js` resolve a rodada a partir da semente e entrega à tela só os preços revelados e, ao fim, o relatório. As ordens e o cursor ficam em `challenge`, separados do extrato do Mercado simulado. O motor de carteira usa o contexto de ativo, calendário e caixa inicial de cada modo. O replay usa o recorte versionado `historico-ptax.js`. Veja a [origem e a licença dos dados](DADOS_HISTORICOS.md).

`planning.js` calcula metas, cenários e inflação com o mesmo motor do Simulador. `educacao.js` contém glossário e quiz. Metas, respostas e tema ficam no documento local e no backup. Campos de trabalho ainda não salvos e premissas de comparação editadas duram a sessão.

Uma integração externa poderá implementar o contrato do provedor com uma fonte própria e adaptar a configuração de origem. Cotações reais podem ter atraso, restrições de uso e limites de API. Qualquer credencial privada deve ficar em um serviço intermediário.
