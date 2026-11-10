import { assetById } from '../data/ativos.js';
import { marketDate, maxMarketDay, maxPrice } from './market-engine.js';

export const initialCash = 5_000_000;
export const maxOperations = 500;
const maxQuantity = 1e12;
const maxCash = 1e15;
const maxAssetPosition = 10000;
const marketRules = 'market-v1';
const operationKeys = ['id', 'side', 'assetId', 'units', 'cents', 'day', 'timestamp', 'gross', 'fees', 'net', 'cashBefore', 'cashAfter', 'costSold', 'realized'];
const marketContext = {
  openingCash: initialCash,
  assetFor: id => assetById.get(id),
  timestampFor: marketDate
};

function roundedRatio(value, numerator, denominator) {
  const divisor = BigInt(denominator);
  const result = Number((BigInt(value) * BigInt(numerator) + divisor / 2n) / divisor);
  if (!Number.isSafeInteger(result)) throw new Error('O valor da ordem excede o limite.');
  return result;
}

export function quantityUnits(text, asset) {
  const value = String(text).trim();
  const [whole, fraction = ''] = value.replace(',', '.').split('.');
  const decimals = asset.scale === 1 ? 0 : 6;
  if (!/^\d+([.,]\d+)?$/.test(value) || fraction.length > decimals) {
    throw new Error(decimals ? 'Informe uma quantidade com até seis casas decimais.' : 'Informe uma quantidade inteira.');
  }
  const units = Number(whole) * asset.scale + Number(fraction.padEnd(decimals, '0'));
  if (!Number.isSafeInteger(units) || units <= 0 || units > maxQuantity) throw new Error('Informe uma quantidade positiva dentro do limite.');
  return units;
}

export function saleAvailabilityDay(order) {
  return order.side === 'sell' ? order.day + (order.rules === marketRules ? 1 : 0) : null;
}

function releaseSales(portfolio, day) {
  if (day > portfolio.day && portfolio.pendingCash > 0) {
    portfolio.cash += portfolio.pendingCash;
    portfolio.pendingCash = 0;
  }
}

function checkOrder(order, portfolio, context) {
  const asset = context.assetFor(order?.assetId);
  if (!asset || typeof order.id !== 'string' || !/^[a-zA-Z0-9-]{1,80}$/.test(order.id) || !['buy', 'sell'].includes(order.side) ||
      !Number.isSafeInteger(order.units) || order.units < 1 || order.units > maxQuantity ||
      !Number.isInteger(order.cents) || order.cents < 1 || order.cents > maxPrice ||
      !Number.isInteger(order.day) || order.day < 0 || order.day > maxMarketDay ||
      order.timestamp !== context.timestampFor(order.day) || order.day < portfolio.day) throw new Error('Ordem inválida.');
  const realistic = order.rules === marketRules && context === marketContext;
  if (order.rules !== undefined && !realistic) throw new Error('Regra de operação inválida.');
  if (portfolio.ids.has(order.id)) throw new Error('Essa ordem já foi executada.');
  releaseSales(portfolio, order.day);
  const gross = roundedRatio(order.cents, order.units, asset.scale);
  if (gross < 1) throw new Error('O valor da ordem deve ser de pelo menos R$ 0,01.');
  const holding = portfolio.holdings.get(asset.id) ?? { units: 0, cost: 0 };
  const buy = order.side === 'buy';
  const fees = realistic ? roundedRatio(gross, 1, 1000) : 0;
  const net = buy ? gross + fees : gross - fees;
  if (buy && net > portfolio.cash) {
    const waiting = portfolio.pendingCash ? ' O valor a receber entra no saldo no próximo dia simulado.' : '';
    throw new Error('Saldo fictício insuficiente.' + waiting);
  }
  if (!buy && order.units > holding.units) throw new Error('Quantidade superior à posição disponível.');
  const deferredSale = !buy && realistic;
  if (deferredSale && order.day === maxMarketDay) throw new Error('A venda precisa de mais um dia simulado para liberar o saldo.');
  const costSold = buy ? 0 : roundedRatio(holding.cost, order.units, holding.units);
  const cashAfter = portfolio.cash + (buy ? -net : deferredSale ? 0 : net);
  const pendingCash = portfolio.pendingCash + (deferredSale ? net : 0);
  const realized = buy ? 0 : net - costSold;
  const position = { units: holding.units + (buy ? order.units : -order.units), cost: holding.cost + (buy ? net : -costSold) };
  if (![cashAfter + pendingCash, position.units, position.cost, portfolio.realized + realized].every(Number.isSafeInteger) ||
      cashAfter + pendingCash > maxCash || Math.abs(portfolio.realized + realized) > maxCash ||
      position.units > maxAssetPosition * asset.scale) throw new Error('A operação excede os limites da carteira.');
  const record = {
    id: order.id, side: order.side, assetId: order.assetId, units: order.units, cents: order.cents,
    day: order.day, timestamp: order.timestamp, gross, fees, net,
    cashBefore: portfolio.cash, cashAfter, costSold, realized,
    ...(realistic ? { rules: marketRules } : {})
  };
  return { record, position, pendingCash };
}

