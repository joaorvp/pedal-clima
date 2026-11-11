# Pedágua

_Pedal com previsão._ (Antes chamado Pedal & Clima; o endereço continua `joaorvp.github.io/pedal-clima`.)

App (PWA) para quem vai de bike ao trabalho. Abra na hora de sair e toque em **Iniciar pedal**: a tela fica acesa e o app mostra no mapa a chuva ao longo do trajeto **no horário em que você passa por cada trecho**, com radar, rotas alternativas, modo pedal com GPS, relevo e bateria da e-bike, pôr do sol e alertas do INMET.

Funciona offline, instala pela tela inicial e guarda tudo só no aparelho (sem conta).

## Stack

- Vite + React 19 + TypeScript
- Tailwind CSS v4
- Zustand (estado) + Zod (validação dos dados salvos)
- Leaflet (mapa)
- vite-plugin-pwa (service worker próprio em `src/pwa/sw.ts`, atualização com aviso)
- Vitest + Playwright

APIs usadas, todas gratuitas e sem chave: Open-Meteo (previsão e altitude), OSRM (rotas de bike), Photon (busca de endereço), RainViewer (radar) e INMET (alertas).

## Como rodar

```bash
npm install
npm run dev
```

## Validação antes de subir

```bash
npm run lint
npm test               # testes unitários (src/domain)
npm run build
npm run test:e2e       # abre o build num navegador com APIs simuladas
```

## Estrutura

```txt
src/
  domain/      lógica pura e testada: rota, chuva por trecho, veredito, bateria, sol, alertas
  services/    chamadas às APIs externas
  store/       estado (Zustand): configurações salvas e trajeto
  hooks/       visão do trajeto e modo pedal (GPS)
  components/  telas: mapa, gaveta, veredito, trajeto, ajustes, boas-vindas, PWA
  pwa/sw.ts    service worker
.github/
  workflows/ci.yml            lint, testes, build e teste de ponta a ponta
  workflows/deploy-pages.yml  publica no GitHub Pages a cada push na main
tests/         teste de ponta a ponta
```

## Dados salvos

As configurações ficam no `localStorage`, na chave `pedalclima.v1` (a mesma da versão antiga, de arquivo único), validadas com Zod. A última previsão fica em `pedalclima.last` para o app abrir sem sinal.
