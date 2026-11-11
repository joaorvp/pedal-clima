// Abre o app num navegador sem internet (APIs simuladas) e confere os fluxos principais.
import { strict as assert } from "node:assert";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import * as M from "./mock-apis.mjs";

// Serve o build de produção (dist/) no mesmo caminho do GitHub Pages.
const root = fileURLToPath(new URL("..", import.meta.url));
const server = spawn(process.execPath, [root + "node_modules/vite/bin/vite.js", "preview", "--port", "4179", "--strictPort"], { cwd: root, env: { ...process.env, VITE_BASE_PATH: "/pedal-clima/" }, stdio: "ignore" });
let stopping = false;
server.on("exit", c => { if (c && !stopping) { console.error("vite preview saiu com código " + c); process.exit(1); } });
for (let i = 0; ; i++) {
  try { if ((await fetch("http://localhost:4179/pedal-clima/")).ok) break; } catch { /* ainda subindo */ }
  if (i > 60) throw new Error("vite preview não respondeu");
  await new Promise(r => setTimeout(r, 300));
}
const APP = "http://localhost:4179/pedal-clima/";
process.on("exit", () => { stopping = true; server.kill(); });
process.on("uncaughtException", e => { console.error(e); stopping = true; server.kill(); process.exit(1); });

const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
// serviceWorkers: "block" para as respostas simuladas valerem (o SW é testado à parte, no build)
const ctx = await browser.newContext({ viewport: { width: 400, height: 860 }, hasTouch: true, isMobile: true, serviceWorkers: "block",
  geolocation: { latitude: -15.8762, longitude: -48.0925 }, permissions: ["geolocation"] });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", e => errors.push(e.message));
let offline = false;
await page.route("**/*", r => {
  const u = r.request().url();
  if (u.startsWith(APP)) return r.continue();
  if (offline) return r.abort();
  if (u.includes("routed-")) return r.fulfill({ json: M.routeJson(u) });
  if (u.includes("/v1/elevation")) return r.fulfill({ json: M.elevationJson(u) });
  if (u.includes("open-meteo")) return r.fulfill({ json: M.weatherJson(u) });
  if (u.includes("photon.komoot.io/api")) return r.fulfill({ json: M.photonJson });
  if (u.includes("photon.komoot.io/reverse")) return r.fulfill({ json: M.reverseJson });
  if (u.includes("inmet")) return r.fulfill({ json: M.inmetJson });
  if (u.includes("weather-maps.json")) return r.fulfill({ json: M.radarJson() });
  return r.fulfill({ status: 204, body: "" });
});

await page.goto(APP);
await page.waitForTimeout(1200);

// primeira abertura: boas-vindas com casa e trabalho
assert.ok(await page.evaluate(() => document.getElementById("welcome").open), "boas-vindas deve abrir na primeira vez");
await page.fill("#wl-home", "lugar"); await page.waitForTimeout(500); await page.keyboard.press("Enter");
await page.click("#wl-next");
await page.fill("#wl-work", "lugar"); await page.waitForTimeout(500); await page.keyboard.press("Enter");
await page.click("#wl-next"); await page.click("#wl-next");
await page.waitForTimeout(800);
assert.ok(!(await page.evaluate(() => document.getElementById("welcome")?.open)), "boas-vindas deve fechar ao concluir");

// tela inicial: você no mapa e o clima onde você está
assert.ok(await page.locator(".me-dot").count() === 1, "deve mostrar o ponto azul da sua posição");
assert.match(await page.textContent("#v-title"), /Seco por aqui|Chuva|aqui agora/);
assert.match(await page.textContent(".local-where"), /Onde você está/);

// rotina: com a saída daqui a 20 min, a tela inicial sugere o trajeto
const soon = await page.evaluate(() => { const d = new Date(Date.now() + 20 * 60e3); return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); });
await page.click("#open-settings"); await page.waitForTimeout(300);
await page.fill("#t-ida", soon);
await page.click("#settings-done"); await page.waitForTimeout(400);
assert.match(await page.textContent(".routine"), /Indo para o Trabalho\?.*em (19|20|21) min/);
await page.evaluate(() => document.querySelector(".routine").click());
await page.waitForTimeout(1200);
assert.match(await page.textContent(".triphead"), /Trabalho/);
assert.equal(await page.inputValue("#dep"), soon, "o trajeto da rotina já vem com o horário da saída");
// botão voltar do celular fecha o trajeto em vez de sair do app
await page.goBack(); await page.waitForTimeout(600);
assert.ok(await page.locator(".whereto").count() === 1, "voltar deve fechar o trajeto");

