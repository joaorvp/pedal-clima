// Verifica a chuva ao longo do trajeto e envia um aviso pelo ntfy.
// Não imprime coordenadas: os logs de repositórios públicos são públicos.
const env = process.env;
const parsePt = s => { const p = (s || "").split(",").map(Number); return p.length === 2 && p.every(Number.isFinite) ? p : null; };
const HOME = parsePt(env.PEDAL_CASA), WORK = parsePt(env.PEDAL_TRABALHO), VIA = parsePt(env.PEDAL_PASSAR);
const TOPIC = (env.PEDAL_TOPIC || "").trim();
const SPEED = Math.max(5, +env.PEDAL_VELOCIDADE || 22);
const LEAD = +env.PEDAL_ANTECEDENCIA || 45;
const PROB = Math.max(30, Math.min(80, +env.PEDAL_CHANCE || 50));
const ALWAYS = env.PEDAL_SEMPRE === "1" || env.PEDAL_SEMPRE === "true";
const FORCE = env.FORCAR === "true";
const URL_APP = env.PEDAL_URL || "";

if (!TOPIC || !HOME || !WORK) { console.log("Faltam secrets: PEDAL_TOPIC, PEDAL_CASA e PEDAL_TRABALHO são obrigatórios."); process.exit(FORCE ? 1 : 0); }

// Horário de Brasília (UTC-3, sem horário de verão)
const OFFSET = -3 * 60;
const nowMs = Date.now();
const brt = new Date(nowMs + OFFSET * 60e3);
const nowMin = brt.getUTCHours() * 60 + brt.getUTCMinutes();
const dateKey = brt.toISOString().slice(0, 10).replace(/-/g, "");
const toMin = t => { const m = /^(\d{1,2}):(\d{2})$/.exec((t || "").trim()); return m ? +m[1] * 60 + +m[2] : null; };
const depEpoch = min => { let d = Date.UTC(brt.getUTCFullYear(), brt.getUTCMonth(), brt.getUTCDate(), 0, min) - OFFSET * 60e3; if (d < nowMs - 30 * 60e3) d += 864e5; return d; };

const plans = [["ida", toMin(env.PEDAL_IDA)], ["volta", toMin(env.PEDAL_VOLTA)]].filter(([, m]) => m != null);
let pick = null;
for (const [dir, m] of plans) { const diff = m - nowMin; if (diff > 0 && diff <= LEAD) pick = { dir, dep: depEpoch(m) }; }
if (!pick && FORCE) {
  const next = plans.map(([dir, m]) => ({ dir, dep: depEpoch(m) })).sort((a, b) => a.dep - b.dep)[0];
  pick = next || { dir: brt.getUTCHours() < 12 ? "ida" : "volta", dep: nowMs };
}
if (!pick) { console.log("Fora da janela de aviso."); process.exit(0); }
const tag = `pedal-${pick.dir}-${dateKey}`;

// Já avisou essa saída hoje? Guarda o nível enviado para mandar uma atualização só se piorar.
let prevLevel = 0;
if (!FORCE) {
  try {
    const r = await fetch(`https://ntfy.sh/${encodeURIComponent(TOPIC)}/json?poll=1&since=4h`);
    const txt = r.ok ? await r.text() : "";
    for (const l of txt.split("\n")) { if (!l.includes(tag)) continue; const m = l.match(new RegExp(tag + "-n(\\d)")); prevLevel = Math.max(prevLevel, m ? +m[1] : 9); }
  } catch { /* segue */ }
}

