export const glossary = Object.freeze([
  ['Juros simples', 'O rendimento é calculado sobre o capital aplicado, sem render sobre juros anteriores. R$ 1.000 a 1% ao mês por 12 meses geram R$ 120 de juros simples.'],
  ['Juros compostos', 'Os rendimentos entram no saldo e também passam a render. R$ 1.000 a 1% ao mês por 12 meses viram R$ 1.126,83, sem novos aportes.'],
  ['CDI', 'O Certificado de Depósito Interbancário é usado em empréstimos entre instituições financeiras. A taxa DI é uma referência frequente para produtos de renda fixa.'],
  ['Selic', 'A taxa básica de juros da economia brasileira influencia o crédito e a remuneração de investimentos. Sua meta é definida pelo Comitê de Política Monetária.'],
  ['Inflação', 'Aumento generalizado de preços. Se os preços sobem 10%, R$ 110 compram o que R$ 100 compravam antes.'],
  ['CDB', 'Título emitido por um banco. Ao aplicar, você empresta dinheiro ao emissor e recebe remuneração conforme as regras contratadas.'],
  ['Poupança', 'Modalidade de depósito com regras próprias de remuneração. No comparador, uma taxa constante simplifica o exemplo.'],
  ['Tesouro Direto', 'Programa de venda de títulos públicos a pessoas físicas. Cada título tem regras de remuneração e preço que podem variar no tempo.'],
  ['Ações', 'Pequenas participações em empresas. O preço pode subir ou cair e alguns papéis podem distribuir proventos.'],
  ['FIIs', 'Fundos de investimento imobiliário. Eles podem investir em imóveis, recebíveis ou outros ativos do setor.'],
  ['ETFs', 'Fundos negociados em bolsa, muitas vezes voltados a acompanhar um índice. Uma única cota pode dar exposição a vários ativos.'],
  ['Criptomoedas', 'Ativos digitais registrados em redes distribuídas. Podem ter grande oscilação de preço e riscos tecnológicos.'],
  ['Diversificação', 'Distribuição do patrimônio entre diferentes ativos e classes. Ajuda a reduzir a dependência de um único investimento.'],
  ['Risco', 'Possibilidade de o resultado real ficar abaixo do esperado, inclusive com perda de parte do valor investido.'],
  ['Liquidez', 'Facilidade e prazo para transformar um investimento em dinheiro disponível, considerando as regras de resgate ou negociação.'],
  ['Rentabilidade', 'Variação do valor investido em um período. Na projeção do Montante, a rentabilidade sobre o total investido divide o ganho pelos valores aportados.'],
  ['Aporte', 'Valor acrescentado ao investimento. No Montante, o aporte mensal entra depois do cálculo de rendimento do mês.']
]);

export const quiz = Object.freeze([
  { id: 'juros', prompt: 'O que acontece com os rendimentos nos juros compostos?',
    options: ['São retirados a cada mês', 'Entram no saldo e também rendem', 'São iguais para todo prazo'], answer: 1,
    explanation: 'O saldo incorpora os rendimentos, que passam a fazer parte da base do próximo período.' },
  { id: 'aporte', prompt: 'Quando o aporte mensal começa a render no simulador?',
    options: ['No mês seguinte ao depósito', 'Antes de ser depositado', 'No mesmo mês em que é depositado'], answer: 0,
    explanation: 'O aporte entra no fim do mês, após o cálculo do rendimento daquele período.' },
  { id: 'inflacao', prompt: 'Quando os preços sobem, o que pode acontecer com a mesma quantidade de dinheiro?',
    options: ['Compra mais itens', 'Mantém sempre o poder de compra', 'Compra menos itens'], answer: 2,
    explanation: 'A inflação reduz o poder de compra do mesmo valor nominal.' },
  { id: 'liquidez', prompt: 'Qual conceito descreve a facilidade de transformar um investimento em dinheiro disponível?',
    options: ['Liquidez', 'Diversificação', 'Taxa efetiva'], answer: 0,
    explanation: 'Liquidez considera o prazo e a facilidade de venda ou resgate do investimento.' },
  { id: 'carteira', prompt: 'O que compõe o patrimônio da carteira virtual?',
    options: ['O valor das projeções salvas', 'O saldo em caixa mais as posições a mercado', 'O saldo inicial mais todos os aportes do simulador'], answer: 1,
    explanation: 'A carteira virtual soma o caixa disponível e o valor a mercado das posições. As projeções são independentes.' }
]);
