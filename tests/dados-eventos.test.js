import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sortearEventos, eventoAfetaCarteira } from '../js/motor.js';

const ler = (arq) => JSON.parse(readFileSync(new URL(`../data/${arq}`, import.meta.url), 'utf8'));
const eventos = ler('eventos.json');
const acoes = ler('acoes.json').acoes;
const tickers = new Set(acoes.map((a) => a.ticker));

test('eventos.json: 50 eventos com ids únicos em kebab-case', () => {
  assert.equal(eventos.length, 50);
  const ids = eventos.map((e) => e.id);
  assert.equal(new Set(ids).size, 50);
  for (const id of ids) assert.match(id, /^[a-z0-9]+(-[a-z0-9]+)*$/);
});

test('eventos.json: textos no tamanho certo', () => {
  for (const e of eventos) {
    assert.ok(e.manchete.length <= 90, `${e.id} manchete ${e.manchete.length}`);
    assert.ok(e.explicacao.length >= 120 && e.explicacao.length <= 600, `${e.id} explicação ${e.explicacao.length}`);
  }
});

test('eventos.json: impactos por empresa, entre 1 e 12 pontos, cada um com motivo', () => {
  for (const e of eventos) {
    assert.deepEqual(Object.keys(e).filter((k) => k.startsWith('impacto') && !['impactos', 'impactoGeral'].includes(k)), [], `${e.id} campo antigo`);
    const lista = Object.entries(e.impactos);
    assert.ok(lista.length > 0, `${e.id} sem impacto`);
    for (const [t, v] of lista) {
      assert.ok(tickers.has(t), `${e.id} ticker ${t}`);
      assert.ok(Math.abs(v) >= 1 && Math.abs(v) <= 12 && Math.round(v * 10) === v * 10, `${e.id} ${t}=${v}`);
      const motivo = e.motivos?.[t];
      assert.ok(typeof motivo === 'string' && motivo.length >= 8 && motivo.length <= 60, `${e.id} motivo ${t}`);
    }
    for (const t of Object.keys(e.motivos)) assert.ok(t in e.impactos, `${e.id} motivo sobrando ${t}`);
  }
});

test('eventos.json: efeito geral só em notícias de economia, menor que o das empresas citadas', () => {
  const comGeral = eventos.filter((e) => 'impactoGeral' in e);
  assert.ok(comGeral.length >= 8 && comGeral.length <= 20, `${comGeral.length} eventos com efeito geral`);
  for (const e of comGeral) {
    const g = e.impactoGeral;
    assert.ok(Math.abs(g) >= 1 && Math.abs(g) <= 2.5 && Math.round(g * 10) === g * 10, `${e.id} geral ${g}`);
    assert.ok(typeof e.motivoGeral === 'string' && e.motivoGeral.length >= 8 && e.motivoGeral.length <= 60, `${e.id} motivoGeral`);
    for (const [t, v] of Object.entries(e.impactos)) {
      // Com o ruído de até 10%, a empresa citada continua mexendo mais que o efeito geral.
      if (Math.sign(v) === Math.sign(g)) assert.ok(Math.abs(v) * 0.9 > Math.abs(g) * 1.1, `${e.id} ${t} deveria mexer mais que o geral`);
    }
  }
  for (const id of ['gripe-aviaria-controlada', 'embraer-encomenda', 'magalu-black-friday']) {
    assert.ok(!('impactoGeral' in eventos.find((e) => e.id === id)), `${id} não deve ter efeito geral`);
  }
});

test('eventos.json: reforma tributária sobre produtos do dia a dia faz a Ambev subir', () => {
  const e = eventos.find((x) => x.id === 'reforma-tributaria-consumo');
  assert.ok(e.impactos.ABEV3 > 0);
});

test('eventos.json: equilíbrio entre notícias boas e ruins', () => {
  const valores = (e) => Object.values(e.impactos);
  assert.ok(eventos.filter((e) => valores(e).some((v) => v > 0)).length >= 15);
  assert.ok(eventos.filter((e) => valores(e).some((v) => v < 0)).length >= 15);
});

test('eventos.json: nenhum grupo com mais de 4 eventos', () => {
  const contagem = {};
  for (const e of eventos) if (e.grupo) contagem[e.grupo] = (contagem[e.grupo] ?? 0) + 1;
  for (const [g, n] of Object.entries(contagem)) assert.ok(n <= 4, `${g}: ${n}`);
});

test('eventos.json: toda empresa aparece em pelo menos 3 notícias sem contradição entre si', () => {
  const faltando = [];
  for (const t of tickers) {
    const grupos = new Set();
    let n = 0;
    for (const e of eventos) {
      if (!(t in e.impactos)) continue;
      if (e.grupo) {
        if (grupos.has(e.grupo)) continue;
        grupos.add(e.grupo);
      }
      n += 1;
    }
    if (n < 3) faltando.push(`${t}:${n}`);
  }
  assert.deepEqual(faltando, []);
});

test('eventos.json: qualquer ação sozinha na carteira recebe ao menos 3 notícias sobre ela', () => {
  for (const acao of acoes) {
    const carteira = { valorInicial: 1, posicoes: [{ acao, percentual: 100, quantidade: 1, preco: 1 }] };
    for (let i = 0; i < 20; i++) {
      const s = sortearEventos(eventos, 5, Math.random, (e) => eventoAfetaCarteira(e, carteira));
      assert.ok(s.filter((e) => eventoAfetaCarteira(e, carteira)).length >= 3, acao.ticker);
    }
  }
});

test('eventos.json: sorteio sempre funciona', () => {
  for (let i = 0; i < 500; i++) assert.equal(sortearEventos(eventos, 5).length, 5);
});
