# Dados dos Desafios históricos

Os replays usam a taxa diária de venda do dólar comercial do Banco Central do Brasil, série SGS 1. O recorte de 28/02 a 31/03/2020 contém 23 observações, e o de 30/10 a 30/11/2020 contém 21. A base é licenciada sob a [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/). [Recurso JSON do Banco Central](https://dadosabertos.bcb.gov.br/dataset/1-taxa-de-cambio---livre---dolar-americano-venda---diario/resource/4494fe1f-a3f9-4aba-a342-17dfea6f370a)

O recorte derivado está disponível em `js/data/historico-ptax.js` sob a mesma licença. A transformação mantém as datas publicadas em ordem, passa as datas para ISO e representa os valores em inteiros com quatro casas. As consultas verificadas usam `formato=json`, `dataInicial` e `dataFinal` em `https://api.bcb.gov.br/dados/serie/bcdata.sgs.1/dados`. Nenhuma data ausente é preenchida.

A rodada surpresa usa uma cesta fictícia, movimentos diários de fundo e, quando sorteado, um choque baseado na intensidade de um dos quatro episódios. O dia de início, a duração, a intensidade, os movimentos posteriores e a possibilidade de passar sem choque forte são sorteados. O gráfico do desafio mostra os preços gerados. A fonte do episódio aparece na conclusão.

Os fatos da Bolsa são usados como contexto. A referência de março é o primeiro gatilho de suspensão intradiária com queda de 10%. A referência de novembro é a alta mensal de 15,90% do Ibovespa. [Comunicado da B3](https://www.b3.com.br/data/files/51/A5/27/60/52AF0710CF51CE07AC094EA8/CE%20009-2020-VPC%20-%20Limite%20de%20Oscila%C3%A7%C3%A3o_REVISADO_R_2%20%28003%29.pdf) · [Balanço publicado pela B3](https://borainvestir.b3.com.br/noticias/mercado/ibovespa-sobe-092-e-mantem-127-mil-pontos-em-melhor-mes-em-3-anos-dolar-sobe-para-r-491/)
