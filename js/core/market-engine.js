import { assets } from '../data/ativos.js';

export const modes = Object.freeze({
  random: { label: 'Aleatório controlado', drift: 0, variation: 1 },
  up: { label: 'Subida', drift: .008, variation: .08 },
  down: { label: 'Queda', drift: -.008, variation: .08 },
  stable: { label: 'Estabilidade', drift: 0, variation: .025 }
});
export const speeds = Object.freeze({ normal: 8000, fast: 2000 });
export const retention = 366;
export const maxPrice = 10_000_000_000;
const baseDate = Date.UTC(2026, 0, 1, 12);
const initialDays = 180;
export const marketDate = day => new Date(baseDate + day * 86400000).toISOString();

function noise(seed, day, index) {
  let hash = seed ^ Math.imul(day, 2654435761) ^ Math.imul(index + 1, 1597334677);
  hash = Math.imul(hash ^ (hash >>> 16), 2246822507);
  hash = Math.imul(hash ^ (hash >>> 13), 3266489909);
  return ((hash ^ (hash >>> 16)) >>> 0) / 2147483648 - 1;
}

function nextTick(previous, seed, scenario) {
  const day = previous.day + 1;
  const { drift, variation } = modes[scenario];
  const prices = assets.map(asset => {
    const rate = drift + noise(seed, day, asset.index) * asset.volatility * variation;
    return Math.max(1, Math.min(maxPrice, Math.round(previous.prices[asset.index] * (1 + rate))));
  });
  return { day, prices };
}

export function initialMarket(seed = 2026) {
  const ticks = [{ day: -initialDays, prices: assets.map(asset => asset.initial) }];
  for (let index = 0; index < initialDays; index++) ticks.push(nextTick(ticks.at(-1), seed, 'random'));
  return { seed, scenario: 'random', speed: 'normal', paused: true, lastWallTime: 0, ticks };
}

export function advanceMarket(market, wallTime = 0) {
  if (market.ticks.at(-1).day >= 1e6) throw new Error('Limite de dias da simulação atingido.');
  const tick = nextTick(market.ticks.at(-1), market.seed, market.scenario);
  return { ...market, lastWallTime: wallTime, ticks: [...market.ticks.slice(1 - retention), tick] };
}

export function validateMarket(value) {
  const invalid = () => new Error('Estado do mercado simulado inválido.');
  if (!value || !Number.isInteger(value.seed) || value.seed < 0 || value.seed > 0xffffffff ||
      !Object.hasOwn(modes, value.scenario) || !Object.hasOwn(speeds, value.speed) || typeof value.paused !== 'boolean' ||
      !Number.isSafeInteger(value.lastWallTime) || value.lastWallTime < 0 || !Array.isArray(value.ticks) ||
      value.ticks.length < initialDays + 1 || value.ticks.length > retention) throw invalid();
  const lastDay = value.ticks.at(-1)?.day;
  if (!Number.isInteger(lastDay) || lastDay < 0 || lastDay > 1e6 ||
      value.ticks.length !== Math.min(retention, initialDays + 1 + lastDay)) throw invalid();
  const ticks = value.ticks.map((tick, index) => {
    if (tick?.day !== lastDay - value.ticks.length + 1 + index || !Array.isArray(tick.prices) || tick.prices.length !== assets.length ||
        !tick.prices.every(price => Number.isSafeInteger(price) && price >= 1 && price <= maxPrice)) throw invalid();
    return { day: tick.day, prices: tick.prices };
  });
  return { seed: value.seed, scenario: value.scenario, speed: value.speed, paused: value.paused, lastWallTime: value.lastWallTime, ticks };
}