function applyOrder(portfolio, { record, position, pendingCash }) {
  portfolio.ids.add(record.id);
  portfolio.day = record.day;
  portfolio.cash = record.cashAfter;
  portfolio.pendingCash = pendingCash;
  portfolio.realized += record.realized;
  if (position.units > 0) portfolio.holdings.set(record.assetId, position);
  else portfolio.holdings.delete(record.assetId);
}

export function replayPortfolio(operations, context = marketContext, day) {
  if (!Array.isArray(operations) || operations.length > maxOperations) throw new Error('Extrato inválido ou no limite de 500 operações.');
  const portfolio = { cash: context.openingCash, pendingCash: 0, realized: 0, holdings: new Map(), ids: new Set(), day: 0 };
  for (const order of operations) {
    const checked = checkOrder(order, portfolio, context);
    if (!operationKeys.every(key => checked.record[key] === order[key])) throw new Error('Os valores do extrato não correspondem às ordens.');
    applyOrder(portfolio, checked);
  }
  if (day !== undefined) releaseSales(portfolio, day);
  return portfolio;
}

export function executeTrade(operations, order, context = marketContext) {
  if (operations.length >= maxOperations) throw new Error('A carteira atingiu o limite de 500 operações.');
  const portfolio = replayPortfolio(operations, context);
  return [...operations, checkOrder(order, portfolio, context).record];
}

export function executeMarketTrade(operations, order) {
  return executeTrade(operations, { ...order, rules: marketRules });
}

export function markPortfolio(operations, quoteFor, context = marketContext, day) {
  const { cash, pendingCash, holdings, realized } = replayPortfolio(operations, context, day);
  const positions = [...holdings].map(([id, holding]) => {
    const asset = context.assetFor(id);
    const cents = quoteFor(asset);
    const marketValue = roundedRatio(cents, holding.units, asset.scale);
    return { asset, ...holding, cents, marketValue, average: holding.cost * asset.scale / holding.units, unrealized: marketValue - holding.cost };
  });
  const invested = positions.reduce((sum, position) => sum + position.cost, 0);
  const marketValue = positions.reduce((sum, position) => sum + position.marketValue, 0);
  return { cash, pendingCash, realized, positions, invested, marketValue, unrealized: marketValue - invested,
    wealth: cash + pendingCash + marketValue };
}

export function marketPortfolio(operations, tick) {
  return markPortfolio(operations, asset => tick.prices[asset.index], marketContext, tick.day);
}

export function portfolioHistory(operations, ticks) {
  return ticks.filter(tick => tick.day >= 0).slice(-90).map(tick => ({
    day: tick.day,
    value: marketPortfolio(operations.filter(order => order.day <= tick.day), tick).wealth / 100
  }));
}

export function portfolioRisk(summary, history, operations) {
  const byCategory = new Map();
  let largestAsset;
  for (const position of summary.positions) {
    if (position.marketValue > (largestAsset?.marketValue ?? 0)) largestAsset = position;
    const category = position.asset.category;
    byCategory.set(category, (byCategory.get(category) ?? 0) + position.marketValue);
  }
  const [category, categoryValue] = [...byCategory].sort((a, b) => b[1] - a[1])[0] ?? [];
  let peak = 0;
  let drawdown = 0;
  for (const { value } of history) {
    peak = Math.max(peak, value);
    if (peak > 0) drawdown = Math.max(drawdown, (peak - value) / peak);
  }
  return {
    largestAsset: largestAsset ? { label: largestAsset.asset.id, share: largestAsset.marketValue / summary.wealth } : null,
    largestCategory: categoryValue > 0 ? { label: category, share: categoryValue / summary.wealth } : null,
    drawdown: history.length > 1 ? drawdown : null,
    fees: operations.reduce((total, order) => total + order.fees, 0)
  };
}
