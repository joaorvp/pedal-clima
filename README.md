# Pedágua

_Pedal com previsão._ App (PWA) para quem vai de bike: mostra no mapa a chuva ao longo do trajeto **no horário em que você passa por cada trecho**. (Antes chamado Pedal & Clima; o endereço continua `joaorvp.github.io/pedal-clima`.)

Funciona offline, instala pela tela inicial e guarda tudo só no aparelho (sem conta, sem servidor).

## O que ele faz

- **Ao abrir:** você no mapa e o clima onde você está (chuva nas próximas 3 h, temperatura, vento, umidade e qualidade do ar), com aviso "me avise quando parar" quando chove.
- **Trajeto:** "Para onde vamos?", atalhos (casa, trabalho, lugares salvos, recentes), tocar e segurar no mapa, origem e destino editáveis, até 3 rotas comparadas por tempo e chuva, arrastar a rota, ponto de passagem.
- **Veredito:** "Pode ir tranquilo", "Leve a capa", "Chuva forte", "Trovoada"; quando a chuva passa; melhor hora para sair; saída de amanhã; linha do tempo minuto a minuto; relevo e bateria da e-bike; checklist (capa, luz, pôr do sol, calor, ar seco, vento); alertas oficiais do INMET.
- **Onde me abrigar:** abrigos cobertos (pontos de ônibus, postos, estações, shoppings) perto de onde a chuva começa, com "passar por aqui".
- **Pedalando:** bike no mapa em tempo real, chuva à frente, recalcular fora da rota, janela flutuante, avisos por voz, vibração, modo painel para o guidão, tela sempre acesa e resumo ao chegar.
- **Seus pedais:** histórico com totais da semana e do mês.
- **Extras:** ciclovias (CyclOSM), atalhos no ícone do app, rotina ("Indo para o Trabalho?"), avaliação "a previsão acertou?" que calibra a sensibilidade, "Desfazer" e "Relatar problema".

## Stack

- Vite + React 19 + TypeScript
- Tailwind CSS v4
- Zustand (estado) + Zod (validação dos dados salvos)
- Leaflet (mapa)
- vite-plugin-pwa (service worker próprio em `src/pwa/sw.ts`, atualização com aviso)
- Vitest + Playwright

APIs usadas, todas gratuitas e sem chave: Open-Meteo (previsão, altitude e qualidade do ar), OSRM (rotas), Photon (busca de endereço), Overpass/OpenStreetMap (abrigos), CyclOSM (ciclovias), RainViewer (radar) e INMET (alertas).

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
