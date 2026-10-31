import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PADRAO_SOM, CHAVE_SOM, carregarPreferenciasSom, salvarPreferenciasSom } from '../js/preferencias-som.js';

function storageFalso(inicial = {}) {
  const m = new Map(Object.entries(inicial));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), m };
}

test('preferências de som: padrão com efeitos ligados e música desligada', () => {
  assert.deepEqual(PADRAO_SOM, { mudo: false, volume: 0.7, musica: false });
  assert.deepEqual(carregarPreferenciasSom(storageFalso()), PADRAO_SOM);
  assert.deepEqual(carregarPreferenciasSom(null), PADRAO_SOM);
});

test('preferências de som: salvas e carregadas de volta', () => {
  const s = storageFalso();
  salvarPreferenciasSom(s, { mudo: true, volume: 0.3, musica: true });
  assert.deepEqual(carregarPreferenciasSom(s), { mudo: true, volume: 0.3, musica: true });
});

test('preferências de som: dados ruins viram o padrão, campo a campo', () => {
  assert.deepEqual(carregarPreferenciasSom(storageFalso({ [CHAVE_SOM]: '{lixo' })), PADRAO_SOM);
  assert.deepEqual(
    carregarPreferenciasSom(storageFalso({ [CHAVE_SOM]: '{"volume": 7, "mudo": "sim"}' })),
    { mudo: false, volume: 1, musica: false },
  );
  assert.deepEqual(
    carregarPreferenciasSom(storageFalso({ [CHAVE_SOM]: '{"volume": -1}' })),
    { mudo: false, volume: 0, musica: false },
  );
  assert.deepEqual(carregarPreferenciasSom({ getItem: () => { throw new Error('bloqueado'); } }), PADRAO_SOM);
});

test('preferências de som: falha ao salvar não quebra', () => {
  assert.equal(salvarPreferenciasSom({ setItem: () => { throw new Error('cheio'); } }, PADRAO_SOM), false);
  assert.equal(salvarPreferenciasSom(null, PADRAO_SOM), false);
});
