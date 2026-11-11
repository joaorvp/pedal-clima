import type { RideRecord } from './history'

/**
 * Média real de porta a porta (com semáforos e paradas), dos últimos pedais válidos.
 * É o que acerta a hora de chegada; a velocidade "de cruzeiro" erra para menos.
 */
export function learnedSpeed(history: RideRecord[]): { kmh: number; n: number } | null {
  const ok = history.filter(h => h.km >= 1.5 && h.mins >= 5 && h.avg >= 6 && h.avg <= 45).slice(0, 10)
  if (ok.length < 2) return null
  const km = ok.reduce((s, h) => s + h.km, 0), hours = ok.reduce((s, h) => s + h.mins / 60, 0)
  return { kmh: Math.round(km / hours * 10) / 10, n: ok.length }
}

/**
 * Velocidade para estimar a chegada durante o pedal, medida pelo celular:
 * o seu ritmo atual em movimento, descontando a fração do tempo que você ficou parado neste pedal
 * (semáforos, cruzamentos). Até ter dados (~0,8 km), usa a sua média aprendida.
 */
export function rideSpeedFrom(ride: { dist: number; startedAt: number; last: { t: number } | null; moving?: number; pace?: number } | null | undefined, base: number): number {
  if (!ride?.last) return base
  const hours = (ride.last.t - ride.startedAt) / 3600e3
  if (ride.dist < 0.8 || hours < 3 / 60) return base
  let now: number
  if (ride.pace && ride.moving && ride.pace > 4) {
    // parado = tempo total menos tempo em movimento; no começo, assume o desconto típico
    const stopShare = hours >= 5 / 60 ? Math.min(0.6, Math.max(0, 1 - ride.moving / hours)) : 0.18
    now = ride.pace * (1 - stopShare)
  } else now = ride.dist / hours
  now = Math.min(45, Math.max(6, now))
  const w = Math.min(0.9, ride.dist / 3) // quanto mais pedalou, mais vale o que o celular mediu
  return now * w + base * (1 - w)
}
