import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceChallenge, challengeView, createChallenge, historicalEvents, tradeChallenge, validateChallenge } from '../js/core/challenges.js';
import { exampleState, parseBackup, serializeBackup } from '../js/services/demo.js';
import { validateState } from '../js/services/storage.js';

const make = options => createChallenge({ id: 'test-run', allocation: 50, seed: 42, ...options });
function finish(run) {
  while (!challengeView(run).finished) run = advanceChallenge(run);
  return run;
}

test('rodada surpresa tem prefixo revelado, sem episódio e sem data real antes do resultado', () => {
  let run = make();
  const start = challengeView(run);
  assert.deepEqual(start.revealed, [{ cents: 10000 }]);
  assert.equal(start.result, undefined);
  for (let day = 1; day <= 20; day++) {
    run = advanceChallenge(run);
    const view = challengeView(run);
    assert.equal(view.revealed.length, day + 1);
    assert.equal(Boolean(view.result), day === 20);
    assert.ok(view.revealed.every(point => point.cents > 0 && point.date === undefined));
  }
  assert.equal(advanceChallenge(run), run);
  assert.deepEqual(challengeView(run), challengeView(finish(make())));
});

test('sementes produzem altas, quedas e rodadas sem choque em momentos variados', () => {
  const seen = new Set();
  const firstShock = new Set();
  for (let seed = 1; seed <= 80; seed++) {
    const { revealed, result } = challengeView(finish(make({ seed })));
    seen.add(result.hasShock ? Math.sign(result.marketChange) : 0);
    const day = revealed.findIndex((point, index) => index > 0 && Math.abs(point.cents / revealed[index - 1].cents - 1) > .025);
    if (day !== -1) firstShock.add(day);
  }
  assert.deepEqual(seen, new Set([-1, 0, 1]));
  assert.ok(firstShock.size >= 3);
});

test('replays conservam as datas, os quatro dígitos da PTAX e o resultado de manter a posição', () => {
  for (const [episode, count, first, last, change] of [
    ['dolar-marco', 23, 44987, 51987, '15.56'],
    ['dolar-novembro', 21, 57718, 53317, '-7.63']
  ]) {
    const run = make({ episode });
    const view = challengeView(run);
    const units = Math.floor(500000 / first);
    assert.equal(view.revealed[0].cents, first);
    assert.equal(view.portfolio.positions[0].units, units);
    assert.equal(view.portfolio.cash, 1000000 - units * first);
    const completed = challengeView(finish(run));
    assert.equal(completed.revealed.length, count);
    assert.equal(completed.revealed.at(-1).cents, last);
    assert.deepEqual(completed.revealed.map(point => point.date), historicalEvents.get(episode).rows.map(([date]) => date));
    assert.equal((completed.result.marketChange * 100).toFixed(2), change);
    assert.equal(completed.result.hold, 1000000 + units * (last - first));
    assert.equal(completed.portfolio.wealth, completed.result.hold);
  }
});

test('ordens válidas atualizam só a rodada; rejeita futuro, alteração de preço e negociação após o fim', () => {
  const start = make();
  const buy = tradeChallenge(start, { id: 'buy', side: 'buy', units: 2 });
  assert.equal(challengeView(buy).portfolio.cash, 480000);
  assert.equal(challengeView(buy).portfolio.positions[0].units, 52);
  assert.throws(() => tradeChallenge(buy, { id: 'buy', side: 'buy', units: 1 }), /já foi executada/);
  assert.throws(() => tradeChallenge(buy, { id: 'excesso', side: 'sell', units: 53 }), /superior/);
  const next = advanceChallenge(buy);
  const sold = tradeChallenge(next, { id: 'sell', side: 'sell', units: 52 });
  assert.equal(challengeView(sold).portfolio.positions.length, 0);
  const { result, portfolio } = challengeView(finish(sold));
  assert.equal(portfolio.wealth, challengeView(sold).portfolio.cash);
  assert.equal(result.cash, 1000000);
  assert.ok(result.drawdown >= 0 && result.drawdown < 1);
  assert.throws(() => validateChallenge({ ...sold, day: 0 }), /cotação revelada/);
  assert.throws(() => validateChallenge({ ...sold, orders: [{ ...sold.orders[0], cents: 42 }] }), /cotação revelada/);
  assert.throws(() => tradeChallenge(finish(sold), { id: 'final', side: 'buy', units: 1 }), /terminou/);
});

test('backup da rodada preserva semente, posição, operações e a carteira do Mercado simulado', () => {
  const existing = exampleState();
  const { challenge, ...legacy } = existing;
  const migrated = validateState({ ...legacy, version: 3 });
  assert.equal(migrated.challenge, null);
  assert.deepEqual(migrated.operations, existing.operations);
  const run = tradeChallenge(advanceChallenge(make({ allocation: 75 })), { id: 'sell-one', side: 'sell', units: 1 });
  assert.deepEqual(validateState({ ...migrated, version: 4, challenge: run }).challenge, run);
  const restored = parseBackup(serializeBackup({ ...migrated, challenge: run }));
  assert.deepEqual(restored.challenge, run);
  assert.deepEqual(restored.operations, existing.operations);
  assert.deepEqual(challengeView(restored.challenge), challengeView(run));
});
