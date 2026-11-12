import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// No GitHub Pages o app fica em /pedal-clima/; localmente, na raiz.
const base = process.env.VITE_BASE_PATH ?? '/'

// Política de segurança (CSP): a página só roda scripts próprios e só conversa com os serviços que o app usa.
// O GitHub Pages não permite cabeçalhos, então vai como <meta>, só no build (o modo dev do Vite injeta scripts).
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://tile.openstreetmap.org https://server.arcgisonline.com https://*.tile-cyclosm.openstreetmap.fr https://*.rainviewer.com",
  "connect-src 'self' https://api.open-meteo.com https://air-quality-api.open-meteo.com https://*.rainviewer.com https://apiprevmet3.inmet.gov.br https://brouter.de https://router.project-osrm.org https://routing.openstreetmap.de https://photon.komoot.io https://nominatim.openstreetmap.org https://viacep.com.br https://overpass-api.de",
  "font-src 'self' data:",
  "media-src 'self' blob:",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ')

export default defineConfig({
  base,
  plugins: [
    { name: 'pedagua-csp', apply: 'build', transformIndexHtml: html => html.replace('<meta charset="utf-8" />', `<meta charset="utf-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />\n    <meta name="referrer" content="strict-origin-when-cross-origin" />`) },
    react(),
    tailwindcss(),
    VitePWA({
      // Service worker próprio (src/pwa/sw.ts): precisa guardar os pedaços de
      // mapa já vistos com limite de quantidade, o que o gerado automático não faz.
      strategies: 'injectManifest',
      srcDir: 'src/pwa',
      filename: 'sw.ts',
      registerType: 'prompt',
      // fontes: só o subconjunto latino (cobre todos os acentos do português); os outros nem são usados
      injectManifest: { globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'], globIgnores: ['**/*vietnamese*', '**/*latin-ext*', '**/*cyrillic*', '**/*greek*'] },
      includeAssets: ['icon.svg', 'apple-touch-icon.png', 'favicon-32x32.png'],
      manifest: {
        id: '.',
        name: 'Pedágua: pedal com previsão',
        short_name: 'Pedágua',
        description: 'Chuva ao longo do trajeto de bike, no horário em que você passa por cada trecho.',
        lang: 'pt-BR',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        // Sem `orientation`: declarar faz o Android ignorar a trava de rotação do sistema.
        background_color: '#1b2b4b',
        theme_color: '#1b2b4b',
        categories: ['weather', 'navigation', 'travel'],
        // segurar o ícone do app na tela inicial mostra estes atalhos
        shortcuts: [
          { name: 'Ir para o Trabalho', short_name: 'Trabalho', url: './?ir=trabalho', icons: [{ src: 'pwa-192.png', sizes: '192x192', type: 'image/png' }] },
          { name: 'Ir para Casa', short_name: 'Casa', url: './?ir=casa', icons: [{ src: 'pwa-192.png', sizes: '192x192', type: 'image/png' }] },
        ],
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'monochrome-96.png', sizes: '96x96', type: 'image/png', purpose: 'monochrome' },
        ],
      },
    }),
  ],
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
