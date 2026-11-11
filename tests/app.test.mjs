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
const cspErrors = [];
page.on("console", m => { if (/Content Security Policy|Content-Security-Policy/i.test(m.text())) cspErrors.push(m.text()); });
let offline = false;
await page.route("**/*", r => {
  const u = r.request().url();
  if (u.startsWith(APP)) return r.continue();
  if (offline) return r.abort();
  if (u.includes("routed-")) return r.fulfill({ json: M.routeJson(u) });
  if (u.includes("brouter.de")) return r.fulfill({ json: M.brouterJson(u) });
  if (u.includes("/v1/elevation")) return r.fulfill({ json: M.elevationJson(u) });
  if (u.includes("air-quality-api")) return r.fulfill({ json: M.airJson });
  if (u.includes("overpass-api")) return r.fulfill({ json: M.overpassJson });
  if (u.includes("open-meteo")) return r.fulfill({ json: M.weatherJson(u) });
  if (u.includes("photon.komoot.io/api")) return r.fulfill({ json: M.photonJson });
  if (u.includes("photon.komoot.io/reverse")) return r.fulfill({ json: M.reverseJson });
  if (u.includes("inmet")) return r.fulfill({ json: M.inmetJson });
  if (u.includes("weather-maps.json")) return r.fulfill({ json: M.radarJson() });
  if (u.includes("tilecache.rainviewer.com")) return r.fulfill({ status: 200, contentType: "image/png", headers: { "access-control-allow-origin": "*" }, body: M.emptyTile });
  return r.fulfill({ status: 204, body: "" });
});

await page.goto(APP);
await page.waitForTimeout(1200);

// primeira visita pelo navegador: a página de apresentação vem antes do app
assert.match(await page.textContent(".landing h1"), /Saiba onde vai chover/);
assert.match(await page.textContent("#termos"), /pessoal, gratuito e sem fins comerciais.*APIs públicas de uso gratuito/s);
assert.match(await page.textContent("#creditos"), /Open-Meteo.*OpenStreetMap.*RainViewer.*INMET.*GitHub Pages/s);
assert.match(await page.textContent("#privacidade"), /Sem conta.*LGPD.*art\. 18/s);
await page.click("#termos summary"); await page.waitForTimeout(200);
assert.ok(await page.evaluate(() => document.querySelector("#termos details").open), "os termos completos abrem ao tocar");
assert.ok(!(await page.evaluate(() => document.getElementById("welcome")?.open)), "as boas-vindas esperam a apresentação");
await page.click("#landing-start"); await page.waitForTimeout(500);
assert.ok(await page.locator(".landing").count() === 0, "Começar fecha a apresentação");

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
assert.match(await page.textContent(".local-meta"), /24% umidade.*ar bom/s);
assert.match(await page.textContent(".comfort"), /Umidade em 24%/);

// passar o mouse num botão de ícone mostra o que ele faz
await page.hover("#open-history"); await page.waitForTimeout(600);
assert.match(await page.textContent(".tip"), /Seus pedais/);
await page.mouse.move(200, 400); await page.waitForTimeout(200);
assert.ok(await page.locator(".tip").count() === 0, "a dica some ao tirar o mouse");

// radar sem chuva na área: o canto do mapa avisa, para o ▶ não parecer quebrado
await page.waitForTimeout(1200);
assert.match(await page.textContent("#radar-time"), /sem chuva por perto/);
// radar: no dia a dia só o quadro mais recente (poupa o limite de pedidos do RainViewer); a última hora só ao tocar ▶
const radarPanes = () => page.evaluate(() => [...document.querySelectorAll(".leaflet-radar-pane .leaflet-layer")].map(l => +getComputedStyle(l).opacity));
assert.deepEqual(await radarPanes(), [0.65], "sem animação, só a imagem mais recente é carregada");
const t0 = await page.textContent("#radar-time");
await page.evaluate(() => document.getElementById("radar-play").click()); await page.waitForTimeout(2300);
assert.match(await page.textContent("#radar-time"), /▶ radar/);
assert.notEqual(await page.textContent("#radar-time"), t0, "a animação muda o horário do radar");
const op = await radarPanes();
assert.ok(op.length > 1 && op.filter(o => o > 0).length === 1, "tocando ▶, os quadros da última hora ficam carregados e só um aparece: " + op);
await page.evaluate(() => document.getElementById("radar-play").click()); await page.waitForTimeout(300);
assert.deepEqual(await radarPanes(), [0.65], "ao parar, volta a só a imagem mais recente");

