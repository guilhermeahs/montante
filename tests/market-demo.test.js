import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceMarket, initialMarket, retention, validateMarket } from '../js/core/market-engine.js';
import { initialCash, portfolioHistory, replayPortfolio } from '../js/core/portfolio-engine.js';
import { parseBackup, exampleState, serializeBackup } from '../js/services/demo.js';
import { DemoMarketProvider } from '../js/services/market-provider.js';
import { emptyState, validateState } from '../js/services/storage.js';

test('semente é reproduzível e séries têm pontos para os intervalos exibidos', () => {
  const market = initialMarket();
  assert.deepEqual(market, initialMarket());
  assert.notDeepEqual(market.ticks, initialMarket(98).ticks);
  const provider = new DemoMarketProvider(market);
  assert.equal(provider.source, 'Simulado');
  assert.equal(provider.list().length, 18);
  for (const days of [1, 7, 30, 90]) assert.equal(provider.history('PETR4', days).length, days + 1);
  assert.equal(provider.history('PETR4').at(-1).value * 100 - provider.quote('PETR4').cents < 1e-8, true);
});

test('relógio e cenários afetam somente novos pontos, com preços positivos', () => {
  const state = exampleState();
  const oldHistory = state.market.ticks;
  const up = advanceMarket({ ...state.market, scenario: 'up' });
  const down = advanceMarket({ ...state.market, scenario: 'down' });
  assert.deepEqual(up.ticks.slice(0, -1), oldHistory);
  assert.equal(up.ticks.at(-1).day, oldHistory.at(-1).day + 1);
  assert.ok(up.ticks.at(-1).prices.every((price, index) => price > oldHistory.at(-1).prices[index]));
  assert.ok(down.ticks.at(-1).prices.every((price, index) => price < oldHistory.at(-1).prices[index] && price > 0));
  assert.deepEqual(validateState({ ...state, market: up }).operations, state.operations);
  assert.equal(portfolioHistory(state.operations, up.ticks).length, 3);
});

test('histórico tem retenção limitada sem apagar as operações', () => {
  const state = exampleState();
  let market = state.market;
  for (let index = 0; index < retention + 10; index++) market = advanceMarket(market);
  assert.equal(validateMarket(market).ticks.length, retention);
  assert.equal(validateState({ ...state, market }).operations.length, state.operations.length);
  assert.equal(portfolioHistory(state.operations, market.ticks).length, 90);
});

test('backup restaura favoritos, relógio, perfil, simulações e extrato auditável', () => {
  const state = exampleState();
  assert.deepEqual(parseBackup(serializeBackup(state)), state);
  const invalid = JSON.parse(serializeBackup(state));
  invalid.state.operations[0].cashAfter++;
  assert.throws(() => parseBackup(JSON.stringify(invalid)), /extrato/);
  assert.throws(() => parseBackup('{}'), /backup/);
  assert.throws(() => parseBackup('{'), /JSON/);
  assert.throws(() => parseBackup('x'.repeat(1024 * 1024 + 1)), /MiB/);
  assert.throws(() => validateState({ ...state, favorites: ['<script>'] }), /favoritos/);
});

test('exemplo é reproduzível e restauração inicial remove a carteira e o histórico', () => {
  assert.deepEqual(exampleState(), exampleState());
  assert.equal(exampleState().profile, 'example');
  const reset = validateState(emptyState());
  assert.equal(reset.profile, 'default');
  assert.equal(reset.operations.length, 0);
  assert.equal(reset.simulations.length, 0);
  assert.equal(reset.favorites.length, 0);
  assert.equal(reset.market.ticks.at(-1).day, 0);
  assert.equal(replayPortfolio(reset.operations).cash, initialCash);
});
