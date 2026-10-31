// Service worker: guarda todos os arquivos no primeiro acesso para o app funcionar offline.
// Responde com a cópia guardada e, se houver internet, atualiza a cópia em segundo plano:
// uma edição publicada aparece a partir da segunda abertura do app.
// Ao adicionar ou remover arquivos, atualize a lista e troque a versão abaixo.
const CACHE = 'simulador-bolsa-v1';

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
  './js/setores.js',
  './js/ui.js',
  './js/telas/distribuicao.js',
  './js/telas/escolha.js',
  './js/telas/inicio.js',
  './js/telas/ranking.js',
  './js/telas/resultado.js',
  './js/telas/rodada.js',
  './data/acoes.json',
  './data/eventos.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
];

self.addEventListener('install', (evento) => {
  evento.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
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
  const atualizar = fetch(evento.request).then((resposta) => {
    if (resposta.ok && new URL(evento.request.url).origin === self.location.origin) {
      const copia = resposta.clone();
      caches.open(CACHE).then((cache) => cache.put(evento.request, copia));
    }
    return resposta;
  });
  evento.respondWith(
    caches.match(evento.request, { ignoreSearch: true }).then((salvo) => {
      if (salvo) {
        evento.waitUntil(atualizar.catch(() => {}));
        return salvo;
      }
      return atualizar;
    }),
  );
});
