# Pedal & Clima

Mapa do trajeto de bicicleta casa ⇄ trabalho com radar de chuva ao vivo e previsão por trecho, calculada para o horário em que você passa por cada ponto.

- Radar: RainViewer
- Previsão: Open-Meteo
- Rota de bike: OSRM (routing.openstreetmap.de)

Abra `index.html` no navegador ou acesse pelo GitHub Pages. Arraste os marcadores C (casa), T (trabalho) e P (passar por) para ajustar o trajeto; a configuração fica salva no aparelho.

## Avisos no celular

Um workflow do GitHub Actions (`.github/workflows/aviso.yml`) roda em dias úteis e, uns 45 min antes de cada saída, envia uma notificação pelo app [ntfy](https://ntfy.sh) quando há chuva, trovoada ou pista molhada no trajeto. O passo a passo, com os valores prontos para copiar, fica em **Ajustes → Avisos no celular**, dentro do app.

Variáveis opcionais: `PEDAL_SEMPRE=1` (avisar também quando estiver seco) e `PEDAL_ANTECEDENCIA` (minutos de antecedência, padrão 45).

## Funciona sem sinal

O app guarda a última previsão e os pedaços de mapa já vistos no aparelho (service worker em `sw.js`). Sem conexão, ele abre com a previsão mais recente e avisa o horário dela.

## Testes

```bash
npm install
npx playwright install chromium
npm test
```

`tests/aviso.test.mjs` testa o script de avisos e `tests/app.test.mjs` abre o app num navegador com as APIs simuladas (primeira abertura, veredito, rotas, alerta, modo pedal, modo sem conexão). Os testes rodam no GitHub a cada envio (`.github/workflows/testes.yml`).
