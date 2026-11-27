// Service worker mínimo: permite instalar o app na tela inicial.
// Não guarda dados em cache, para que as caronas estejam sempre atualizadas.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))
self.addEventListener('fetch', () => {})
