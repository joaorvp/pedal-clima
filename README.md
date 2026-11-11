# Pedal & Clima

App (PWA) para quem vai de bike ao trabalho: mostra no mapa a chuva ao longo do trajeto **no horário em que você passa por cada trecho**, com radar, rotas alternativas, modo pedal com GPS, relevo e bateria da e-bike, pôr do sol e alertas do INMET.

Funciona offline, instala pela tela inicial e guarda tudo só no aparelho (sem conta).

## Stack

- Vite + React 19 + TypeScript
- Tailwind CSS v4
- Zustand (estado) + Zod (validação dos dados salvos)
- Leaflet (mapa)
- vite-plugin-pwa (service worker próprio em `src/pwa/sw.ts`, atualização com aviso)
- Vitest + Playwright

APIs usadas, todas gratuitas e sem chave: Open-Meteo (previsão e altitude), OSRM (rotas de bike), Photon (busca de endereço), RainViewer (radar), INMET (alertas) e ntfy (avisos no celular).

## Como rodar

```bash
npm install
npm run dev
```

## Validação antes de subir

```bash
npm run lint
npm test               # testes unitários (src/domain)
npm run test:aviso     # script de avisos
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
  workflows/aviso.yml         avisos de chuva pelo ntfy antes de cada saída
  scripts/aviso.mjs
tests/         teste de ponta a ponta e do script de avisos
```

## Dados salvos

As configurações ficam no `localStorage`, na chave `pedalclima.v1` (a mesma da versão antiga, de arquivo único), validadas com Zod. A última previsão fica em `pedalclima.last` para o app abrir sem sinal.

## Avisos no celular

O workflow `aviso.yml` roda em dias úteis e, uns 45 min antes de cada saída, envia uma notificação pelo app [ntfy](https://ntfy.sh) quando há chuva, trovoada, pista molhada ou alerta do INMET. O passo a passo, com os valores prontos para copiar, fica em **Ajustes → Avisos no celular**.

Variáveis opcionais: `PEDAL_SEMPRE=1` (avisar também quando estiver seco), `PEDAL_ANTECEDENCIA` (minutos, padrão 45) e `PEDAL_CHANCE` (sensibilidade calibrada pelo app).