// Geometria
const toRad = d => d * Math.PI / 180;
const hav = (a, b) => { const dLa = toRad(b[0] - a[0]), dLo = toRad(b[1] - a[1]); const x = Math.sin(dLa / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLo / 2) ** 2; return 12742 * Math.asin(Math.sqrt(x)); };
const brg = (a, b) => { const y = Math.sin(toRad(b[1] - a[1])) * Math.cos(toRad(b[0])); const x = Math.cos(toRad(a[0])) * Math.sin(toRad(b[0])) - Math.sin(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.cos(toRad(b[1] - a[1])); return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360; };

const pts = [HOME, VIA, WORK].filter(Boolean);
let line = pts;
try {
  const coords = pts.map(p => p[1] + "," + p[0]).join(";");
  const r = await fetch(`https://routing.openstreetmap.de/routed-bike/route/v1/driving/${coords}?overview=full&geometries=geojson`);
  const j = await r.json(); if (j.routes?.[0]) line = j.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
} catch { console.log("Rota de bike indisponível; usando linha reta."); }
if (pick.dir === "volta") line = [...line].reverse();

const cum = [0]; for (let i = 1; i < line.length; i++) cum.push(cum[i - 1] + hav(line[i - 1], line[i]));
const total = cum.at(-1), step = Math.max(1.2, total / 18), S = [];
for (let d = 0, i = 0; ; d = Math.min(total, d + step)) {
  while (i < line.length - 2 && cum[i + 1] < d) i++;
  const a = line[i], b = line[i + 1] || a, seg = (cum[i + 1] ?? cum[i]) - cum[i], f = seg > 0 ? (d - cum[i]) / seg : 0;
  S.push({ lat: a[0] + (b[0] - a[0]) * f, lon: a[1] + (b[1] - a[1]) * f, km: d, brg: brg(a, b) });
  if (d >= total) break;
}
const viaKm = VIA ? S.reduce((best, s) => { const dd = hav([s.lat, s.lon], VIA); return dd < best.d ? { d: dd, km: s.km } : best; }, { d: Infinity, km: null }) : null;
const place = d => d < 1 ? "na saída" : d > total - 1 ? "na chegada" : viaKm && viaKm.d < 3 && Math.abs(d - viaKm.km) < 1.5 ? "no ponto P" : `no km ${Math.round(d)}`;

// Previsão
const q = new URLSearchParams({
  latitude: S.map(s => s.lat.toFixed(4)).join(","), longitude: S.map(s => s.lon.toFixed(4)).join(","),
  minutely_15: "precipitation", past_minutely_15: "12", forecast_minutely_15: "96",
  hourly: "precipitation_probability,precipitation,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m",
  past_hours: "2", forecast_hours: "24", daily: "sunrise,sunset", forecast_days: "2", timeformat: "unixtime", timezone: "America/Sao_Paulo"
});
const wr = await fetch("https://api.open-meteo.com/v1/forecast?" + q);
if (!wr.ok) { console.log("Open-Meteo HTTP " + wr.status); process.exit(1); }
let W = await wr.json(); if (!Array.isArray(W)) W = [W];

const idxAt = (ts, t) => { const k = ts.findIndex(x => x >= t); return k < 0 ? ts.length - 1 : k; };
const rate = (i, ms) => { const m = W[i].minutely_15, t = ms / 1000; if (m && t <= m.time.at(-1)) return (m.precipitation[idxAt(m.time, t)] ?? 0) * 4; return W[i].hourly.precipitation[idxAt(W[i].hourly.time, t)] ?? 0; };
const hv = (i, ms, k) => W[i].hourly[k][idxAt(W[i].hourly.time, ms / 1000)] ?? 0;

let exposure = 0, maxRate = 0, maxProb = 0, storm = false, head = 0, gust = 0, first = null;
for (let k = 0; k < S.length - 1; k++) {
  const a = S[k], b = S[k + 1], len = b.km - a.km, t = pick.dep + (a.km + b.km) / 2 / SPEED * 3600e3;
  const r = (rate(k, t) + rate(k + 1, t)) / 2;
  exposure += r * len / SPEED; maxRate = Math.max(maxRate, r); maxProb = Math.max(maxProb, hv(k, t, "precipitation_probability"), hv(k + 1, t, "precipitation_probability"));
  storm ||= Math.max(hv(k, t, "weather_code"), hv(k + 1, t, "weather_code")) >= 95;
  head += hv(k, t, "wind_speed_10m") * Math.cos(toRad(hv(k, t, "wind_direction_10m") - a.brg)) * len;
  gust = Math.max(gust, hv(k, t, "wind_gusts_10m"));
  if (!first && r >= 0.2) first = { km: a.km, t, r };
}
head /= total;
let wet = { v: 0, km: 0 };
S.forEach((s, i) => { const m = W[i].minutely_15; let v = 0; m?.time.forEach((t, k) => { if (t * 1000 <= nowMs && t * 1000 > nowMs - 3 * 3600e3) v += m.precipitation[k] || 0; }); if (v > wet.v) wet = { v, km: s.km }; });

const hhmm = ms => { const d = new Date(ms + OFFSET * 60e3); return String(d.getUTCHours()).padStart(2, "0") + ":" + String(d.getUTCMinutes()).padStart(2, "0"); };
const f1 = n => n.toFixed(1).replace(".", ",");
const rainy = exposure >= 0.15 || maxRate >= 0.5 || maxProb >= PROB;
const arrMs = pick.dep + total / SPEED * 3600e3;

// Pôr / nascer do sol
let darkLine = "";
const sun = W[0]?.daily;
if (sun?.sunset) for (let i = 0; i < sun.sunset.length && !darkLine; i++) {
  const set = sun.sunset[i] * 1000, rise = sun.sunrise[i] * 1000;
  if (arrMs > set - 600e3 && pick.dep < set + 6 * 3600e3) darkLine = `Escurece às ${hhmmEarly(set)}: farol e luz traseira ligados.`;
  else if (pick.dep < rise + 600e3 && arrMs > rise - 6 * 3600e3) darkLine = `Amanhece às ${hhmmEarly(rise)}: farol e luz traseira ligados.`;
}
function hhmmEarly(ms) { const d = new Date(ms - 3 * 3600e3); return String(d.getUTCHours()).padStart(2, "0") + ":" + String(d.getUTCMinutes()).padStart(2, "0"); }

// Alertas oficiais do INMET para o DF (IBGE 5300108)
let alert = null;
try {
  const ar = await fetch("https://apiprevmet3.inmet.gov.br/avisos/ativos");
  if (ar.ok) {
    const j = await ar.json(), list = Array.isArray(j) ? j : [...(j.hoje || []), ...(j.futuro || [])];
    const pd = v => { if (!v) return NaN; const t = String(v).trim().replace(" ", "T"); return Date.parse(/[zZ]|[+-]\d\d:?\d\d$/.test(t) ? t : t + "-03:00"); };
    alert = list.find(a => {
      const here = String(a.geocodes || a.geocode || "").includes("5300108") || /bras[ií]lia/i.test(String(a.municipios || "")) || /distrito federal/i.test(String(a.estados || ""));
      const end = pd(a.fim || a.data_fim), start = pd(a.inicio || a.data_inicio);
      return here && (isNaN(end) || end > pick.dep) && (isNaN(start) || start < arrMs);
    }) || null;
  }
} catch { console.log("Alertas do INMET indisponíveis."); }
let level, title; const lines = [];
if (storm) { level = 5; title = "Trovoada no caminho. Melhor esperar"; }
else if (maxRate >= 4) { level = 4; title = "Chuva forte no trajeto"; }
else if (rainy) { level = 4; title = "Leve a capa"; }
else if (wet.v >= 0.5) { level = 3; title = "Seco, mas a pista está molhada"; }
else { level = 2; title = "Pode ir tranquilo"; }
if (alert && level < 4) { level = 4; if (!rainy && !storm) title = "Alerta do INMET para o DF"; }

if (first) lines.push(`Chuva ${place(first.km)} por volta de ${hhmm(first.t)}, até ${f1(maxRate)} mm/h.`);
else if (rainy) lines.push(`Até ${maxProb}% de chance de chuva no trajeto.`);
if (rainy) lines.push(exposure >= 0.05 ? `~${f1(exposure)} mm no trajeto. Capa na bateria e na mochila.` : "Capa na bateria e na mochila.");
if (wet.v >= 0.5) lines.push(`Choveu ${f1(wet.v)} mm nas últimas 3 h ${place(wet.km)}.`);
if (head >= 12) lines.push(`Vento contra de ~${Math.round(head)} km/h.`);
if (gust >= 40) lines.push(`Rajadas de até ${Math.round(gust)} km/h.`);
if (alert) lines.push(`INMET: ${alert.descricao || alert.evento || "alerta meteorológico"}${alert.severidade ? " (" + alert.severidade + ")" : ""}.`);
if (darkLine) lines.push(darkLine);
if (!lines.length || (lines.length === 1 && darkLine)) lines.unshift(`Sem chuva prevista até a chegada (~${hhmm(arrMs)}).`);

const update = prevLevel > 0;
const send = FORCE || (update ? level > prevLevel && level >= 3 : (level >= 3 || ALWAYS));
console.log(`${pick.dir} ${hhmm(pick.dep)}: ${title} (nível ${level})${send ? (update ? ", piorou desde o último aviso" : "") : update ? ". Já avisado." : ". Seco, sem aviso."}`);
if (!send) process.exit(0);

const res = await fetch("https://ntfy.sh/", {
  method: "POST",
  body: JSON.stringify({
    topic: TOPIC,
    title: `${update ? "Atualização: " : ""}${pick.dir === "ida" ? "Ida" : "Volta"} ${hhmm(pick.dep)} · ${title}`,
    message: lines.join("\n"),
    priority: level,
    tags: [storm ? "zap" : rainy ? "umbrella" : wet.v >= 0.5 ? "droplet" : "sunny", tag, `${tag}-n${level}`],
    ...(URL_APP ? { click: URL_APP, actions: [{ action: "view", label: "Abrir trajeto", url: URL_APP, clear: true }] } : {})
  })
});
console.log(res.ok ? "Aviso enviado." : "Falha ao enviar: HTTP " + res.status);
if (!res.ok) process.exit(1);
