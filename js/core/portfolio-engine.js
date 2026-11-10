import { assetById } from '../data/ativos.js';
import { marketDate, maxPrice } from './market-engine.js';

export const initialCash = 5_000_000;
export const maxOperations = 500;
const maxQuantity = 1e12;
const maxCash = 1e15;
const maxAssetPosition = 10000;
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

function checkOrder(order, portfolio, context) {
  const asset = context.assetFor(order?.assetId);
  if (!asset || typeof order.id !== 'string' || !/^[a-zA-Z0-9-]{1,80}$/.test(order.id) || !['buy', 'sell'].includes(order.side) ||
      !Number.isSafeInteger(order.units) || order.units < 1 || order.units > maxQuantity ||
      !Number.isInteger(order.cents) || order.cents < 1 || order.cents > maxPrice ||
      !Number.isInteger(order.day) || order.day < 0 || order.day > 1e6 ||
      order.timestamp !== context.timestampFor(order.day) || order.day < portfolio.day) throw new Error('Ordem inválida.');
  if (portfolio.ids.has(order.id)) throw new Error('Essa ordem já foi executada.');
  const gross = roundedRatio(order.cents, order.units, asset.scale);
  if (gross < 1) throw new Error('O valor da ordem deve ser de pelo menos R$ 0,01.');
  const holding = portfolio.holdings.get(asset.id) ?? { units: 0, cost: 0 };
  const buy = order.side === 'buy';
  if (buy && gross > portfolio.cash) throw new Error('Saldo fictício insuficiente.');
  if (!buy && order.units > holding.units) throw new Error('Quantidade superior à posição disponível.');
  const costSold = buy ? 0 : roundedRatio(holding.cost, order.units, holding.units);
  const cashAfter = portfolio.cash + (buy ? -gross : gross);
  const realized = buy ? 0 : gross - costSold;
  const position = { units: holding.units + (buy ? order.units : -order.units), cost: holding.cost + (buy ? gross : -costSold) };
  if (![cashAfter, position.units, position.cost, portfolio.realized + realized].every(Number.isSafeInteger) ||
      cashAfter > maxCash || Math.abs(portfolio.realized + realized) > maxCash ||
      position.units > maxAssetPosition * asset.scale) throw new Error('A operação excede os limites da carteira.');
  const record = {
    id: order.id, side: order.side, assetId: order.assetId, units: order.units, cents: order.cents,
    day: order.day, timestamp: order.timestamp, gross, fees: 0, net: gross,
    cashBefore: portfolio.cash, cashAfter, costSold, realized
  };
  return { record, position };
}

function applyOrder(portfolio, { record, position }) {
  portfolio.ids.add(record.id);
  portfolio.day = record.day;
  portfolio.cash = record.cashAfter;
  portfolio.realized += record.realized;
  if (position.units > 0) portfolio.holdings.set(record.assetId, position);
  else portfolio.holdings.delete(record.assetId);
}

export function replayPortfolio(operations, context = marketContext) {
  if (!Array.isArray(operations) || operations.length > maxOperations) throw new Error('Extrato inválido ou no limite de 500 operações.');
  const portfolio = { cash: context.openingCash, realized: 0, holdings: new Map(), ids: new Set(), day: 0 };
  for (const order of operations) {
    const checked = checkOrder(order, portfolio, context);
    if (!operationKeys.every(key => checked.record[key] === order[key])) throw new Error('Os valores do extrato não correspondem às ordens.');
    applyOrder(portfolio, checked);
  }
  return portfolio;
}

export function executeTrade(operations, order, context = marketContext) {
  if (operations.length >= maxOperations) throw new Error('A carteira atingiu o limite de 500 operações.');
  const portfolio = replayPortfolio(operations, context);
  return [...operations, checkOrder(order, portfolio, context).record];
}

export function markPortfolio(operations, quoteFor, context = marketContext) {
  const { cash, holdings, realized } = replayPortfolio(operations, context);
  const positions = [...holdings].map(([id, holding]) => {
    const asset = context.assetFor(id);
    const cents = quoteFor(asset);
    const marketValue = roundedRatio(cents, holding.units, asset.scale);
    return { asset, ...holding, cents, marketValue, average: holding.cost * asset.scale / holding.units, unrealized: marketValue - holding.cost };
  });
  const invested = positions.reduce((sum, position) => sum + position.cost, 0);
  const marketValue = positions.reduce((sum, position) => sum + position.marketValue, 0);
  return { cash, realized, positions, invested, marketValue, unrealized: marketValue - invested, wealth: cash + marketValue };
}

export function portfolioHistory(operations, ticks) {
  return ticks.filter(tick => tick.day >= 0).slice(-90).map(tick => ({
    day: tick.day,
    value: markPortfolio(operations.filter(order => order.day <= tick.day), asset => tick.prices[asset.index]).wealth / 100
  }));
}
