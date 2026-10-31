import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const codigo = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const ORIGEM = 'https://exemplo.github.io';

// Carrega o sw.js com um navegador falso e devolve o tratador de fetch.
function montar({ emCache }) {
  const buscas = [];
  const gravacoes = [];
  const ouvintes = {};
  const cache = { put: async (req) => { gravacoes.push(req.url); }, addAll: async () => {} };
  const contexto = {
    self: { location: { origin: ORIGEM }, addEventListener: (tipo, fn) => { ouvintes[tipo] = fn; }, skipWaiting() {}, clients: { claim() {} } },
    caches: {
      open: async () => cache,
      match: async (req) => (emCache.includes(new URL(req.url).pathname) ? { origem: 'cache', url: req.url } : undefined),
      keys: async () => [],
      delete: async () => true,
    },
    fetch: async (req) => { buscas.push(req.url); return { ok: true, origem: 'rede', clone() { return this; } }; },
    URL,
    Promise,
  };
  vm.runInNewContext(codigo, contexto);
  async function pedir(caminho) {
    const esperas = [];
    let resposta;
    ouvintes.fetch({
      request: { url: ORIGEM + caminho, method: 'GET' },
      respondWith: (p) => { resposta = p; },
      waitUntil: (p) => esperas.push(p),
    });
    const r = await resposta;
    await Promise.all(esperas);
    return r;
  }
  return { pedir, buscas, gravacoes };
}

test('sw: código em cache não vai à rede (evita misturar versões)', async () => {
  const sw = montar({ emCache: ['/js/app.js'] });
  const r = await sw.pedir('/js/app.js');
  assert.equal(r.origem, 'cache');
  assert.deepEqual(sw.buscas, []);
});

test('sw: dados em cache são servidos e atualizados em segundo plano', async () => {
  const sw = montar({ emCache: ['/data/eventos.json'] });
  const r = await sw.pedir('/data/eventos.json');
  assert.equal(r.origem, 'cache');
  assert.deepEqual(sw.buscas, [`${ORIGEM}/data/eventos.json`]);
  assert.deepEqual(sw.gravacoes, [`${ORIGEM}/data/eventos.json`], 'gravação termina dentro do waitUntil');
});

test('sw: na instalação guarda também os logos das ações', async () => {
  const guardados = [];
  const ouvintes = {};
  const contexto = {
    self: { location: { origin: ORIGEM }, addEventListener: (t, fn) => { ouvintes[t] = fn; }, skipWaiting() {}, clients: { claim() {} } },
    caches: { open: async () => ({ addAll: async (l) => { guardados.push(...l); }, put: async () => {} }) },
    fetch: async (req) => ({
      ok: true,
      json: async () => ({ acoes: [{ ticker: 'PETR4', logo: true }, { ticker: 'XPTO3', logo: false }] }),
      url: req.url ?? req,
    }),
    Request: class { constructor(url, opcoes = {}) { this.url = url; this.cache = opcoes.cache; } },
    URL,
    Promise,
  };
  vm.runInNewContext(codigo, contexto);
  let espera;
  ouvintes.install({ waitUntil: (p) => { espera = p; } });
  await espera;
  const urls = guardados.map((r) => r.url);
  assert.ok(urls.includes('./js/app.js'));
  assert.ok(urls.includes('./logos/PETR4.svg'));
  assert.ok(!urls.includes('./logos/XPTO3.svg'));
  // Ignora o cache HTTP do navegador, senão uma versão nova pode guardar arquivos velhos.
  assert.ok(guardados.every((r) => r.cache === 'reload'));
});

test('sw: arquivo fora do cache vem da rede', async () => {
  const sw = montar({ emCache: [] });
  const r = await sw.pedir('/js/ui.js');
  assert.equal(r.origem, 'rede');
});
