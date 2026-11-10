import { project } from '../core/financial-engine.js';

export const storageKey = 'montante.state';
export const version = 1;
export const emptyState = () => ({ version, simulations: [] });

export function validName(value) {
  return typeof value === 'string' && value.trim() === value && value.length >= 1 && value.length <= 80;
}

export function validId(value) {
  return typeof value === 'string' && /^[a-zA-Z0-9-]{1,80}$/.test(value);
}

export function validateState(value) {
  if (value?.version !== version || !Array.isArray(value.simulations) || value.simulations.length > 100) {
    throw new Error('Dados salvos em formato inválido ou versão incompatível.');
  }
  const ids = new Set();
  const simulations = value.simulations.map(entry => {
    if (!validId(entry?.id) || !validName(entry.name) || ids.has(entry.id)) throw new Error('Simulação salva inválida.');
    const { initial, contribution, rate, months } = entry.params ?? {};
    project({ initial, contribution, rate, months });
    ids.add(entry.id);
    return { id: entry.id, name: entry.name, params: { initial, contribution, rate, months } };
  });
  return { version, simulations };
}

export function createStore(getStorage) {
  function read() {
    const saved = getStorage().getItem(storageKey);
    return saved === null ? emptyState() : validateState(JSON.parse(saved));
  }

  function update(change) {
    const state = validateState(change(read()));
    try {
      getStorage().setItem(storageKey, JSON.stringify(state));
    } catch {
      throw new Error('Não foi possível gravar no navegador. Confira o espaço disponível e as permissões de armazenamento.');
    }
    return state;
  }

  return { read, update };
}

export const store = createStore(() => window.localStorage);
