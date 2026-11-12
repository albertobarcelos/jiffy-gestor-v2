/* PWA do entregador: instala o app e guarda só o chrome estático.
 * Pedidos/API continuam na rede — a lista offline fica no localStorage do app. */
const CACHE_SHELL = 'jiffygo-shell-v1'
const SHELL = [
  '/images/expedicao/logo_app.png',
  '/images/expedicao/tudo_certo.png',
  '/images/expedicao/comissao.png',
  '/expedicao-app/manifest.webmanifest',
]

self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(CACHE_SHELL)
      .then(cache => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys =>
        Promise.all(keys.filter(key => key !== CACHE_SHELL).map(key => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', event => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/')) return

  const noShell = SHELL.includes(url.pathname)
  if (!noShell) {
    event.respondWith(fetch(request))
    return
  }

  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request).then(resposta => {
      const copia = resposta.clone()
      void caches.open(CACHE_SHELL).then(cache => cache.put(request, copia))
      return resposta
    }))
  )
})
