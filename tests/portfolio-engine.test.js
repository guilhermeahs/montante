import test from 'node:test';
import assert from 'node:assert/strict';
import { executeMarketTrade, executeTrade, initialCash, markPortfolio, portfolioRisk, quantityUnits, replayPortfolio, saleAvailabilityDay } from '../js/core/portfolio-engine.js';
import { marketDate } from '../js/core/market-engine.js';
import { assetById } from '../js/data/ativos.js';

function order(id, side, units, cents, day = 0, assetId = 'PETR4') {
  return { id, side, assetId, units, cents, day, timestamp: marketDate(day) };
}

test('compra debita em centavos e gera registro completo', () => {
  const trades = executeTrade([], order('buy-1', 'buy', 10, 1200));
  const row = trades[0];
  assert.equal(row.gross, 12000);
  assert.equal(row.fees, 0);
  assert.equal(row.net, 12000);
  assert.equal(row.cashBefore, initialCash);
  assert.equal(row.cashAfter, initialCash - 12000);
  assert.deepEqual(replayPortfolio(trades).holdings.get('PETR4'), { units: 10, cost: 12000 });
});

test('compra acima do saldo, quantidades inválidas e operação duplicada não alteram o extrato', () => {
  const original = order('dup', 'buy', 10, 1500);
  const trades = executeTrade([], original);
  assert.throws(() => executeTrade(trades, original), /já foi executada/);
  assert.throws(() => executeTrade(trades, order('big', 'buy', 1000, 50000)), /insuficiente/);
  for (const amount of [0, -1, Infinity, NaN, 1.5]) {
    assert.throws(() => executeTrade(trades, order('invalid', 'buy', amount, 100)), /inválida/);
  }
  assert.equal(trades.length, 1);
});

test('venda parcial preserva custo médio ponderado e separa resultado realizado', () => {
  let trades = executeTrade([], order('b1', 'buy', 10, 1000));
  trades = executeTrade(trades, order('b2', 'buy', 10, 2000, 1));
  trades = executeTrade(trades, order('s1', 'sell', 5, 2100, 2));
  const summary = markPortfolio(trades, () => 1800);
  assert.equal(summary.positions[0].units, 15);
  assert.equal(summary.positions[0].average, 1500);
  assert.equal(summary.invested, 22500);
  assert.equal(summary.realized, 3000);
  assert.equal(summary.unrealized, 4500);
  assert.equal(summary.wealth, summary.cash + summary.marketValue);
  assert.equal(summary.wealth - initialCash, summary.realized + summary.unrealized);
});

test('rejeita venda acima da posição e venda total encerra o custo remanescente', () => {
  const trades = executeTrade([], order('b1', 'buy', 10, 1000));
  assert.throws(() => executeTrade(trades, order('s', 'sell', 11, 900)), /superior/);
  const finished = executeTrade(trades, order('s', 'sell', 10, 900));
  const summary = markPortfolio(finished, () => 900);
  assert.equal(summary.positions.length, 0);
  assert.equal(summary.invested, 0);
  assert.equal(summary.realized, -1000);
  assert.equal(summary.wealth, initialCash - 1000);
});

test('cripto aceita seis casas e arredonda frações de centavo sem gerar resíduo ao liquidar', () => {
  const asset = assetById.get('BTC');
  assert.equal(quantityUnits('0,000001', asset), 1);
  assert.throws(() => quantityUnits('0,0000001', asset));
  assert.throws(() => quantityUnits('1,2', assetById.get('PETR4')));
  let trades = executeTrade([], order('b', 'buy', 3, 500000, 0, 'BTC'));
  assert.equal(trades[0].gross, 2);
  trades = executeTrade(trades, order('s1', 'sell', 1, 500000, 0, 'BTC'));
  trades = executeTrade(trades, order('s2', 'sell', 2, 500000, 0, 'BTC'));
  assert.equal(replayPortfolio(trades).holdings.size, 0);
  assert.equal(trades[1].costSold + trades[2].costSold, trades[0].gross);
  assert.throws(() => executeTrade([], order('small', 'buy', 1, 100, 0, 'BTC')), /pelo menos/);
});

test('compra cobra taxa, incorpora ao custo e arredonda a meio centavo para cima', () => {
  const trades = executeMarketTrade([], order('compra', 'buy', 1, 1500));
  const [buy] = trades;
  assert.equal(buy.fees, 2);
  assert.equal(buy.net, 1502);
  assert.equal(buy.cashAfter, initialCash - 1502);
  assert.equal(replayPortfolio(trades).holdings.get('PETR4').cost, 1502);
  assert.equal(markPortfolio(trades, () => 1500).unrealized, -2);
  assert.throws(() => executeMarketTrade([], order('sem-taxa', 'buy', 100, 50000)), /Saldo fictício insuficiente/);
});

test('vendas parciais e integrais no mesmo dia liberam o líquido uma vez, após avançar', () => {
  let trades = executeMarketTrade([], order('compra', 'buy', 100, 49950));
  const available = trades[0].cashAfter;
  trades = executeMarketTrade(trades, order('venda-1', 'sell', 40, 49950));
  trades = executeMarketTrade(trades, order('venda-2', 'sell', 60, 49950));
  assert.equal(trades[1].cashAfter, available);
  assert.equal(trades[1].costSold, 1_999_998);
  assert.equal(trades[2].costSold, 2_999_997);
  assert.equal(saleAvailabilityDay(trades[2]), 1);
  const pending = trades[1].net + trades[2].net;
  const atSale = markPortfolio(trades, () => 49950, undefined, 0);
  assert.equal(atSale.cash, available);
  assert.equal(atSale.pendingCash, pending);
  assert.equal(atSale.wealth, initialCash - trades.reduce((total, record) => total + record.fees, 0));
  assert.equal(atSale.positions.length, 0);
  assert.throws(() => executeMarketTrade(trades, order('cedo', 'buy', 1, 49950)), /valor a receber/);
  const after = markPortfolio(trades, () => 49950, undefined, 1);
  assert.equal(after.cash, available + pending);
  assert.equal(after.pendingCash, 0);
  assert.equal(after.wealth, atSale.wealth);
  assert.equal(markPortfolio(trades, () => 49950, undefined, 2).cash, after.cash);
  const reinvested = executeMarketTrade(trades, order('reinvestir', 'buy', 1, 49950, 1));
  assert.equal(reinvested.at(-1).cashBefore, after.cash);
  assert.equal(replayPortfolio(reinvested).cash, after.cash - reinvested.at(-1).net);
});

test('risco compara concentração sobre o patrimônio, queda desde o pico e taxas', () => {
  let trades = executeMarketTrade([], order('petr', 'buy', 50, 30000));
  trades = executeMarketTrade(trades, order('vale', 'buy', 10, 30000, 0, 'VALE3'));
  const summary = markPortfolio(trades, () => 30000);
  const risk = portfolioRisk(summary, [{ value: 50000 }, { value: 52000 }, { value: 39000 }], trades);
  assert.deepEqual(risk.largestAsset, { label: 'PETR4', share: 1500000 / summary.wealth });
  assert.deepEqual(risk.largestCategory, { label: 'Ações', share: 1800000 / summary.wealth });
  assert.equal(risk.drawdown, .25);
  assert.equal(risk.fees, 1800);
});
