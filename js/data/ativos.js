export const assetClasses = {
  'Ações': { scale: 1, volatility: .025, title: 'Ações', description: 'Uma ação é uma pequena parte de uma empresa.',
    risk: 'Se os negócios da empresa ou as expectativas do mercado piorarem, o preço pode cair e sua posição pode perder valor.' },
  'FIIs': { scale: 1, volatility: .014, title: 'Fundos imobiliários (FIIs)', description: 'Um FII reúne investimentos ligados a imóveis ou recebíveis.',
    risk: 'Imóveis vazios, atrasos em pagamentos ou mudanças nos juros podem reduzir os rendimentos ou o preço da cota.' },
  'ETFs': { scale: 1, volatility: .018, title: 'ETFs (fundos de índice)', description: 'Um ETF negociado em bolsa pode acompanhar uma cesta de ativos.',
    risk: 'Uma cesta distribui a exposição, mas sua cota pode cair se os ativos que ela reúne perderem valor.' },
  'Criptomoedas': { scale: 1e6, volatility: .065, title: 'Criptomoedas', description: 'Criptomoedas são ativos digitais negociados por compradores e vendedores.',
    risk: 'Mudanças rápidas na procura e problemas de tecnologia podem causar quedas acentuadas.' }
};

export const assets = Object.freeze([
  ['PETR4', 'Petrobras', 'Ações', 3625],
  ['VALE3', 'Vale', 'Ações', 6030],
  ['ITUB4', 'Itaú Unibanco', 'Ações', 3320],
  ['WEGE3', 'WEG', 'Ações', 5480],
  ['BBAS3', 'Banco do Brasil', 'Ações', 2780],
  ['ABEV3', 'Ambev', 'Ações', 1210],
  ['RENT3', 'Localiza', 'Ações', 4120],
  ['HGLG11', 'Fundo de logística', 'FIIs', 15300],
  ['MXRF11', 'Fundo de recebíveis', 'FIIs', 980],
  ['KNRI11', 'Fundo de imóveis comerciais', 'FIIs', 14250],
  ['VISC11', 'Fundo de shoppings', 'FIIs', 10275],
  ['BOVA11', 'ETF de ações brasileiras', 'ETFs', 12880],
  ['IVVB11', 'ETF de ações dos EUA', 'ETFs', 34900],
  ['SMAL11', 'ETF de empresas menores', 'ETFs', 10500],
  ['DIVO11', 'ETF de ações de dividendos', 'ETFs', 7390],
  ['BTC', 'Bitcoin', 'Criptomoedas', 36200000],
  ['ETH', 'Ethereum', 'Criptomoedas', 1485000],
  ['SOL', 'Solana', 'Criptomoedas', 74500]
].map(([id, name, category, initial], index) => Object.freeze({ id, name, category, initial, index, ...assetClasses[category] })));

export const assetById = new Map(assets.map(asset => [asset.id, asset]));
export const categories = Object.keys(assetClasses);
