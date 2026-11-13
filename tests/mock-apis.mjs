// Respostas falsas das APIs externas, usadas pelos testes (nada sai para a internet).
const now = Math.floor(Date.now() / 900e3) * 900;
const day0 = Math.floor((now - 3 * 3600) / 86400) * 86400 + 3 * 3600;

export function routeJson(url) {
  const mk = (off, name) => { const c = []; for (let i = 0; i <= 60; i++) c.push([-48.093 + 0.137 * i / 60, -15.876 + 0.073 * i / 60 + off * Math.sin(Math.PI * i / 60)]);
    return { geometry: { coordinates: c }, legs: [{ summary: name }] }; };
  const routes = url.includes("routed-car") ? [mk(-0.012, "Via Expressa")] : url.includes("alternatives=") ? [mk(0, "Avenida Central"), mk(0.02, "Rua das Palmeiras")] : [mk(0.004, "Avenida Central, Rua P")];
  return { routes };
}
// chuva só na faixa central do trajeto
export function weatherJson(url) {
  const q = new URL(url).searchParams, lons = q.get("longitude").split(",");
  // como a API real: um ponto só vem como objeto, vários como lista
  const out = lons.map(lo => {
    const wet = +lo > -48.04 && +lo < -48.0, mt = [], mp = [];
    for (let k = -12; k < 96; k++) { mt.push(now + k * 900); mp.push(wet && k < 8 ? 0.6 : 0); }
    const ht = [], H = { precipitation_probability: [], precipitation: [], temperature_2m: [], apparent_temperature: [], relative_humidity_2m: [], weather_code: [], wind_speed_10m: [], wind_direction_10m: [], wind_gusts_10m: [], uv_index: [], is_day: [] };
    const h0 = Math.floor(now / 3600) * 3600;
    for (let k = -2; k < 24; k++) { ht.push(h0 + k * 3600); H.precipitation_probability.push(wet ? 70 : 10); H.precipitation.push(wet ? 2 : 0); H.temperature_2m.push(26); H.apparent_temperature.push(27); H.relative_humidity_2m.push(24);
      H.weather_code.push(wet ? 63 : 2); H.wind_speed_10m.push(14); H.wind_direction_10m.push(60); H.wind_gusts_10m.push(28); H.uv_index.push(5); H.is_day.push(1); }
    return { minutely_15: { time: mt, precipitation: mp }, hourly: { time: ht, ...H },
      daily: { sunrise: [day0 + 5 * 3600 + 2400, day0 + 86400 + 5 * 3600 + 2400], sunset: [day0 + 18 * 3600 + 720, day0 + 86400 + 18 * 3600 + 720] } };
  });
  return out.length === 1 ? out[0] : out;
}
export const elevationJson = url => { const n = new URL(url).searchParams.get("latitude").split(",").length; return { elevation: Array.from({ length: n }, (_, i) => 1150 + 60 * Math.sin(i / n * Math.PI * 2)) }; };
export const inmetJson = { hoje: [{ descricao: "Tempestade", severidade: "Perigo", geocodes: "5300108", inicio: "2026-01-01 10:00:00", fim: "2099-01-01 10:00:00" }], futuro: [] };
export const photonJson = { features: [{ geometry: { coordinates: [-47.99, -15.83] }, properties: { name: "Lugar Teste", street: "Rua 5", district: "Setor Y", city: "Brasília" } }] };
export const reverseJson = { features: [{ geometry: { coordinates: [0, 0] }, properties: { street: "Rua 9", district: "Bairro Z", city: "Cidade" } }] };
export const radarJson = () => { const now = Math.floor(Date.now() / 600e3) * 600; return { host: "https://tilecache.rainviewer.com", radar: { past: Array.from({ length: 6 }, (_, i) => ({ time: now - (6 - i) * 600, path: "/v2/radar/x" + i })) } }; };
export const overpassJson = { elements: [
  { type: "node", id: 11, lat: -15.8555, lon: -48.0345, tags: { highway: "bus_stop", shelter: "yes", name: "Parada EPTG" } },
  { type: "node", id: 12, lat: -15.857, lon: -48.031, tags: { amenity: "fuel", brand: "Posto Exemplo" } },
] };
export const airJson = { current: { us_aqi: 42, pm2_5: 9 } };
// BRouter: rotas de bicicleta com a fração em ciclovia nas mensagens
export function brouterJson(url) {
  const q = new URL(url).searchParams, idx = +q.get("alternativeidx") || 0
  const pts = q.get("lonlats").split("|").map(p => p.split(",").map(Number))
  const [a, b] = [pts[0], pts[pts.length - 1]], off = [0.003, 0.015, -0.01][idx] ?? 0, share = [0.7, 0.35, 0.5][idx] ?? 0
  const coords = []; for (let i = 0; i <= 60; i++) coords.push([a[0] + (b[0] - a[0]) * i / 60, a[1] + (b[1] - a[1]) * i / 60 + off * Math.sin(Math.PI * i / 60)]);
  const messages = [["Longitude", "Latitude", "Elevation", "Distance", "CostPerKm", "WayTags"], ["0", "0", "0", String(Math.round(share * 1000)), "1000", "highway=cycleway"], ["0", "0", "0", String(Math.round((1 - share) * 1000)), "1300", "highway=secondary"]];
  return { type: "FeatureCollection", features: [{ type: "Feature", geometry: { type: "LineString", coordinates: coords }, properties: { messages } }] };
}
// imagem do radar sem chuva (256x256 transparente)
export const emptyTile = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAYAAABccqhmAAABFUlEQVR42u3BMQEAAADCoPVP7WsIoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeAMBPAAB2ClDBAAAAABJRU5ErkJggg==", "base64");
// print de mentira de outro app: fundo de mapa e a rota azul em "L" (para importar)
export function routeShot() {
  const zlib = globalThis.__zlib, w = 360, h = 640, row = Buffer.alloc(1 + w * 4), rows = [];
  for (let y = 0; y < h; y++) {
    row[0] = 0;
    for (let x = 0; x < w; x++) {
      const onH = y >= 494 && y <= 506 && x >= 60 && x <= 300, onV = x >= 294 && x <= 306 && y >= 120 && y <= 506;
      const c = onH || onV ? [26, 115, 232] : (x % 40 < 3 || y % 40 < 3) ? [255, 255, 255] : [233, 236, 228];
      row.set([...c, 255], 1 + x * 4);
    }
    rows.push(Buffer.from(row));
  }
  const crc = b => { let c, t = []; for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } c = 0xffffffff; for (const x of b) c = t[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr.set([8, 6, 0, 0, 0], 8);
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(Buffer.concat(rows))), chunk("IEND", Buffer.alloc(0))]);
}
export const nominatimJson = [{ lat: "-15.95", lon: "-48.20", name: "Lugar Nominatim", address: { road: "Rua 7", suburb: "Bairro W", city: "Cidade" } }];
export const viacepJson = { cep: "72000-000", logradouro: "Rua 9", bairro: "Bairro Z", localidade: "Cidade", uf: "UF" };
