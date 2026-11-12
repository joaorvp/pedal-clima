import { toRad } from './geo'
import type { Dir, Evaluation, Hourly, OrderedSample, PointWeather, Route, Seg, SunTimes } from './types'

export const CATS = [
  { label: 'seco', color: '--r0' },
  { label: 'garoa', color: '--r1' },
  { label: 'chuva moderada', color: '--r2' },
  { label: 'chuva forte', color: '--r3' },
  { label: 'chuva muito forte', color: '--r4' },
] as const
export const cat = (r: number) => r < 0.1 ? 0 : r < 1 ? 1 : r < 4 ? 2 : r < 10 ? 3 : 4

const idxAt = (times: number[], t: number) => { const k = times.findIndex(x => x >= t); return k < 0 ? times.length - 1 : k }
function nearest(times: number[], t: number) {
  let b = 0, bd = Infinity
  times.forEach((x, k) => { const d = Math.abs(x - t); if (d < bd) { bd = d; b = k } })
  return b
}

/** Intensidade de chuva (mm/h) prevista num ponto num horário. */
export function rateAt(w: PointWeather, ms: number): number {
  const t = ms / 1000, m = w.minutely_15
  if (m && m.time.length && t <= m.time[m.time.length - 1]) return (m.precipitation[idxAt(m.time, t)] ?? 0) * 4
  return w.hourly.precipitation[idxAt(w.hourly.time, t)] ?? 0
}
export function hourlyAt(w: PointWeather, ms: number, key: keyof Omit<Hourly, 'time'>): number | null {
  const arr = w.hourly[key]
  return arr ? arr[nearest(w.hourly.time, ms / 1000)] ?? null : null
}
export const probAt = (w: PointWeather, ms: number) => w.hourly.precipitation_probability[idxAt(w.hourly.time, ms / 1000)] ?? 0

/** Chuva acumulada (mm) nas últimas 3 h num ponto. */
export function pastRain(w: PointWeather, nowMs: number): number {
  const m = w.minutely_15, now = nowMs / 1000
  let s = 0
  if (m) m.time.forEach((t, k) => { if (t <= now && t > now - 3 * 3600) s += m.precipitation[k] || 0 })
  return s
}

export function ordered(route: Route, dir: Dir): OrderedSample[] {
  const T = route.total
  return dir === 'ida'
    ? route.samples.map((s, i) => ({ ...s, wi: i, d: s.km }))
    : route.samples.map((s, i) => ({ ...s, wi: i, d: T - s.km, brg: (s.brg + 180) % 360 })).reverse()
}

/** Avalia o trajeto saindo em `depMs`: chuva em cada trecho no horário em que você passa por ele. */
/**
 * Velocidade com o vento: contra, o ciclista perde ~0,35 km/h por km/h de vento (medido a 10 m de altura);
 * a favor, ganha ~0,2. Limitado entre 55% e 125% da velocidade de base.
 */
export function windSpeed(speed: number, head: number): number {
  const v = speed - (head > 0 ? 0.35 : 0.2) * head
  return Math.min(speed * 1.25, Math.max(speed * 0.55, v))
}

/**
 * Avalia o trajeto saindo em `depMs`. Cada trecho é percorrido na velocidade de base ajustada pelo vento daquele
 * trecho (opts.wind = false desliga, como no pedal, em que o ritmo medido já inclui o vento real).
 */
export function evaluate(route: Route, dir: Dir, depMs: number, speed: number, opts: { wind?: boolean } = {}): Evaluation {
  const wx = route.wx ?? [], sp = Math.max(5, speed || 22), pts = ordered(route, dir), segs: Seg[] = [], useWind = opts.wind !== false
  let exposure = 0, maxRate = 0, maxProb = 0, storm = false, headSum = 0, gustMax = 0, elapsed = 0, covered = 0
  for (let k = 0; k < pts.length - 1; k++) {
    const a = pts[k], b = pts[k + 1], wa = wx[a.wi], wb = wx[b.wi], len = b.d - a.d
    if (!wa || !wb) { elapsed += len / sp * 3600e3; covered += len; continue }
    const t0 = depMs + elapsed + len / 2 / sp * 3600e3
    const head = (hourlyAt(wa, t0, 'wind_speed_10m') ?? 0) * Math.cos(toRad((hourlyAt(wa, t0, 'wind_direction_10m') ?? 0) - a.brg))
    const v = useWind ? windSpeed(sp, head) : sp, tA = depMs + elapsed, t = tA + len / 2 / v * 3600e3
    const rate = (rateAt(wa, t) + rateAt(wb, t)) / 2, prob = Math.max(probAt(wa, t), probAt(wb, t))
    const code = Math.max(hourlyAt(wa, t, 'weather_code') ?? 0, hourlyAt(wb, t, 'weather_code') ?? 0)
    exposure += rate * (len / v); maxRate = Math.max(maxRate, rate); maxProb = Math.max(maxProb, prob)
    storm = storm || code >= 95; headSum += head * len; gustMax = Math.max(gustMax, hourlyAt(wa, t, 'wind_gusts_10m') ?? 0)
    segs.push({ a, b, from: a.d, to: b.d, t, tA, rate, prob, code })
    elapsed += len / v * 3600e3; covered += len
  }
  const dur = elapsed + Math.max(0, route.total - covered) / sp * 3600e3
  return { segs, exposure, maxRate, maxProb, storm, head: route.total ? headSum / route.total : 0, gustMax, dur, arr: depMs + dur, depMs }
}

export const isRainy = (ev: Evaluation, probTh = 50) => ev.exposure >= 0.15 || ev.maxRate >= 0.5 || ev.maxProb >= probTh

/** Primeira saída (até 6 h à frente) em que o trajeto fica seco. */
export function clearTime(route: Route, dir: Dir, fromMs: number, speed: number): number | null {
  for (let k = 1; k <= 24; k++) {
    const t = Math.ceil(fromMs / 900e3) * 900e3 + (k - 1) * 900e3, e = evaluate(route, dir, t, speed)
    if (e.exposure < 0.1 && e.maxRate < 0.3 && !e.storm) return t
  }
  return null
}

/** Se a viagem pega o escuro, devolve o pôr ou nascer do sol relevante. */
export function darkness(sun: SunTimes | null | undefined, ev: Evaluation): { kind: 'set' | 'rise'; t: number; full: boolean } | null {
  if (!sun?.sunset) return null
  const dep = ev.depMs / 1000, arr = ev.arr / 1000, M = 600
  for (let i = 0; i < sun.sunset.length; i++) {
    const rise = sun.sunrise[i], set = sun.sunset[i]
    if (arr > set - M && dep < set + 6 * 3600) return { kind: 'set', t: set * 1000, full: dep > set }
    if (dep < rise + M && arr > rise - 6 * 3600) return { kind: 'rise', t: rise * 1000, full: arr < rise }
  }
  return null
}
