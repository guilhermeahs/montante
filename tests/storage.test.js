import test from 'node:test';
import assert from 'node:assert/strict';
import { example } from '../js/core/financial-engine.js';
import { createStore, storageKey, validateState } from '../js/services/storage.js';
import { toCSV } from '../js/services/export.js';

const record = { id: 'reserva-1', name: 'Reserva', params: example };

test('salva, restaura e atualiza simulações com identificadores estáveis', () => {
  const disk = new Map();
  const open = () => createStore(() => ({ getItem: key => disk.get(key) ?? null, setItem: (key, value) => disk.set(key, value) }));
  assert.deepEqual(open().read().simulations, []);
  open().update(state => ({ ...state, simulations: [record] }));
  assert.deepEqual(open().read().simulations, [record]);
  open().update(state => ({ ...state, simulations: [{ ...state.simulations[0], name: 'Viagem' }] }));
  assert.equal(open().read().simulations[0].name, 'Viagem');
  open().update(state => ({ ...state, simulations: [] }));
  assert.deepEqual(open().read().simulations, []);
});

test('rejeita versões, identificadores, valores e duplicidades inválidas', () => {
  for (const state of [{ version: 2, simulations: [] }, { version: 1, simulations: [record, record] },
    { version: 1, simulations: [{ ...record, id: '<script>' }] },
    { version: 1, simulations: [{ ...record, params: { ...example, months: 0 } }] }]) {
    assert.throws(() => validateState(state));
  }
});

test('falha de gravação mantém o valor anterior', () => {
  const saved = JSON.stringify({ version: 1, simulations: [record] });
  const store = createStore(() => ({
    getItem(key) { assert.equal(key, storageKey); return saved; },
    setItem() { throw new Error('Cota'); }
  }));
  assert.throws(() => store.update(state => ({ ...state, simulations: [] })), /Não foi possível gravar/);
  assert.deepEqual(store.read().simulations, [record]);
});

test('CSV usa decimal brasileiro, escape de aspas e neutraliza fórmulas em textos', () => {
  assert.equal(toCSV([['Campo', 'Valor'], ['=1+1', 1.23], ['a"b', -2]]), '\uFEFF"Campo";"Valor"\r\n"\'=1+1";1,23\r\n"a""b";-2');
});
