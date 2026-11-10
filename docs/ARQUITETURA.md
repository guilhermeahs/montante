# Arquitetura

O Montante é estático. `index.html` mantém cabeçalho e rodapé. `js/app.js` monta a página pelo fragmento da URL, permitindo servir o projeto em subdiretórios. `js/pages` compõe as telas. `js/components` contém elementos visuais.

`js/core/financial-engine.js` calcula a projeção mês a mês com taxa efetiva mensal percentual e aporte no fim de cada período. A projeção é independente do estado de carteira.

O mercado virtual usará um provedor separado com catálogo, cotação datada, histórico e indicação da origem simulada. Uma futura integração externa exigirá uma implementação própria e, quando houver chaves privadas, um serviço intermediário.
