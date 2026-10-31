import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';

const raiz = new URL('../', import.meta.url);
const sw = readFileSync(new URL('sw.js', raiz), 'utf8');
const lista = [...sw.matchAll(/'\.\/([^']*)'/g)].map((m) => m[1]).filter(Boolean);

test('sw.js: todo arquivo da lista existe', () => {
  for (const arq of lista) assert.ok(existsSync(new URL(arq, raiz)), arq);
});

test('sw.js: todo módulo, dado e ícone do app está na lista', () => {
  const esperados = [
    ...readdirSync(new URL('js/', raiz)).filter((f) => f.endsWith('.js')).map((f) => `js/${f}`),
    ...readdirSync(new URL('js/telas/', raiz)).map((f) => `js/telas/${f}`),
    ...readdirSync(new URL('data/', raiz)).map((f) => `data/${f}`),
    ...readdirSync(new URL('icons/', raiz)).map((f) => `icons/${f}`),
    ...readdirSync(new URL('fonts/', raiz)).map((f) => `fonts/${f}`),
    ...readdirSync(new URL('sons/', raiz)).map((f) => `sons/${f}`),
    'index.html', 'manifest.webmanifest', 'css/style.css',
  ];
  for (const arq of esperados) assert.ok(lista.includes(arq), `faltando no sw.js: ${arq}`);
});

test('logos: toda ação marcada com logo tem o arquivo', () => {
  const { acoes } = JSON.parse(readFileSync(new URL('data/acoes.json', raiz), 'utf8'));
  for (const a of acoes) {
    assert.equal(typeof a.logo, 'boolean', a.ticker);
    if (a.logo) assert.ok(existsSync(new URL(`logos/${a.ticker}.svg`, raiz)), a.ticker);
  }
});

test('manifest: caminhos relativos e ícones existentes', () => {
  const m = JSON.parse(readFileSync(new URL('manifest.webmanifest', raiz), 'utf8'));
  assert.equal(m.start_url, './');
  assert.equal(m.scope, './');
  for (const i of m.icons) assert.ok(existsSync(new URL(i.src, raiz)), i.src);
});
