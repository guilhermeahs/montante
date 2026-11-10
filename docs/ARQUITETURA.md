# Arquitetura

O Montante é estático. `index.html` mantém cabeçalho e rodapé. `js/app.js` monta a página pelo fragmento da URL, permitindo servir o projeto em subdiretórios. `js/pages` compõe as telas. `js/components` contém elementos visuais.

As rotas por hash são agrupadas em Início, Simular, Investir e Aprender. O cabeçalho destaca o grupo e a página atuais. Configurações é um link separado para `#dados`. Os hashes anteriores são canônicos. `#simular` e `#investir` são aliases de entrada, e `#quiz` complementa `#aprender`.

`js/core/financial-engine.js` calcula a projeção mês a mês com taxa efetiva mensal percentual e aporte no fim de cada período. A projeção é independente do estado de carteira. O Simulador guarda o rascunho em memória durante a navegação e encaminha os últimos valores calculados ao Comparador quando solicitado.

`DemoMarketProvider` expõe `source`, `list()`, `metadata(id)`, `quote(id)`, `history(id, days)` e `timestamp()`. Recebe uma fotografia do estado simulado. `market-engine.js` gera pontos diários com semente e cenários, preservando os pontos anteriores. `market-clock.js` avança o relógio por ação manual ou enquanto há uma aba visível.

A carteira é reconstruída do extrato em `portfolio-engine.js`. Operações trazem quantidade em unidades escaladas e cotação em centavos com timestamp congelado. Páginas e componentes usam a mesma fotografia de mercado e a mesma regra de marcação. Mercado e Minha carteira compartilham o diálogo de detalhes de ativos. Cada tela conserva o contexto e recupera o foco ao fechar.

`storage.js` valida um documento local versionado. Operações usam uma gravação indivisível com Web Locks onde disponíveis para serializar abas. A versão 3 aceita as versões 1 e 2, preservando os campos existentes e preenchendo os novos com os padrões. O armazenamento local comporta os limites de 366 dias, 500 ordens, 100 simulações e 100 metas. `demo.js` valida backup, restauração e exemplos sem rede. Os dados são independentes por navegador e origem.

`planning.js` calcula metas, cenários e inflação com o mesmo motor do Simulador. `educacao.js` contém glossário e quiz. Metas, respostas e tema ficam no documento local e no backup. Campos de trabalho ainda não salvos e premissas de comparação editadas duram a sessão.

Uma integração externa poderá implementar o contrato do provedor com uma fonte própria e adaptar a configuração de origem. Cotações reais podem ter atraso, restrições de uso e limites de API. Qualquer credencial privada deve ficar em um serviço intermediário.
