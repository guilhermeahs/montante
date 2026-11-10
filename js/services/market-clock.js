import { advanceMarket, speeds } from '../core/market-engine.js';
import { transact } from './storage.js';

export function stepMarket() {
  return transact(state => ({ ...state, market: advanceMarket(state.market, Date.now()) }));
}

export function configureMarket(change) {
  return transact(state => ({ ...state, market: { ...state.market, ...change, lastWallTime: Date.now() } }));
}

export function startClock() {
  let running = false;
  window.setInterval(async () => {
    if (running || document.hidden) return;
    running = true;
    try {
      const now = Date.now();
      await transact(state => {
        const market = state.market;
        if (market.paused || (now >= market.lastWallTime && now - market.lastWallTime < speeds[market.speed])) return state;
        return { ...state, market: advanceMarket(market, now) };
      });
    } catch (error) {
      window.dispatchEvent(new CustomEvent('montante:clock-error', { detail: error }));
    } finally {
      running = false;
    }
  }, 800);
}
