import { smooth } from '../domain/battery'
import { pointAt } from '../domain/geo'
import type { ElevPoint, PointWeather, Route, SunTimes } from '../domain/types'
import { readJson, writeJson } from './cache'

const HOURLY = 'precipitation_probability,precipitation,temperature_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,uv_index,is_day'

/** Uma chamada para todos os pontos de todas as rotas. */
export async function fetchWeather(routes: Route[]): Promise<{ perRoute: PointWeather[][]; sun: SunTimes | null }> {
  const all = routes.flatMap(r => r.samples)
  const p = new URLSearchParams({
    latitude: all.map(x => x.lat.toFixed(4)).join(','), longitude: all.map(x => x.lon.toFixed(4)).join(','),
    minutely_15: 'precipitation', past_minutely_15: '12', forecast_minutely_15: '96', hourly: HOURLY,
    past_hours: '2', forecast_hours: '24', daily: 'sunrise,sunset', forecast_days: '2', timeformat: 'unixtime', timezone: 'America/Sao_Paulo',
  })
  const r = await fetch('https://api.open-meteo.com/v1/forecast?' + p)
  if (!r.ok) throw new Error('previsão indisponível (HTTP ' + r.status + ')')
  let j = await r.json() as PointWeather | PointWeather[]
  if (!Array.isArray(j)) j = [j]
  let o = 0
  const perRoute = routes.map(rt => { const s = (j as PointWeather[]).slice(o, o + rt.samples.length); o += rt.samples.length; return s })
  return { perRoute, sun: j[0]?.daily ?? null }
}

/** Perfil de altitude com até 100 pontos (fica salvo: o relevo não muda). */
export async function fetchElevation(r: Route): Promise<ElevPoint[] | undefined> {
  const key = 'elev1:' + r.line.length + ':' + r.line[0] + ':' + r.line[r.line.length - 1] + ':' + r.total.toFixed(3)
  const cached = readJson<ElevPoint[]>(key)
  if (cached) return cached
  const n = Math.max(20, Math.min(100, Math.round(r.total / 0.2)))
  const pts = Array.from({ length: n }, (_, k) => { const km = r.total * k / (n - 1); return { km, p: pointAt(r.line, r.cum, km) } })
  try {
    const q = new URLSearchParams({ latitude: pts.map(x => x.p[0].toFixed(5)).join(','), longitude: pts.map(x => x.p[1].toFixed(5)).join(',') })
    const res = await fetch('https://api.open-meteo.com/v1/elevation?' + q); if (!res.ok) return undefined
    const z = (await res.json() as { elevation?: number[] }).elevation
    if (!Array.isArray(z) || z.length !== pts.length) return undefined
    const zs = smooth(z), elev = pts.map((x, i) => ({ km: x.km, z: zs[i] }))
    writeJson(key, elev)
    return elev
  } catch { return undefined }
}

/** Previsão de um único ponto (onde você está). */
export async function fetchLocalWeather(ll: [number, number]): Promise<PointWeather> {
  const p = new URLSearchParams({
    latitude: ll[0].toFixed(3), longitude: ll[1].toFixed(3),
    minutely_15: 'precipitation', past_minutely_15: '4', forecast_minutely_15: '16', hourly: HOURLY,
    past_hours: '1', forecast_hours: '6', timeformat: 'unixtime', timezone: 'America/Sao_Paulo',
  })
  const r = await fetch('https://api.open-meteo.com/v1/forecast?' + p)
  if (!r.ok) throw new Error('HTTP ' + r.status)
  const j = await r.json() as PointWeather | PointWeather[]
  const w = Array.isArray(j) ? j[0] : j
  if (!w?.hourly?.time) throw new Error('resposta sem previsão')
  return w
}
