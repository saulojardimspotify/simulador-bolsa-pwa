import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  semAcento, filtrarAcoes, alternarSelecao, PERCENTUAIS_PADRAO,
  ajustarPercentual, statusDistribuicao, criarCarteira,
} from '../js/carteira.js';

const acoes = [
  { ticker: 'ITUB4', nome: 'Itaú Unibanco', setor: 'Bancos e Finanças', porte: 'Grande', bonsDividendos: true, preco: 10 },
  { ticker: 'PETR4', nome: 'Petrobras', setor: 'Petróleo e Gás', porte: 'Grande', bonsDividendos: true, preco: 20 },
  { ticker: 'RDOR3', nome: "Rede D'Or", setor: 'Saúde', porte: 'Grande', bonsDividendos: false, preco: 40 },
  { ticker: 'HAPV3', nome: 'Hapvida', setor: 'Saúde', porte: 'Média', bonsDividendos: false, preco: 4 },
];

test('semAcento', () => {
  assert.equal(semAcento('Itaú ÇÃO'), 'itau cao');
});

test('filtrarAcoes: busca sem acento e por ticker', () => {
  assert.deepEqual(filtrarAcoes(acoes, { busca: 'itau' }).map((a) => a.ticker), ['ITUB4']);
  assert.deepEqual(filtrarAcoes(acoes, { busca: 'PETR' }).map((a) => a.ticker), ['PETR4']);
  assert.deepEqual(filtrarAcoes(acoes, { busca: '  petr4 ' }).map((a) => a.ticker), ['PETR4']);
});

test('filtrarAcoes: filtros combinam com E', () => {
  const r = filtrarAcoes(acoes, { setores: ['Saúde'], portes: ['Grande'] });
  assert.deepEqual(r.map((a) => a.ticker), ['RDOR3']);
});

test('filtrarAcoes: só dividendos', () => {
  const r = filtrarAcoes(acoes, { soDividendos: true });
  assert.deepEqual(r.map((a) => a.ticker), ['ITUB4', 'PETR4']);
});

test('filtrarAcoes: sem filtros devolve tudo; sem resultado devolve vazio', () => {
  assert.equal(filtrarAcoes(acoes, {}).length, 4);
  assert.deepEqual(filtrarAcoes(acoes, { setores: ['Saúde'], soDividendos: true }), []);
});

test('alternarSelecao: no máximo 3 e remove se já escolhida', () => {
  assert.deepEqual(alternarSelecao(['A', 'B', 'C'], 'D'), ['A', 'B', 'C']);
  assert.deepEqual(alternarSelecao(['A', 'B'], 'A'), ['B']);
  assert.deepEqual(alternarSelecao(['A'], 'B'), ['A', 'B']);
});

test('ajustarPercentual: respeita 0 e 100', () => {
  assert.deepEqual(PERCENTUAIS_PADRAO, [40, 30, 30]);
  assert.deepEqual(ajustarPercentual([100, 0, 0], 0, 10), [100, 0, 0]);
  assert.deepEqual(ajustarPercentual([0, 50, 50], 0, -10), [0, 50, 50]);
  let p = [40, 30, 30];
  for (let i = 0; i < 10; i++) p = ajustarPercentual(p, 1, 10);
  assert.deepEqual(p, [40, 100, 30]);
});

test('statusDistribuicao', () => {
  assert.deepEqual(statusDistribuicao([40, 30, 40]), { total: 110, falta: -10 });
  assert.deepEqual(statusDistribuicao([40, 30, 20]), { total: 90, falta: 10 });
});

test('criarCarteira: quantidades pelo percentual', () => {
  const c = criarCarteira(acoes.slice(0, 3), [40, 30, 30]);
  assert.equal(c.valorInicial, 10000);
  assert.deepEqual(c.posicoes.map((p) => p.quantidade), [400, 150, 75]);
  assert.deepEqual(c.posicoes.map((p) => p.preco), [10, 20, 40]);
  assert.deepEqual(c.posicoes.map((p) => p.percentual), [40, 30, 30]);
});

test('criarCarteira: total diferente de 100 lança', () => {
  assert.throws(() => criarCarteira(acoes.slice(0, 3), [40, 30, 20]), /Total deve ser 100%/);
});
