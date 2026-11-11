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
    const ht = [], H = { precipitation_probability: [], precipitation: [], temperature_2m: [], apparent_temperature: [], weather_code: [], wind_speed_10m: [], wind_direction_10m: [], wind_gusts_10m: [], uv_index: [], is_day: [] };
    const h0 = Math.floor(now / 3600) * 3600;
    for (let k = -2; k < 24; k++) { ht.push(h0 + k * 3600); H.precipitation_probability.push(wet ? 70 : 10); H.precipitation.push(wet ? 2 : 0); H.temperature_2m.push(26); H.apparent_temperature.push(27);
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
export const radarJson = () => ({ host: "https://tilecache.rainviewer.com", radar: { past: [{ time: Math.floor(Date.now() / 1000) - 600, path: "/v2/radar/x" }] } });
export const overpassJson = { elements: [
  { type: "node", id: 11, lat: -15.8555, lon: -48.0345, tags: { highway: "bus_stop", shelter: "yes", name: "Parada EPTG" } },
  { type: "node", id: 12, lat: -15.857, lon: -48.031, tags: { amenity: "fuel", brand: "Posto Exemplo" } },
] };
