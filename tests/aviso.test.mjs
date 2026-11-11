// Testa o script de avisos com APIs simuladas.
import { strict as assert } from "node:assert";
import { routeJson, weatherJson, inmetJson } from "./mock-apis.mjs";

const sent = [];
let pollBody = "";
globalThis.fetch = async (u, opt) => {
  u = String(u);
  if (u.includes("/json?poll")) return new Response(pollBody);
  if (u.includes("routed-")) return Response.json(routeJson(u));
  if (u.includes("open-meteo")) return Response.json(weatherJson(u));
  if (u.includes("inmet")) return Response.json(inmetJson);
  if (u === "https://ntfy.sh/") { sent.push(JSON.parse(opt.body)); return new Response("{}"); }
  return new Response("", { status: 404 });
};
const brt = new Date(Date.now() - 3 * 3600e3 + 20 * 60e3);
Object.assign(process.env, {
  PEDAL_TOPIC: "teste", PEDAL_CASA: "-15.876,-48.093", PEDAL_TRABALHO: "-15.803,-47.956",
  PEDAL_IDA: String(brt.getUTCHours()).padStart(2, "0") + ":" + String(brt.getUTCMinutes()).padStart(2, "0"), PEDAL_URL: "https://exemplo/"
});
const realExit = process.exit; process.exit = c => { throw { exit: c }; };
async function run() { try { await import("../.github/scripts/aviso.mjs?" + Math.random()); } catch (e) { if (!("exit" in e)) throw e; } }

await run();
assert.equal(sent.length, 1, "deve enviar um aviso quando há chuva no trajeto");
assert.match(sent[0].title, /Ida .* · Leve a capa/);
assert.match(sent[0].message, /INMET: Tempestade/);
assert.equal(sent[0].actions[0].label, "Abrir trajeto");

const tag = sent[0].tags.find(t => /-n\d$/.test(t));
pollBody = JSON.stringify({ tags: [tag] }) + "\n";
await run();
assert.equal(sent.length, 1, "não deve repetir o aviso no mesmo nível");

process.exit = realExit;
console.log("aviso.test: ok");
