/// <reference lib="webworker" />
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { CacheFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

declare const self: ServiceWorkerGlobalScope

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// Toda navegação cai no app guardado: abre na hora, mesmo sem sinal.
registerRoute(new NavigationRoute(createHandlerBoundToURL(new URL('index.html', self.registration.scope).pathname)))

// Pedaços de mapa já vistos: os trajetos de todo dia continuam aparecendo sem sinal. Só o que você já viu é
// guardado (a política de uso dos mapas do OpenStreetMap proíbe baixar em massa ou adiantado para uso offline),
// por até 7 dias, renovados quando você passa de novo; até ~1.200 pedaços (~20 MB).
registerRoute(
  ({ url }) => url.hostname === 'tile.openstreetmap.org' || url.hostname === 'server.arcgisonline.com' || url.hostname.endsWith('tile-cyclosm.openstreetmap.fr'),
  new CacheFirst({ cacheName: 'pedal-tiles', plugins: [new ExpirationPlugin({ maxEntries: 1200, maxAgeSeconds: 7 * 24 * 3600, purgeOnQuotaError: true })] }),
)
// APIs de clima, rotas e alertas ficam sempre na rede: a página guarda a última previsão por conta própria.

// registerType 'prompt': o worker novo espera até você tocar em "Atualizar" (UpdatePrompt).
self.addEventListener('message', event => { if (event.data?.type === 'SKIP_WAITING') self.skipWaiting() })
