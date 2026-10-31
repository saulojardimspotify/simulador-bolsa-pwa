import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  TITULOS, normalizarNome, nomePermitido, inserirNoRanking, topN, removerEntrada,
  CHAVE_RANKING, carregarRanking, salvarRanking, dataHoje,
} from '../js/ranking.js';

function storageFalso(inicial = {}) {
  const m = new Map(Object.entries(inicial));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), m };
}

const entrada = (retornoPct, acertos, timestamp, nome = 'Ana') =>
  ({ titulo: 'Mestre', nome, retornoPct, acertos, timestamp });

test('TITULOS', () => {
  assert.deepEqual(TITULOS, ['Mestre', 'Investidor(a)', 'Administrador(a)', 'Dr(a).', 'Chefe', 'CEO', 'Magnata', 'Professor(a)']);
});

test('normalizarNome tira espaços extras', () => {
  assert.equal(normalizarNome('  José   Maria '), 'José Maria');
});

test('normalizarNome põe a primeira letra de cada nome em maiúscula', () => {
  assert.equal(normalizarNome('  ana  júlia '), 'Ana Júlia');
  assert.equal(normalizarNome('ÉRICA'), 'Érica');
});

test('nomePermitido: aceita letras com acento', () => {
  assert.deepEqual(nomePermitido('José'), { ok: true });
  assert.deepEqual(nomePermitido('  Ana  Júlia '), { ok: true });
});

test('nomePermitido: recusa formato inválido', () => {
  assert.deepEqual(nomePermitido('Ana123'), { ok: false, motivo: 'formato' });
  assert.deepEqual(nomePermitido('Maximilianoss'), { ok: false, motivo: 'formato' });
  assert.deepEqual(nomePermitido(''), { ok: false, motivo: 'formato' });
  assert.deepEqual(nomePermitido('   '), { ok: false, motivo: 'formato' });
});

test('nomePermitido: recusa palavrão, inclusive disfarçado', () => {
  assert.deepEqual(nomePermitido('Merda'), { ok: false, motivo: 'palavrao' });
  assert.deepEqual(nomePermitido('M E R D A'), { ok: false, motivo: 'palavrao' });
  // a checagem de leetspeak roda antes da regex de formato
  assert.deepEqual(nomePermitido('p0rr4'), { ok: false, motivo: 'palavrao' });
  assert.deepEqual(nomePermitido('Cu'), { ok: false, motivo: 'palavrao' });
});

test('nomePermitido: não bloqueia nomes comuns parecidos', () => {
  for (const n of ['Cunha', 'Pinto', 'Rafael', 'Bianca', 'Escudero', 'Paula']) {
    assert.deepEqual(nomePermitido(n), { ok: true }, n);
  }
});

test('inserirNoRanking ordena por acertos, depois retorno e tempo', () => {
  let { lista } = inserirNoRanking([], entrada(8.2, 9, 1));
  ({ lista } = inserirNoRanking(lista, entrada(-2.4, 12, 2)));
  const r = inserirNoRanking(lista, entrada(4.3, 12, 3));
  // 12 acertos vencem 9, mesmo com retorno menor; no empate de acertos, vence o maior retorno
  assert.deepEqual(r.lista.map((e) => e.timestamp), [3, 2, 1]);
  assert.equal(r.posicao, 1);
  const empate = inserirNoRanking([entrada(7, 2, 10)], entrada(7, 2, 20));
  assert.deepEqual(empate.lista.map((e) => e.timestamp), [10, 20]);
  assert.equal(empate.posicao, 2);
});

test('inserirNoRanking informa posição fora do top 10', () => {
  const lista = Array.from({ length: 15 }, (_, i) => entrada(50 - i, 0, i));
  const r = inserirNoRanking(lista, entrada(-3, 0, 99));
  assert.equal(r.posicao, 16);
  assert.equal(topN(r.lista).length, 10);
  assert.equal(topN(r.lista, 3)[0].retornoPct, 50);
});

test('removerEntrada', () => {
  const l = removerEntrada([entrada(1, 0, 1), entrada(2, 0, 2)], 1);
  assert.deepEqual(l.map((e) => e.timestamp), [2]);
});

test('carregarRanking e salvarRanking do mesmo dia', () => {
  const s = storageFalso();
  assert.equal(salvarRanking(s, '2026-10-31', [entrada(1, 0, 1)]), true);
  assert.equal(carregarRanking(s, '2026-10-31').length, 1);
  assert.ok(s.m.has(CHAVE_RANKING));
});

test('carregarRanking reordena por acertos um ranking salvo na ordem antiga', () => {
  const salvo = { data: '2026-10-31', entradas: [entrada(8.2, 9, 1), entrada(-2.4, 12, 2)] };
  const s = storageFalso({ [CHAVE_RANKING]: JSON.stringify(salvo) });
  assert.deepEqual(carregarRanking(s, '2026-10-31').map((e) => e.timestamp), [2, 1]);
});

test('carregarRanking descarta outro dia e dados ruins', () => {
  const ontem = storageFalso({ [CHAVE_RANKING]: JSON.stringify({ data: '2026-10-30', entradas: [entrada(1, 0, 1)] }) });
  assert.deepEqual(carregarRanking(ontem, '2026-10-31'), []);
  assert.deepEqual(carregarRanking(storageFalso({ [CHAVE_RANKING]: '{lixo' }), '2026-10-31'), []);
  assert.deepEqual(carregarRanking(storageFalso({ [CHAVE_RANKING]: '{"data":"2026-10-31"}' }), '2026-10-31'), []);
  assert.deepEqual(carregarRanking({ getItem: () => { throw new Error('bloqueado'); } }, '2026-10-31'), []);
  assert.deepEqual(carregarRanking(null, '2026-10-31'), []);
});

test('salvarRanking devolve false quando o storage falha', () => {
  assert.equal(salvarRanking({ setItem: () => { throw new Error('cheio'); } }, '2026-10-31', []), false);
  assert.equal(salvarRanking(null, '2026-10-31', []), false);
});

test('dataHoje usa a data local', () => {
  assert.equal(dataHoje(new Date(2026, 9, 31, 23, 59)), '2026-10-31');
  assert.equal(dataHoje(new Date(2026, 0, 5)), '2026-01-05');
});