// tocar e segurar no mapa (clique direito no computador): "Ir para cá" monta o trajeto até o ponto
const mapBox = await page.locator("#map").boundingBox();
await page.mouse.click(mapBox.x + mapBox.width * 0.7, mapBox.y + 120, { button: "right" });
await page.waitForTimeout(500);
assert.ok(await page.locator(".drop").count() === 1, "deve abrir o alfinete com as opções");
await page.evaluate(() => document.querySelector('.drop [data-a="dest"]').click());
await page.waitForTimeout(1200);
assert.match(await page.textContent(".triphead"), /Rua 9|Ponto no mapa/);
await page.evaluate(() => document.querySelector('[aria-label="Fechar trajeto"]').click());
await page.waitForTimeout(500);

// montar o trajeto pelo atalho do trabalho
await page.evaluate(() => [...document.querySelectorAll(".sc")].find(b => b.textContent.includes("Trabalho")).click());
await page.waitForTimeout(1200);
assert.match(await page.textContent(".triphead"), /Sua localização/);
const title = await page.textContent("#v-title");
assert.ok(title && !/Carregando|Olhando/.test(title), "veredito do trajeto deve aparecer: " + title);
assert.ok((await page.locator("#timeline li").count()) >= 2, "linha do tempo deve ter trechos");
assert.ok((await page.locator(".rt").count()) >= 2, "deve listar rotas alternativas");
assert.match(await page.textContent("#alert"), /INMET/);
assert.match(await page.textContent("#batt-txt"), /% da bateria/);
assert.ok((await page.locator(".rlabel").count()) >= 2, "cada rota deve ter etiqueta de tempo e chuva no mapa");

// trocar o destino pelo cabeçalho e voltar para o trabalho
const pickDest = async name => {
  await page.evaluate(() => document.querySelector('.triphead button.end[aria-label^="Trocar destino"]').click());
  await page.waitForTimeout(300);
  await page.evaluate(n => [...document.querySelectorAll(".endpick .sc")].find(b => b.textContent.includes(n)).click(), name);
  await page.waitForTimeout(1200);
};
await pickDest("Casa");
assert.match(await page.textContent(".triphead"), /Casa/);
await pickDest("Trabalho");
assert.match(await page.textContent(".triphead"), /Trabalho/);

// modo pedal: a bike aparece no mapa e o pedal termina ao chegar
await page.evaluate(() => document.getElementById("ride").click());
await page.waitForTimeout(800);
assert.ok(await page.locator(".bike-disc").count() === 1, "deve mostrar a bike no mapa durante o pedal");
assert.ok(await page.locator("#voice").count() === 1, "deve ter o botão de voz no pedal");
assert.ok(await page.evaluate(() => !!document.querySelector("body > video")), "o vídeo da janela flutuante fica preparado ao iniciar o pedal");
assert.match(await page.textContent("#v-title"), /Chuva em|Seco até|Chuva no seu trecho/);
// fora da rota por mais de 20 s: oferece recalcular a partir de onde você está
await ctx.setGeolocation({ latitude: -15.876 + 0.073 * 0.3 + 0.006, longitude: -48.093 + 0.137 * 0.3 - 0.004 });
await page.waitForTimeout(1500);
await page.waitForTimeout(21000);
await ctx.setGeolocation({ latitude: -15.876 + 0.073 * 0.3 + 0.0062, longitude: -48.093 + 0.137 * 0.3 - 0.004 });
await page.waitForTimeout(1500);
assert.ok(await page.locator("#recalc").count() === 1, "deve oferecer recalcular depois de 20 s fora da rota");
await page.evaluate(() => document.getElementById("recalc").click());
await page.waitForTimeout(1500);
assert.ok(await page.locator(".bike-disc").count() === 1, "o pedal continua depois de recalcular");
const work = await page.evaluate(() => JSON.parse(localStorage.getItem("pedalclima.v1")).work);
await ctx.setGeolocation({ latitude: work[0], longitude: work[1] });
await page.waitForTimeout(1200);
assert.equal(await page.textContent("#v-title"), "Você chegou");
assert.ok(await page.evaluate(() => !!document.getElementById("fb")), "deve perguntar se a previsão acertou");
assert.match(await page.textContent(".summary"), /\d+,\d km.*\d+ min/s);
assert.ok(await page.locator("#share").count() === 1, "deve ter o botão de compartilhar o resumo");

// fechar o trajeto volta para a tela inicial
await page.evaluate(() => document.querySelector('[aria-label="Fechar trajeto"]').click());
await page.waitForTimeout(500);
assert.ok(await page.locator(".whereto").count() === 1, "deve voltar para a tela inicial");

// sem conexão: o clima de onde você está continua aparecendo
offline = true;
await page.reload(); await page.waitForTimeout(1500);
assert.match(await page.textContent("#updated"), /sem conexão/);
assert.match(await page.textContent("#v-title"), /Seco por aqui|Chuva|aqui agora/);

assert.deepEqual(errors, [], "a página não deve ter erros de JavaScript");
await browser.close();
stopping = true; server.kill();
console.log("app.test: ok");
