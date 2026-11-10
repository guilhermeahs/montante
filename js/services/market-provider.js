import { assetById, assets } from '../data/ativos.js';
import { marketDate } from '../core/market-engine.js';

export class DemoMarketProvider {
  source = 'Simulado';

  constructor(market) {
    this.market = market;
  }

  list() { return assets; }
  metadata(id) { return assetById.get(id); }
  timestamp() { return marketDate(this.market.ticks.at(-1).day); }

  quote(id) {
    const asset = this.metadata(id);
    if (!asset) throw new Error('Ativo inválido.');
    const tick = this.market.ticks.at(-1);
    const cents = tick.prices[asset.index];
    const previous = this.market.ticks.at(-2).prices[asset.index];
    return { id, cents, day: tick.day, timestamp: marketDate(tick.day), difference: cents - previous, changePercent: (cents - previous) / previous * 100 };
  }

  history(id, days) {
    const asset = this.metadata(id);
    if (!asset) throw new Error('Ativo inválido.');
    return (days === undefined ? this.market.ticks : this.market.ticks.slice(-(days + 1)))
      .map(tick => ({ day: tick.day, timestamp: marketDate(tick.day), value: tick.prices[asset.index] / 100 }));
  }
}
