# Arquitetura

O Montante é estático. `index.html` mantém cabeçalho e rodapé. `js/app.js` monta a página pelo fragmento da URL, permitindo servir o projeto em subdiretórios. `js/pages` compõe as telas. `js/components` contém elementos visuais.

`js/core/financial-engine.js` calcula a projeção mês a mês com taxa efetiva mensal percentual e aporte no fim de cada período. A projeção é independente do estado de carteira.

`DemoMarketProvider` expõe `source`, `list()`, `metadata(id)`, `quote(id)`, `history(id, days)` e `timestamp()`. Recebe uma fotografia do estado simulado. `market-engine.js` gera pontos diários com semente e cenários, preservando os pontos anteriores. `market-clock.js` avança o relógio por ação manual ou enquanto há uma aba visível.

A carteira é reconstruída do extrato em `portfolio-engine.js`. Operações trazem quantidade em unidades escaladas e cotação em centavos com timestamp congelado. Páginas e componentes usam a mesma fotografia de mercado e a mesma regra de marcação.

`storage.js` valida um documento local versionado. Operações usam uma gravação indivisível com Web Locks onde disponíveis para serializar abas. A versão 1 é migrada preservando simulações. O armazenamento local comporta os limites de 366 dias, 500 ordens e 100 simulações. `demo.js` valida backup, restauração e exemplos sem rede. Os dados são independentes por navegador e origem.

Uma integração externa poderá implementar o contrato do provedor com uma fonte própria e adaptar a configuração de origem. Cotações reais podem ter atraso, restrições de uso e limites de API. Qualquer credencial privada deve ficar em um serviço intermediário.
