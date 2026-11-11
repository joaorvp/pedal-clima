import { cumulative, hav } from './geo'
import type { LatLon } from './types'

/** Rota que você salvou com nome (desenhada no mapa ou gravada num pedal). */
export interface SavedRoute { id: string; name: string; line: LatLon[]; km: number; createdAt: number }

/** Simplifica o traçado (Douglas-Peucker): tira pontos que se desviam menos de `tol` km da reta entre os vizinhos. */
export function simplify(line: LatLon[], tol = 0.008): LatLon[] {
  if (line.length < 3) return line.slice()
  const lat0 = line[0][0] * Math.PI / 180, kx = 111.32 * Math.cos(lat0), ky = 110.57
  const xy = line.map(p => [p[1] * kx, p[0] * ky])
  const keep = new Uint8Array(line.length); keep[0] = keep[line.length - 1] = 1
  const stack: [number, number][] = [[0, line.length - 1]]
  while (stack.length) {
    const [a, b] = stack.pop()!
    const [ax, ay] = xy[a], [bx, by] = xy[b], dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy
    let far = -1, fd = tol
    for (let i = a + 1; i < b; i++) {
      const [px, py] = xy[i]
      const t = l2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2)) : 0
      const d = Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
      if (d > fd) { fd = d; far = i }
    }
    if (far > 0) { keep[far] = 1; stack.push([a, far], [far, b]) }
  }
  return line.filter((_, i) => keep[i]).map(p => [+p[0].toFixed(5), +p[1].toFixed(5)] as LatLon)
}

/** Comprimento do traçado em km. */
export const lineKm = (line: LatLon[]) => cumulative(line).at(-1) ?? 0

/**
 * Rotas salvas que servem para este trajeto: começam perto da origem e terminam perto do destino
 * (ou o contrário, e aí a rota é usada de trás para frente).
 */
export function matchSaved(list: SavedRoute[], o: LatLon, d: LatLon, maxKm = 0.6): { route: SavedRoute; line: LatLon[] }[] {
  const out: { route: SavedRoute; line: LatLon[] }[] = []
  for (const r of list) {
    if (r.line.length < 2) continue
    const a = r.line[0], b = r.line[r.line.length - 1]
    if (hav(a, o) <= maxKm && hav(b, d) <= maxKm) out.push({ route: r, line: r.line })
    else if (hav(b, o) <= maxKm && hav(a, d) <= maxKm) out.push({ route: r, line: r.line.slice().reverse() })
  }
  return out
}

/**
 * Grava o caminho do pedal: um ponto a cada ~20 m. `plausible` diz se o passo desde a leitura anterior do GPS
 * é possível de bike (acima de 70 km/h é salto do GPS e fica de fora). O salto é medido entre leituras seguidas,
 * não desde o último ponto gravado, para a gravação voltar depois de uma falha ou de reabrir o app mais à frente.
 */
export function appendTrack(track: LatLon[], pos: LatLon, plausible: boolean): LatLon[] {
  const last = track[track.length - 1]
  if (!last) return [[+pos[0].toFixed(5), +pos[1].toFixed(5)]]
  if (!plausible || hav(last, pos) < 0.02 || track.length >= 4000) return track
  return [...track, [+pos[0].toFixed(5), +pos[1].toFixed(5)]]
}
