import test from 'node:test';
import assert from 'node:assert/strict';
import { annualFromMonthly, example, monthlyFromAnnual, project } from '../js/core/financial-engine.js';
import { compareModes } from '../js/data/modalidades.js';

test('referência do protótipo e aportes ao fim do mês', () => {
  const result = project(example);
  assert.equal(result.balance.toFixed(2), '39924.92');
  assert.equal(result.invested, 31000);
  assert.equal(result.interest.toFixed(2), '8924.92');
  assert.equal(result.series[1].balance, 1508);
});

test('juros simples e compostos com as mesmas premissas, sem aportes', () => {
  const result = project({ initial: 1000, contribution: 0, rate: 1, months: 12 });
  assert.equal(result.balance.toFixed(2), '1126.83');
  assert.equal(result.simple, 1120);
});

test('taxa zero, aporte no fim do mês e caso sem capital', () => {
  const zero = project({ initial: 0, contribution: 500, rate: 0, months: 600 });
  assert.equal(zero.balance, 300000);
  assert.equal(zero.interest, 0);
  assert.equal(zero.series[1].deposit, 500);
  assert.equal(zero.series[1].yield, 0);
  assert.equal(project({ initial: 0, contribution: 0, rate: 1, months: 1 }).returnPercent, null);
});

test('série mensal fecha com aportes ao fim do período', () => {
  const { series } = project(example);
  assert.equal(series.length, 61);
  for (const [index, row] of series.slice(1).entries()) {
    assert.equal(row.opening, series[index].balance);
    assert.equal(row.balance, row.opening + row.yield + row.deposit);
    assert.equal(row.invested, example.initial + row.month * example.contribution);
  }
});

test('rejeita entradas inválidas e projeções exageradas', () => {
  const changes = [{ initial: -1 }, { initial: 0.001 }, { contribution: Infinity }, { rate: NaN },
    { rate: '' }, { rate: 101 }, { months: 0 }, { months: 1.5 }, { months: 601 }, { rate: 100, months: 600 }];
  for (const change of changes) assert.throws(() => project({ ...example, ...change }), RangeError);
});

test('conversão de taxa anual e mensal é efetiva e reversível', () => {
  assert.equal(annualFromMonthly(0), 0);
  assert.equal(annualFromMonthly(1).toFixed(4), '12.6825');
  assert.ok(Math.abs(monthlyFromAnnual(annualFromMonthly(example.rate)) - example.rate) < 1e-12);
});

test('comparador usa o mesmo capital, aporte, prazo e motor', () => {
  const results = compareModes(example);
  assert.deepEqual(results.map(({ result }) => result.balance.toFixed(2)), ['36233.87', '40585.58', '41260.02']);
  for (const { rate, result } of results) {
    assert.deepEqual(result, project({ ...example, rate }));
    assert.equal(result.invested, 31000);
  }
});
