import test from 'node:test';
import assert from 'node:assert/strict';
import { example, project } from '../js/core/financial-engine.js';
import { projectGoal, projectScenario } from '../js/core/planning.js';
import { exampleState, parseBackup, serializeBackup } from '../js/services/demo.js';
import { validateState } from '../js/services/storage.js';

test('meta usa o menor aporte em centavos que alcança o alvo', () => {
  const params = { ...example, months: 3, rate: 0, initial: 0, contribution: 0 };
  assert.equal(projectGoal(100, params).required, 33.34);
  const planned = projectGoal(40000, example);
  assert.equal(planned.balance.toFixed(2), '39924.92');
  assert.ok(project({ ...example, contribution: planned.required }).balance >= 40000);
  assert.ok(project({ ...example, contribution: Number((planned.required - .01).toFixed(2)) }).balance < 40000);
  assert.equal(projectGoal(500, example).required, 0);
});

test('cenário calcula efeito de aporte e desconta inflação pelo prazo efetivo', () => {
  const params = { ...example, months: 12 };
  const { real, result, extra } = projectScenario(params, 10);
  assert.ok(Math.abs(real * 1.10 - result.balance) < 1e-9);
  assert.ok(Math.abs(project({ ...params, contribution: 600 }).balance - result.balance - extra) < 1e-9);
  assert.equal(projectScenario({ ...params, rate: 0 }, 0).extra, 1200);
  assert.throws(() => projectScenario(params, Infinity));
  assert.throws(() => projectGoal(0, params));
  assert.equal(projectScenario({ initial: 0, contribution: 0, rate: 100, months: 600 }, 0).extra, null);
  assert.equal(projectGoal(500, { initial: 0, contribution: 0, rate: 100, months: 600 }).required, null);
});

test('v2 migra carteira e favoritos; backup v3 preserva metas, tema e quiz', () => {
  const original = exampleState();
  const { goals, answers, theme, ...v2 } = original;
  const migrated = validateState({ ...v2, version: 2 });
  assert.deepEqual(migrated.operations, original.operations);
  assert.deepEqual(migrated.favorites, original.favorites);
  assert.deepEqual(migrated.goals, []);
  assert.deepEqual(migrated.answers, {});
  assert.equal(migrated.theme, 'light');
  const saved = { ...original, answers: { juros: 1 }, theme: 'dark' };
  assert.deepEqual(parseBackup(serializeBackup(saved)), saved);
  assert.throws(() => validateState({ ...saved, goals: [goals[0], goals[0]] }), /Meta/);
  assert.throws(() => validateState({ ...saved, goals: [{ ...goals[0], target: -1 }] }), /valor-alvo/);
  assert.throws(() => validateState({ ...saved, answers: { juros: 5 } }), /quiz/);
  assert.throws(() => validateState({ ...saved, theme: 'solar' }), /tema/);
});
