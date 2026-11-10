# Regras financeiras

- Aportes são creditados ao fim do mês. Para cada período, calculamos o rendimento sobre o saldo de abertura e depois somamos o aporte. O saldo do mês 0 é o capital inicial.
- A taxa mensal é um percentual efetivo constante. Taxa anual efetiva é convertida por `(1 + taxa anual)^(1/12) − 1`, com taxas expressas como fração nessa fórmula.
- Juros simples usam a mesma base. O capital inicial rende por todos os meses, e cada aporte rende pelo número de meses entre o depósito e o fim do prazo, sem reinvestir rendimentos.
- Os cálculos guardam precisão intermediária e arredondam a centavos na apresentação e no CSV. Valores iniciais e aportes aceitam centavos.
- Rentabilidade acumulada sobre o total investido é `(montante − total investido) / total investido`. Fica indefinida sem capital investido.
- O comparador aplica o mesmo prazo, aporte e capital às três taxas hipotéticas mensais. Diferença percentual usa o menor montante bruto como base, quando positivo.
- Limites do formulário: R$ 100 milhões em cada valor de entrada, 1 a 600 meses, 0% a 100% de taxa mensal equivalente e R$ 10 trilhões de resultado. Taxa zero e investimento inicial zero são válidos.
- Os cálculos não incluem impostos, taxas operacionais nem projeções de mercado.

## Carteira virtual

- O saldo inicial é R$ 50.000,00 fictícios. Dinheiro é registrado em centavos, ações, FIIs e ETFs em unidades inteiras, e criptoativos em milionésimos de unidade.
- Compras debitam o bruto e somam ao custo. Vendas retiram o custo proporcional da posição, arredondado ao centavo, e creditam o líquido. Venda integral retira todo o custo remanescente. Taxas e impostos são zero.
- Arredondamentos de ordens e baixas de custo usam inteiros com meia unidade para cima. Ordens acima do saldo, vendas acima da posição, operações inferiores a um centavo e IDs duplicados são rejeitados.
- Valor de mercado é quantidade vezes cotação. Lucro não realizado é a diferença para o custo remanescente. Lucro realizado é a receita líquida de venda menos o custo baixado. Patrimônio é caixa mais valor de mercado.
- A variação patrimonial usa o crédito inicial como referência. O histórico diário usa o extrato até aquele dia. O gráfico do painel mostra até 90 dias disponíveis.
- Renda fixa permanece no comparador educacional. O mercado negociável usa quatro classes de ativos e 18 cotações fictícias.
