import { project } from '../core/financial-engine.js';
import { initialMarket, validateMarket } from '../core/market-engine.js';
import { replayPortfolio } from '../core/portfolio-engine.js';
import { projectGoal } from '../core/planning.js';
import { assetById } from '../data/ativos.js';
import { quiz } from '../data/educacao.js';

export const storageKey = 'montante.state';
export const version = 3;
export const emptyState = () => ({
  version, profile: 'default', simulations: [], market: initialMarket(), favorites: [], operations: [],
  goals: [], answers: {}, theme: 'light'
});

export function validName(value) {
  return typeof value === 'string' && value.trim() === value && value.length >= 1 && value.length <= 80;
}

export function validId(value) {
  return typeof value === 'string' && /^[a-zA-Z0-9-]{1,80}$/.test(value);
}

function projectionParams(params) {
  const { initial, contribution, rate, months } = params ?? {};
  return { initial, contribution, rate, months };
}

function validateGoals(goals) {
  if (!Array.isArray(goals) || goals.length > 100) throw new Error('Metas em formato inválido ou acima do limite de 100.');
  const ids = new Set();
  return goals.map(goal => {
    if (!validId(goal?.id) || !validName(goal.name) || ids.has(goal.id)) throw new Error('Meta salva inválida.');
    const params = projectionParams(goal.params);
    projectGoal(goal.target, params);
    ids.add(goal.id);
    return { id: goal.id, name: goal.name, target: goal.target, params };
  });
}

function validateAnswers(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Respostas do quiz inválidas.');
  const entries = Object.entries(value);
  for (const [id, choice] of entries) {
    const question = quiz.find(item => item.id === id);
    if (!question || !Number.isInteger(choice) || choice < 0 || choice >= question.options.length) throw new Error('Respostas do quiz inválidas.');
  }
  return Object.fromEntries(entries);
}

export function validateState(value) {
  if (![1, 2, version].includes(value?.version) || !Array.isArray(value.simulations) || value.simulations.length > 100) {
    throw new Error('Dados salvos em formato inválido ou versão incompatível.');
  }
  const ids = new Set();
  const simulations = value.simulations.map(entry => {
    if (!validId(entry?.id) || !validName(entry.name) || ids.has(entry.id)) throw new Error('Simulação salva inválida.');
    const params = projectionParams(entry.params);
    project(params);
    ids.add(entry.id);
    return { id: entry.id, name: entry.name, params };
  });
  if (value.version === 1) return { ...emptyState(), simulations };
  if (!['default', 'example'].includes(value.profile)) throw new Error('Perfil demonstrativo inválido.');
  const market = validateMarket(value.market);
  if (!Array.isArray(value.favorites) || new Set(value.favorites).size !== value.favorites.length ||
      !value.favorites.every(id => assetById.has(id))) throw new Error('Lista de favoritos inválida.');
  replayPortfolio(value.operations);
  const firstDay = market.ticks[0].day;
  const lastDay = market.ticks.at(-1).day;
  const operations = value.operations.map(operation => {
    const asset = assetById.get(operation.assetId);
    if (operation.day > lastDay || (operation.day >= firstDay && operation.cents !== market.ticks[operation.day - firstDay].prices[asset.index])) {
      throw new Error('Uma ordem está fora do relógio ou da cotação do mercado simulado.');
    }
    return Object.fromEntries(['id', 'side', 'assetId', 'units', 'cents', 'day', 'timestamp', 'gross',
      'fees', 'net', 'cashBefore', 'cashAfter', 'costSold', 'realized'].map(key => [key, operation[key]]));
  });
  const state = { version, profile: value.profile, simulations, market, favorites: [...value.favorites], operations };
  if (value.version === 2) return { ...state, goals: [], answers: {}, theme: 'light' };
  if (!['light', 'dark'].includes(value.theme)) throw new Error('Preferência de tema inválida.');
  return { ...state, goals: validateGoals(value.goals), answers: validateAnswers(value.answers), theme: value.theme };
}

export function createStore(getStorage) {
  function read() {
    try {
      const saved = getStorage().getItem(storageKey);
      return saved === null ? emptyState() : validateState(JSON.parse(saved));
    } catch {
      throw new Error('Não foi possível ler os dados locais. Abra Dados e demonstração para restaurar um backup ou reiniciar os dados.');
    }
  }

  function replace(next) {
    const state = validateState(next);
    try {
      getStorage().setItem(storageKey, JSON.stringify(state));
    } catch {
      throw new Error('Não foi possível gravar no navegador. Confira o espaço disponível e as permissões de armazenamento.');
    }
    return state;
  }

  function update(change) {
    const current = read();
    const next = change(current);
    return next === current ? current : replace(next);
  }

  return { read, update, replace };
}

export const store = createStore(() => window.localStorage);

function exclusively(action) {
  return window.navigator.locks ? window.navigator.locks.request(storageKey, action) : action();
}

export function transact(change) {
  return exclusively(() => {
    let changed = false;
    const state = store.update(current => {
      const next = change(current);
      changed = next !== current;
      return next;
    });
    if (changed) window.dispatchEvent(new CustomEvent('montante:state', { detail: state }));
    return state;
  });
}

export function replaceState(value) {
  return exclusively(() => {
    const state = store.replace(value);
    window.dispatchEvent(new CustomEvent('montante:state', { detail: state }));
    return state;
  });
}

export function observeState(callback, onError) {
  function local(event) { callback(event.detail); }
  function otherTab(event) {
    if (event.key !== storageKey) return;
    try { callback(store.read()); } catch (error) { onError?.(error); }
  }
  window.addEventListener('montante:state', local);
  window.addEventListener('storage', otherTab);
  return () => {
    window.removeEventListener('montante:state', local);
    window.removeEventListener('storage', otherTab);
  };
}
