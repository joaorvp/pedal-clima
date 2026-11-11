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

// primeira abertura
assert.ok(await page.evaluate(() => document.getElementById("welcome").open), "boas-vindas deve abrir na primeira vez");
await page.fill("#wl-home", "lugar"); await page.waitForTimeout(500); await page.keyboard.press("Enter");
await page.click("#wl-next"); await page.click("#wl-next"); await page.click("#wl-next");
await page.waitForTimeout(800);
assert.ok(!(await page.evaluate(() => document.getElementById("welcome")?.open)), "boas-vindas deve fechar ao concluir");

// veredito, linha do tempo, rotas e alerta
const title = await page.textContent("#v-title");
assert.ok(title && !/Carregando/.test(title), "veredito deve aparecer: " + title);
assert.ok((await page.locator("#timeline li").count()) >= 2, "linha do tempo deve ter trechos");
assert.ok((await page.locator(".rt").count()) >= 2, "deve listar rotas alternativas");
assert.match(await page.textContent("#alert"), /INMET/);
assert.match(await page.textContent("#batt-txt"), /% da bateria/);

// modo pedal até a chegada
await page.evaluate(() => document.getElementById("ride").click());
await page.waitForTimeout(800);
assert.match(await page.textContent("#v-title"), /Chuva em|Seco até|Chuva no seu trecho/);
const work = await page.evaluate(() => JSON.parse(localStorage.getItem("pedalclima.v1")).work);
await ctx.setGeolocation({ latitude: work[0], longitude: work[1] });
await page.waitForTimeout(900);
assert.equal(await page.textContent("#v-title"), "Você chegou");
assert.ok(await page.evaluate(() => !document.getElementById("fb").hidden), "deve perguntar se a previsão acertou");

// sem conexão: abre com a última previsão salva
offline = true;
await page.reload(); await page.waitForTimeout(1500);
assert.match(await page.textContent("#updated"), /sem conexão/);
assert.ok(await page.evaluate(() => !document.getElementById("error")), "não deve mostrar erro com previsão salva");

assert.deepEqual(errors, [], "a página não deve ter erros de JavaScript");
await browser.close();
stopping = true; server.kill();
console.log("app.test: ok");
