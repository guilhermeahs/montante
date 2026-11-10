import { example, project, projectionLimit } from './financial-engine.js';

export const scenarios = Object.freeze([
  { id: 'conservador', label: 'Conservador', color: 'var(--chart-blue)', params: { ...example, rate: 0.5 } },
  { id: 'moderado', label: 'Moderado', color: 'var(--chart-green)', params: { ...example } },
  { id: 'otimista', label: 'Otimista', color: 'var(--chart-purple)', params: { ...example, rate: 1.1 } }
]);

function contributionFactor(params) {
  const i = params.rate / 100;
  return i === 0 ? params.months : Math.expm1(params.months * Math.log1p(i)) / i;
}

export function projectGoal(target, params) {
  if (!Number.isFinite(target) || target < 0.01 || target > 1e8 || Number(target.toFixed(2)) !== target) {
    throw new RangeError('Informe um valor-alvo entre R$ 0,01 e R$ 100 milhões, com até duas casas decimais.');
  }
  const result = project(params);
  const opening = project({ ...params, contribution: 0 }).balance;
  const factor = contributionFactor(params);
  const raw = Math.max(0, (target - opening) / factor);
  let requiredCents = Math.ceil(raw * 100);
  if (requiredCents > 0 && opening + (requiredCents - 1) / 100 * factor >= target) requiredCents--;
  if (opening + requiredCents / 100 * factor < target) requiredCents++;
  const required = opening + requiredCents / 100 * factor > projectionLimit ? null : requiredCents / 100;
  return { target, balance: result.balance, reach: result.balance / target * 100, gap: result.balance - target, required };
}

export function projectScenario(params, inflation) {
  if (!Number.isFinite(inflation) || inflation < 0 || inflation > 100) {
    throw new RangeError('Informe uma inflação ilustrativa anual entre 0% e 100%.');
  }
  const result = project(params);
  const change = 100 * contributionFactor(params);
  const extra = result.balance + change > projectionLimit ? null : change;
  const real = result.balance / Math.exp(params.months / 12 * Math.log1p(inflation / 100));
  return { result, extra, real };
}
