import test from 'node:test';
import assert from 'node:assert/strict';
import { executeTrade, initialCash, markPortfolio, quantityUnits, replayPortfolio } from '../js/core/portfolio-engine.js';
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
