import { project } from '../core/financial-engine.js';

export const modes = Object.freeze([
  { id: 'poupanca', label: 'Poupança', rate: 0.5, color: '#b4b2a4', line: '#656357', description: 'Uma forma simples de guardar dinheiro. No exemplo, o rendimento segue uma taxa mensal constante.' },
  { id: 'cdb', label: 'CDB', rate: 0.85, color: '#08785e', line: '#08785e', description: 'Título emitido por bancos. As condições de remuneração e de resgate variam conforme o produto.' },
  { id: 'selic', label: 'Tesouro Selic', rate: 0.9, color: '#1bbd93', line: '#1a5d99', description: 'Título público associado à Selic. O comparador aplica uma taxa constante apenas para fins educativos.' }
]);

export const defaultRates = Object.freeze(Object.fromEntries(modes.map(mode => [mode.id, mode.rate])));

export function compareModes(base, rates = defaultRates) {
  return modes.map(mode => ({ ...mode, rate: rates[mode.id], result: project({ ...base, rate: rates[mode.id] }) }));
}
