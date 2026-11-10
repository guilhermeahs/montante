import test from 'node:test';
import assert from 'node:assert/strict';
import { example, project } from '../js/core/financial-engine.js';

test('referência do protótipo e aportes ao fim do mês', () => {
  const result = project(example);
  assert.equal(result.balance.toFixed(2), '39924.92');
  assert.equal(result.invested, 31000);
  assert.equal(result.interest.toFixed(2), '8924.92');
  assert.equal(result.series[1].balance, 1508);
});
