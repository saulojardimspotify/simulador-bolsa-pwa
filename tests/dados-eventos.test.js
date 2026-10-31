import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SETORES } from '../js/setores.js';
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

test('eventos.json: impactos válidos', () => {
  for (const e of eventos) {
    const todos = { ...e.impactoSetores, ...e.impactoAcoes };
    assert.ok(Object.keys(todos).length > 0, `${e.id} sem impacto`);
    for (const [k, v] of Object.entries(todos)) {
      assert.ok(v !== 0 && v >= -12 && v <= 12 && Math.round(v * 10) === v * 10, `${e.id} ${k}=${v}`);
    }
    for (const s of Object.keys(e.impactoSetores)) assert.ok(SETORES.includes(s), `${e.id} setor ${s}`);
    for (const t of Object.keys(e.impactoAcoes ?? {})) assert.ok(tickers.has(t), `${e.id} ticker ${t}`);
    for (const k of Object.keys(e.motivos ?? {})) {
      assert.ok(SETORES.includes(k) || tickers.has(k), `${e.id} motivo ${k}`);
    }
  }
});

test('eventos.json: todo evento tem efeito no mercado entre 0,5 e 4 pontos', () => {
  for (const e of eventos) {
    const m = e.impactoMercado;
    assert.ok(typeof m === 'number' && Math.abs(m) >= 0.5 && Math.abs(m) <= 4 && Math.round(m * 10) === m * 10, `${e.id} ${m}`);
    assert.ok(typeof e.motivoMercado === 'string' && e.motivoMercado.length >= 10 && e.motivoMercado.length <= 70, `${e.id} motivoMercado`);
  }
});

test('eventos.json: todo setor aparece em pelo menos 4 eventos', () => {
  const setorDe = Object.fromEntries(acoes.map((a) => [a.ticker, a.setor]));
  for (const s of SETORES) {
    const n = eventos.filter((e) => s in e.impactoSetores ||
      Object.keys(e.impactoAcoes ?? {}).some((t) => setorDe[t] === s)).length;
    assert.ok(n >= 4, `${s}: ${n}`);
  }
});

test('eventos.json: equilíbrio entre notícias boas e ruins', () => {
  const valores = (e) => Object.values({ ...e.impactoSetores, ...e.impactoAcoes });
  assert.ok(eventos.filter((e) => valores(e).some((v) => v > 0)).length >= 15);
  assert.ok(eventos.filter((e) => valores(e).some((v) => v < 0)).length >= 15);
});

test('eventos.json: nenhum grupo com mais de 4 eventos', () => {
  const contagem = {};
  for (const e of eventos) if (e.grupo) contagem[e.grupo] = (contagem[e.grupo] ?? 0) + 1;
  for (const [g, n] of Object.entries(contagem)) assert.ok(n <= 4, `${g}: ${n}`);
});

test('eventos.json: qualquer ação sozinha na carteira recebe ao menos 3 notícias específicas', () => {
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
