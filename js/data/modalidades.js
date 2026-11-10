import { monthlyFromAnnual, project } from '../core/financial-engine.js';

export const rateReferenceDate = '10/11/2026';
const monthlyReference = annual => Number(monthlyFromAnnual(annual).toFixed(12));

export const modes = Object.freeze([
  { id: 'poupanca', label: 'Poupança', rate: 0.5936, color: '#b4b2a4', line: 'var(--chart-neutral)',
    description: 'Referência do aniversário em 10/11, para o período de 10/10 a 10/11. A taxa anual é o equivalente se esse rendimento mensal se repetisse.',
    source: 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.195/dados?formato=json&dataInicial=10/10/2026&dataFinal=10/10/2026' },
  { id: 'cdb', label: 'CDB', rate: monthlyReference(13.65), color: '#08785e', line: 'var(--chart-green)',
    description: 'Exemplo de CDB a 100% do CDI, com o dado de 09/11, último disponível na consulta. A taxa varia conforme o CDB.',
    source: 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.4389/dados?formato=json&dataInicial=09/11/2026&dataFinal=10/11/2026' },
  { id: 'selic', label: 'Tesouro Selic', rate: monthlyReference(13.75), color: '#1bbd93', line: 'var(--chart-blue)',
    description: 'Projeção baseada na meta Selic vigente. A taxa efetiva do título depende das condições de compra e da evolução da Selic.',
    source: 'https://www.bcb.gov.br/publicacoes/atascopom/04112026' }
]);

export const defaultRates = Object.freeze(Object.fromEntries(modes.map(mode => [mode.id, mode.rate])));

export function compareModes(base, rates = defaultRates) {
  return modes.map(mode => ({ ...mode, rate: rates[mode.id], result: project({ ...base, rate: rates[mode.id] }) }));
}
