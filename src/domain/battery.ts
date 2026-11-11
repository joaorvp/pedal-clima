import type { Dir, ElevPoint, Evaluation, Route } from './types'

export function elevFor(route: Route | undefined, dir: Dir): ElevPoint[] | null {
  if (!route?.elev) return null
  return dir === 'ida' ? route.elev : route.elev.map(p => ({ km: route.total - p.km, z: p.z })).reverse()
}
export function climbs(prof: ElevPoint[]) {
  let up = 0, down = 0
  for (let i = 1; i < prof.length; i++) { const d = prof[i].z - prof[i - 1].z; if (d > 0) up += d; else down -= d }
  return { up, down }
}
/** Suaviza o ruído do modelo de terreno (média móvel de 3 pontos). */
export const smooth = (z: number[]) => z.map((v, i) => (z[Math.max(0, i - 1)] + v + z[Math.min(z.length - 1, i + 1)]) / 3)

/**
 * Estimativa simples de consumo da e-bike: consumo base por km, ajustado pelo vento,
 * mais a energia das subidas (100 kg, motor faz ~metade do esforço, 75% de eficiência).
 */
export function batteryEstimate(ev: Evaluation, total: number, prof: ElevPoint[] | null, whkm: number, batt: number) {
  const c = prof ? climbs(prof) : { up: 0, down: 0 }
  const wind = 1 + Math.max(-10, Math.min(25, ev.head)) * 0.015
  const climbWh = 100 * 9.81 * c.up / 3600 * 0.5 / 0.75
  const wh = (whkm || 10) * total * wind + climbWh
  return { wh, pct: Math.round(wh / (batt || 500) * 100), up: c.up, down: c.down }
}
