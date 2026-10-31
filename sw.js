// Service worker: guarda todos os arquivos no primeiro acesso para o app funcionar offline.
// - Dados (data/*.json): responde com a cópia guardada e atualiza em segundo plano, então
//   uma edição de eventos ou preços aparece a partir da segunda abertura do app.
// - Código (html, css, js): só sai do cache. Para publicar uma mudança de código, troque a
//   versão abaixo; o app inteiro é baixado de novo de uma vez, sem misturar versões.
const CACHE = 'simulador-bolsa-v12';

const ARQUIVOS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './js/app.js',
  './js/carteira.js',
  './js/inatividade.js',
  './js/motor.js',
  './js/ranking.js',
  './js/preferencias-som.js',
  './js/setores.js',
  './js/som.js',
  './js/ui.js',
  './js/telas/distribuicao.js',
  './js/telas/escolha.js',
  './js/telas/inicio.js',
  './js/telas/ranking.js',
  './js/telas/resultado.js',
  './js/telas/rodada.js',
  './data/acoes.json',
  './data/eventos.json',
  './fonts/outfit-latin.woff2',
  './icons/icon-192.png',
  './sons/applause.mp3',
  './sons/breaking_news.mp3',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
];

// Os logos vêm da lista de ações, para não precisar listar os 76 arquivos aqui.
async function logos() {
  const resp = await fetch(semCacheHttp('./data/acoes.json'));
  const { acoes } = await resp.json();
  return acoes.filter((a) => a.logo).map((a) => `./logos/${a.ticker}.svg`);
}

// Baixa direto do servidor: o cache HTTP do navegador pode ter cópias da versão anterior.
function semCacheHttp(url) {
  return new Request(url, { cache: 'reload' });
}

self.addEventListener('install', (evento) => {
  evento.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll([...ARQUIVOS, ...(await logos())].map(semCacheHttp));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (evento) => {
  if (evento.request.method !== 'GET') return;
  const url = new URL(evento.request.url);
  const ehDado = url.origin === self.location.origin && /\/data\/[^/]+\.json$/.test(url.pathname);
  const salvo = caches.match(evento.request, { ignoreSearch: true });
  if (!ehDado) {
    evento.respondWith(salvo.then((r) => r ?? fetch(evento.request)));
    return;
  }
  const atualizar = fetch(evento.request).then(async (resposta) => {
    if (resposta.ok) {
      const cache = await caches.open(CACHE);
      await cache.put(evento.request, resposta.clone());
    }
    return resposta;
  });
  evento.waitUntil(atualizar.catch(() => {}));
  evento.respondWith(salvo.then((r) => r ?? atualizar));
});