// no celular: segurar o dedo num botão mostra a dica e não aciona o botão
await page.evaluate(() => { const b = document.getElementById("open-history"), r = b.getBoundingClientRect(); b.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerType: "touch", clientX: r.x + 5, clientY: r.y + 5 })); });
await page.waitForTimeout(700);
assert.match(await page.textContent(".tip"), /Seus pedais/, "segurar o dedo mostra a dica");
await page.evaluate(() => { const b = document.getElementById("open-history"); b.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerType: "touch" })); b.click(); });
await page.waitForTimeout(300);
assert.ok(!(await page.evaluate(() => document.getElementById("history")?.open)), "o toque longo não abre o histórico");
await page.waitForTimeout(2600);

// "Sobre e privacidade" no rodapé reabre a apresentação, agora com "Voltar ao app"
await page.evaluate(() => document.getElementById("open-about").click()); await page.waitForTimeout(400);
assert.match(await page.textContent("#landing-start"), /Voltar ao app/);
await page.click("#landing-start"); await page.waitForTimeout(300);

// backup: exporta um arquivo e importa de volta (com confirmação)
await page.click("#open-settings"); await page.waitForTimeout(300);
const [dl] = await Promise.all([page.waitForEvent("download"), page.evaluate(() => document.getElementById("backup-export").click())]);
assert.match(dl.suggestedFilename(), /^pedagua-backup-\d{4}-\d{2}-\d{2}\.json$/);
const bkPath = await dl.path();
const bk = JSON.parse((await import("node:fs")).readFileSync(bkPath, "utf8"));
assert.equal(bk.app, "pedagua"); assert.ok(Array.isArray(bk.settings.home), "o backup traz a casa");
await page.setInputFiles("#backup-file", bkPath); await page.waitForTimeout(400);
assert.match(await page.textContent(".confirm-box"), /Substituir os dados/);
await page.evaluate(() => document.getElementById("backup-apply").click()); await page.waitForTimeout(300);
assert.match(await page.textContent("#backup-msg"), /Backup importado/);
await page.setInputFiles("#backup-file", { name: "x.json", mimeType: "application/json", buffer: Buffer.from("{}") }); await page.waitForTimeout(300);
assert.match(await page.textContent("#backup-msg"), /não é um backup/);
await page.click("#settings-done"); await page.waitForTimeout(300);

// relatar problema: relatório técnico sem coordenadas
await page.click("#open-settings"); await page.waitForTimeout(300);
await page.evaluate(() => document.getElementById("report").click()); await page.waitForTimeout(400);
const report = await page.inputValue(".report");
assert.match(report, /Pedágua \d+\.\d+\.\d+[\s\S]*Localização: ok/);
assert.ok(!/-15\.\d|-48\.\d|-47\.\d/.test(report), "o relatório não pode ter coordenadas");
await page.click("#settings-done"); await page.waitForTimeout(300);

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
assert.ok(await page.locator(".sc.recent").count() === 1, "o ponto usado vira atalho de destino recente");
// fechar sem querer: "Desfazer" reabre o trajeto
assert.ok(await page.locator("#undo").count() === 1, "fechar o trajeto oferece desfazer");
await page.evaluate(() => document.getElementById("undo").click()); await page.waitForTimeout(800);
assert.ok(await page.locator(".triphead").count() === 1, "desfazer reabre o trajeto");
await page.evaluate(() => document.querySelector('[aria-label="Fechar trajeto"]').click()); await page.waitForTimeout(500);

