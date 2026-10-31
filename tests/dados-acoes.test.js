import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SETORES } from '../js/setores.js';

const dados = JSON.parse(readFileSync(new URL('../data/acoes.json', import.meta.url), 'utf8'));

test('acoes.json: data de referência', () => {
  assert.match(dados.dataReferencia, /^\d{4}-\d{2}-\d{2}$/);
});

test('acoes.json: entre 70 e 100 ações com tickers únicos', () => {
  assert.ok(dados.acoes.length >= 70 && dados.acoes.length <= 100, `${dados.acoes.length} ações`);
  const tickers = dados.acoes.map((a) => a.ticker);
  assert.equal(new Set(tickers).size, tickers.length);
  for (const t of tickers) assert.match(t, /^[A-Z0-9]{4}\d{1,2}$/);
});

test('acoes.json: campos válidos', () => {
  for (const a of dados.acoes) {
    assert.ok(a.nome && a.nome.length <= 24, `${a.ticker} nome`);
    assert.ok(SETORES.includes(a.setor), `${a.ticker} setor ${a.setor}`);
    assert.ok(['Grande', 'Média', 'Pequena'].includes(a.porte), `${a.ticker} porte`);
    assert.equal(typeof a.bonsDividendos, 'boolean', `${a.ticker} dividendos`);
    assert.ok(typeof a.preco === 'number' && a.preco > 0, `${a.ticker} preço ${a.preco}`);
  }
});

test('acoes.json: todo setor tem pelo menos 2 ações', () => {
  for (const s of SETORES) {
    const n = dados.acoes.filter((a) => a.setor === s).length;
    assert.ok(n >= 2, `${s}: ${n}`);
  }
});
