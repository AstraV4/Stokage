// Service worker minimal : permet l'installation en PWA.
// Ne mets PAS en cache les pages dynamiques (fichiers/dossiers changent trop souvent) :
// seul le strict necessaire pour que le navigateur autorise l'installation.
const CACHE = 'vault-shell-v1';
const SHELL = ['/static/css/app.css', '/static/css/vault.css'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});
self.addEventListener('activate', (e) => { self.clients.claim(); });

self.addEventListener('fetch', (e) => {
  // Uniquement les fichiers statiques (CSS) passent par le cache ; tout le reste (pages, API, fichiers) va toujours au serveur.
  if (e.request.method !== 'GET' || !e.request.url.includes('/static/css/')) return;
  e.respondWith(caches.match(e.request).then((cached) => cached || fetch(e.request)));
});