// montar o trajeto pelo atalho do trabalho
await page.evaluate(() => [...document.querySelectorAll(".sc")].find(b => b.textContent.includes("Trabalho")).click());
await page.waitForTimeout(1200);
assert.match(await page.textContent(".triphead"), /Você.*Trabalho/s);
assert.ok((await page.locator(".triphead").boundingBox()).height < 80, "o cabeçalho do trajeto cabe numa linha");
const title = await page.textContent("#v-title");
assert.ok(title && !/Carregando|Olhando/.test(title), "veredito do trajeto deve aparecer: " + title);
assert.ok((await page.locator("#timeline li").count()) >= 2, "linha do tempo deve ter trechos");
assert.ok((await page.locator(".rt").count()) >= 2, "deve listar rotas alternativas");
assert.match(await page.textContent("#routes"), /70% em ciclovia/);
assert.match(await page.textContent("#routes"), /mais ciclovia/);
// escolher a rota tocando nela no mapa (faixa larga, fácil de acertar com o dedo)
const before = await page.getAttribute('.rt[aria-checked="true"]', "data-i");
await page.evaluate(() => { const hits = [...document.querySelectorAll("path.route-hit")]; hits[0].dispatchEvent(new MouseEvent("click", { bubbles: true, clientX: 0, clientY: 0 })); });
await page.waitForTimeout(500);
assert.notEqual(await page.getAttribute('.rt[aria-checked="true"]', "data-i"), before, "tocar numa rota alternativa no mapa escolhe ela");
await page.evaluate(i => document.querySelector(`.rt[data-i="${i}"]`).click(), before); await page.waitForTimeout(400);
assert.match(await page.textContent("#alert"), /INMET/);
assert.ok(await page.evaluate(() => !document.getElementById("alert").classList.contains("compact")), "na primeira vez, o alerta aparece por inteiro");
assert.match(await page.textContent("#batt-txt"), /% da bateria/);
assert.ok((await page.locator(".rlabel").count()) >= 2, "cada rota deve ter etiqueta de tempo e chuva no mapa");

// chuva no caminho: procurar abrigo e passar por ele
await page.evaluate(() => document.getElementById("shelter-find").click()); await page.waitForTimeout(800);
assert.ok((await page.locator(".shelters li").count()) >= 1, "deve listar abrigos perto da chuva");
assert.match(await page.textContent(".shelters"), /Parada EPTG/);
await page.evaluate(() => document.querySelector(".shelters li .btn").click()); await page.waitForTimeout(1200);
assert.match(await page.textContent(".triphead"), /Passando por Parada EPTG/);

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

// planejar amanhã: o botão "Amanhã" muda a saída para o dia seguinte
await page.evaluate(() => document.getElementById("dep-tomorrow").click()); await page.waitForTimeout(400);
assert.equal(await page.getAttribute("#dep-tomorrow", "aria-pressed"), "true");
await page.evaluate(() => document.getElementById("dep-now").click()); await page.waitForTimeout(300);

