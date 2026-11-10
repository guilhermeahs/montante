import { advanceMarket, speeds } from '../core/market-engine.js';
import { transact } from './storage.js';

const clockLock = 'montante.market-clock';
let localHolds = 0;

export async function holdMarketClock() {
  if (navigator.locks) {
    return new Promise((ready, reject) => {
      navigator.locks.request(clockLock, { mode: 'shared' }, () => new Promise(release => ready(release))).catch(reject);
    });
  }
  localHolds++;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    localHolds--;
  };
}

export function stepMarket() {
  return transact(state => ({ ...state, market: advanceMarket(state.market, Date.now()) }));
}

export function configureMarket(change) {
  return transact(state => ({ ...state, market: { ...state.market, ...change, lastWallTime: Date.now() } }));
}

function advanceAutomatically() {
  const now = Date.now();
  return transact(state => {
    const market = state.market;
    if (market.paused || (now >= market.lastWallTime && now - market.lastWallTime < speeds[market.speed])) return state;
    return { ...state, market: advanceMarket(market, now) };
  });
}

export function startClock() {
  let running = false;
  window.setInterval(async () => {
    if (running || document.hidden || localHolds) return;
    running = true;
    try {
      if (navigator.locks) {
        await navigator.locks.request(clockLock, { ifAvailable: true }, lock => lock ? advanceAutomatically() : undefined);
      } else {
        await advanceAutomatically();
      }
    } catch (error) {
      window.dispatchEvent(new CustomEvent('montante:clock-error', { detail: error }));
    } finally {
      running = false;
    }
  }, 800);
}
