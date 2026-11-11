// Abre o app num navegador sem internet (APIs simuladas) e confere os fluxos principais.
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import * as M from "./mock-apis.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const leafletDir = root + "node_modules/leaflet/dist/";
const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const ctx = await browser.newContext({ viewport: { width: 400, height: 860 }, hasTouch: true, isMobile: true,
  geolocation: { latitude: -15.8762, longitude: -48.0925 }, permissions: ["geolocation"] });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", e => errors.push(e.message));
let offline = false;
await page.route("**/*", r => {
  const u = r.request().url();
  if (u.startsWith("file:")) return r.continue();
  if (u.includes("leaflet.js")) return r.fulfill({ body: readFileSync(leafletDir + "leaflet.js"), contentType: "text/javascript" });
  if (u.includes("leaflet.css")) return r.fulfill({ body: readFileSync(leafletDir + "leaflet.css"), contentType: "text/css" });
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

await page.goto("file://" + root + "index.html");
await page.waitForTimeout(1200);

// primeira abertura
assert.ok(await page.evaluate(() => document.getElementById("welcome").open), "boas-vindas deve abrir na primeira vez");
await page.fill("#wl-home", "lugar"); await page.waitForTimeout(500); await page.keyboard.press("Enter");
await page.click("#wl-next"); await page.click("#wl-next"); await page.click("#wl-next");
await page.waitForTimeout(800);
assert.ok(!(await page.evaluate(() => document.getElementById("welcome").open)), "boas-vindas deve fechar ao concluir");

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
assert.ok(await page.evaluate(() => document.getElementById("error").hidden), "não deve mostrar erro com previsão salva");

assert.deepEqual(errors, [], "a página não deve ter erros de JavaScript");
await browser.close();
console.log("app.test: ok");
