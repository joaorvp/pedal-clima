/// <reference lib="webworker" />
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { CacheFirst, StaleWhileRevalidate } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

declare const self: ServiceWorkerGlobalScope

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// Toda navegação cai no app guardado: abre na hora, mesmo sem sinal.
registerRoute(new NavigationRoute(createHandlerBoundToURL(new URL('index.html', self.registration.scope).pathname)))

// Pedaços de mapa já vistos (com limite, para não encher o aparelho).
registerRoute(
  ({ url }) => url.hostname === 'tile.openstreetmap.org' || url.hostname === 'server.arcgisonline.com',
  new CacheFirst({ cacheName: 'pedal-tiles', plugins: [new ExpirationPlugin({ maxEntries: 400, maxAgeSeconds: 30 * 24 * 3600 })] }),
)
// Fontes do Google
registerRoute(
  ({ url }) => url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com',
  new StaleWhileRevalidate({ cacheName: 'pedal-fonts', plugins: [new ExpirationPlugin({ maxEntries: 20 })] }),
)
// APIs de clima, rotas e alertas ficam sempre na rede: a página guarda a última previsão por conta própria.

// registerType 'prompt': o worker novo espera até você tocar em "Atualizar" (UpdatePrompt).
self.addEventListener('message', event => { if (event.data?.type === 'SKIP_WAITING') self.skipWaiting() })
