import { example } from '../core/financial-engine.js';
import { advanceMarket } from '../core/market-engine.js';
import { executeTrade } from '../core/portfolio-engine.js';
import { DemoMarketProvider } from './market-provider.js';
import { emptyState, validateState } from './storage.js';

export const maximumBackupSize = 1024 * 1024;
const backupKind = 'montante-backup';

export function exampleState() {
  const state = emptyState();
  const first = new DemoMarketProvider(state.market);
  function order(id, assetId, units, provider) {
    const quote = provider.quote(assetId);
    return { id, side: 'buy', assetId, units, cents: quote.cents, day: quote.day, timestamp: quote.timestamp };
  }
  const initialOrders = executeTrade([], order('demo-petr4', 'PETR4', 35, first));
  const market = advanceMarket(state.market);
  const operations = executeTrade(initialOrders, order('demo-bova11', 'BOVA11', 10, new DemoMarketProvider(market)));
  return {
    ...state, profile: 'example', market, operations,
    favorites: ['PETR4', 'BOVA11'],
    simulations: [{ id: 'demo-simulacao', name: 'Projeção em cinco anos', params: example }]
  };
}

export function serializeBackup(state) {
  return JSON.stringify({ kind: backupKind, state: validateState(state) }, null, 2);
}

export function parseBackup(text) {
  if (typeof text !== 'string' || new TextEncoder().encode(text).byteLength > maximumBackupSize) {
    throw new Error('O backup excede 1 MiB.');
  }
  let value;
  try { value = JSON.parse(text); } catch { throw new Error('O arquivo não contém JSON válido.'); }
  if (value?.kind !== backupKind) throw new Error('Selecione um backup exportado pelo Montante.');
  return validateState(value.state);
}