// modo pedal: a bike aparece no mapa e o pedal termina ao chegar
await page.evaluate(() => document.getElementById("ride").click());
await page.waitForTimeout(800);
assert.ok(await page.locator(".bike-disc").count() === 1, "deve mostrar a bike no mapa durante o pedal");
assert.ok(await page.locator("#voice").count() === 1, "deve ter o botão de voz no pedal");
assert.ok(await page.locator("#dash").count() === 0, "o modo painel saiu: o mapa fica sempre visível");
assert.match(await page.textContent("#speedo"), /\d+\s*km\/h/, "velocímetro sobre o mapa durante o pedal");
assert.match(await page.textContent(".speedo-wind"), /contra|a favor|vento fraco/);
assert.match(await page.textContent("#next-turn"), /\d+(,\d)? (m|km).*(siga em frente|até Trabalho|vire|mantenha-se)/s, "cartão da próxima manobra no pedal");
assert.ok(await page.locator("#radar-play").count() === 0, "no pedal, sem a animação do radar para não poluir o mapa");
assert.ok(await page.evaluate(() => { const r = document.getElementById("ride").getBoundingClientRect(); return r.bottom <= innerHeight && r.top > 0; }), "o botão de encerrar fica visível sem abrir a gaveta");
// encerrar pede confirmação: "Continuar pedalando" mantém o pedal
await page.evaluate(() => document.getElementById("ride").click()); await page.waitForTimeout(300);
assert.ok(await page.evaluate(() => document.getElementById("end").open), "encerrar o pedal pede confirmação");
assert.match(await page.textContent("#end"), /Faltam \d+,\d km/);
await page.click("#end-cancel"); await page.waitForTimeout(300);
assert.ok(!(await page.evaluate(() => document.getElementById("end").open)) && await page.locator(".bike-disc").count() === 1, "continuar pedalando mantém o pedal");
assert.ok(await page.evaluate(() => !!document.querySelector("body > video")), "o vídeo da janela flutuante fica preparado ao iniciar o pedal");
assert.match(await page.textContent("#v-title"), /Chuva em|Seco até|Chuva no seu trecho/);
// visor do pedal: chuva à frente e chance; bússola girando o mapa com a direção
assert.ok(await page.locator("#s-ahead").count() === 1 && await page.locator("#s-prob").count() === 1, "o visor mostra a chuva à frente e a chance");
await ctx.setGeolocation({ latitude: -15.876 + 0.073 * 0.2, longitude: -48.093 + 0.137 * 0.2 }); await page.waitForTimeout(1200);
assert.ok(await page.locator("#compass").count() === 1, "botão de bússola no pedal");
assert.ok(await page.evaluate(() => Math.round(window.__pedaguaMap.getBearing()) !== 0), "no modo bússola o mapa gira com a direção");
assert.ok(await page.evaluate(() => { const b = document.querySelector(".bike-disc").getBoundingClientRect(), m = document.getElementById("map").getBoundingClientRect(), vis = m.height - parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--sheet") || "0"); return b.top + b.height / 2 - m.top > vis * 0.55; }), "no mapa bússola a bike fica mais para baixo, mostrando o caminho à frente");
// o app fechou no meio do pedal: ao reabrir, oferece continuar de onde parou
await page.waitForTimeout(10500); await ctx.setGeolocation({ latitude: -15.876 + 0.073 * 0.21, longitude: -48.093 + 0.137 * 0.21 }); await page.waitForTimeout(1200);
await page.reload(); await page.waitForTimeout(1800);
assert.match(await page.textContent("#resume-title"), /Continuar o pedal até Trabalho/);
await page.click("#resume-go"); await page.waitForTimeout(2000);
assert.ok(await page.locator(".bike-disc").count() === 1 && await page.locator("#resume-title").count() === 0, "continuar retoma o pedal");
assert.ok(await page.evaluate(() => { const r = JSON.parse(localStorage.getItem("pedalclima.ride.v1")); return r && Date.now() - r.startedAt > 10e3; }), "o pedal retomado mantém a hora de início");

// fora da rota por ~12 s: recalcula sozinho a partir de onde você está
await ctx.setGeolocation({ latitude: -15.876 + 0.073 * 0.3 + 0.006, longitude: -48.093 + 0.137 * 0.3 - 0.004 });
await page.waitForTimeout(1500);
assert.match(await page.textContent(".offroute"), /recalculando/);
await page.waitForTimeout(12500);
await ctx.setGeolocation({ latitude: -15.876 + 0.073 * 0.3 + 0.0062, longitude: -48.093 + 0.137 * 0.3 - 0.004 });
await page.waitForTimeout(2500);
await ctx.setGeolocation({ latitude: -15.876 + 0.073 * 0.3 + 0.0063, longitude: -48.093 + 0.137 * 0.3 - 0.0041 });
await page.waitForTimeout(1500);
assert.ok(await page.locator(".offroute").count() === 0, "depois do recálculo automático, você volta a estar na rota");
assert.ok(await page.locator(".bike-disc").count() === 1, "o pedal continua depois de recalcular");
const work = await page.evaluate(() => JSON.parse(localStorage.getItem("pedalclima.v1")).work);
await ctx.setGeolocation({ latitude: work[0], longitude: work[1] });
await page.waitForTimeout(1200);
assert.equal(await page.textContent("#v-title"), "Você chegou");
assert.ok(await page.evaluate(() => !!document.getElementById("fb")), "deve perguntar se a previsão acertou");
assert.match(await page.textContent(".summary"), /\d+,\d km.*\d+ min/s);
assert.ok(await page.locator("#share").count() === 1, "deve ter o botão de compartilhar o resumo");
// o pedal concluído entra no histórico
await page.click("#open-history"); await page.waitForTimeout(400);
assert.ok((await page.locator(".hist-list li").count()) >= 1, "o pedal deve aparecer em Seus pedais");
assert.match(await page.textContent(".hist-totals"), /Esta semana.*1 pedal/s);
assert.equal(await page.locator(".weeks-bars .wbar").count(), 8, "gráfico das últimas 8 semanas");
assert.match(await page.textContent(".weeks-sel"), /Esta semana: \d+,\d km · 1 pedal/);
assert.ok(await page.locator("#share-week").count() === 1, "botão de compartilhar a semana");
await page.evaluate(() => [...document.querySelectorAll("#history .dlg-foot .btn")][0].click()); await page.waitForTimeout(300);

// fechar o trajeto volta para a tela inicial
await page.evaluate(() => document.querySelector('[aria-label="Fechar trajeto"]').click());
await page.waitForTimeout(500);
assert.ok(await page.locator(".whereto").count() === 1, "deve voltar para a tela inicial");

// atalho do ícone do app: ?ir=trabalho abre o trajeto direto e limpa o endereço
await page.goto(APP + "?ir=trabalho"); await page.waitForTimeout(2000);
assert.match(await page.textContent(".triphead"), /Trabalho/);
assert.ok(!page.url().includes("ir="), "o endereço fica limpo depois do atalho");
assert.ok(await page.evaluate(() => document.getElementById("alert").classList.contains("compact")), "alerta do INMET já visto aparece numa linha só na próxima abertura");
await page.evaluate(() => document.querySelector('[aria-label="Fechar trajeto"]').click()); await page.waitForTimeout(500);

// ciclovias: liga o mapa CyclOSM e a escolha fica salva
await page.evaluate(() => document.getElementById("cycle-toggle").click()); await page.waitForTimeout(400);
assert.ok(await page.evaluate(() => document.getElementById("map").classList.contains("cycle")), "o mapa de ciclovias deve ligar");
assert.ok(await page.evaluate(() => JSON.parse(localStorage.getItem("pedalclima.v1")).cycleMap === true), "a escolha das ciclovias fica salva");

// sem conexão: o clima de onde você está continua aparecendo
offline = true;
await page.reload(); await page.waitForTimeout(1500);
assert.match(await page.textContent("#updated"), /sem conexão/);
assert.match(await page.textContent("#v-title"), /Seco por aqui|Chuva|aqui agora/);

assert.deepEqual(errors, [], "a página não deve ter erros de JavaScript");
assert.deepEqual(cspErrors, [], "nada bloqueado pela política de segurança (CSP)");
await browser.close();
stopping = true; server.kill();
console.log("app.test: ok");
