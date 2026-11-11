import { prepRoute } from './routes'
import type { LatLon, PointWeather, Route } from './types'

/** Rota reta de ~17 km com chuva só na faixa central, para os testes. */
export function sampleRoute(nowSec = Math.floor(Date.now() / 900e3) * 900, rainy = true): Route {
  const line: LatLon[] = Array.from({ length: 61 }, (_, i) => [-15.876 + 0.073 * i / 60, -48.093 + 0.137 * i / 60])
  const r = prepRoute({ line, roads: ['Avenida Central'], profile: 'bike', viaP: false }, null)
  r.wx = r.samples.map(s => weatherAt(s.lon, nowSec, rainy))
  return r
}
export function weatherAt(lon: number, now: number, rainy: boolean): PointWeather {
  const wet = rainy && lon > -48.04 && lon < -48.0, mt: number[] = [], mp: number[] = []
  for (let k = -12; k < 96; k++) { mt.push(now + k * 900); mp.push(wet && k < 8 ? 0.6 : 0) }
  const h0 = Math.floor(now / 3600) * 3600, n = 26, time = Array.from({ length: n }, (_, k) => h0 + (k - 2) * 3600)
  const fill = (v: number) => Array(n).fill(v)
  return {
    minutely_15: { time: mt, precipitation: mp },
    hourly: { time, precipitation_probability: fill(wet ? 70 : 10), precipitation: fill(wet ? 2 : 0), temperature_2m: fill(26), apparent_temperature: fill(27),
      weather_code: fill(wet ? 63 : 2), wind_speed_10m: fill(14), wind_direction_10m: fill(60), wind_gusts_10m: fill(28), uv_index: fill(5), is_day: fill(1) },
  }
}
