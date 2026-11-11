import type { LatLon, Sample } from './types'

export const toRad = (d: number) => d * Math.PI / 180
const toDeg = (r: number) => r * 180 / Math.PI

/** Distância em km entre dois pontos. */
export function hav(a: LatLon, b: LatLon): number {
  const dLa = toRad(b[0] - a[0]), dLo = toRad(b[1] - a[1])
  const x = Math.sin(dLa / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLo / 2) ** 2
  return 12742 * Math.asin(Math.sqrt(x))
}

export function bearing(a: LatLon, b: LatLon): number {
  const y = Math.sin(toRad(b[1] - a[1])) * Math.cos(toRad(b[0]))
  const x = Math.cos(toRad(a[0])) * Math.sin(toRad(b[0])) - Math.sin(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.cos(toRad(b[1] - a[1]))
  return (toDeg(Math.atan2(y, x)) + 360) % 360
}

export function cumulative(line: LatLon[]): number[] {
  const cum = [0]
  for (let i = 1; i < line.length; i++) cum.push(cum[i - 1] + hav(line[i - 1], line[i]))
  return cum
}

/** Pontos a cada ~1,2 km (no máximo ~19) para consultar a previsão. */
export function buildSamples(line: LatLon[]): { samples: Sample[]; total: number } {
  const cum = cumulative(line), total = cum[cum.length - 1], step = Math.max(1.2, total / 18), out: Sample[] = []
  let next = 0, i = 0
  while (next <= total + 1e-9) {
    while (i < line.length - 1 && cum[i + 1] < next) i++
    const a = line[i], b = line[Math.min(i + 1, line.length - 1)], seg = (cum[i + 1] ?? cum[i]) - cum[i], f = seg > 0 ? (next - cum[i]) / seg : 0
    out.push({ lat: a[0] + (b[0] - a[0]) * f, lon: a[1] + (b[1] - a[1]) * f, km: next, ri: i, brg: bearing(a, b) })
    if (next === total) break
    next = Math.min(total, next + step)
  }
  return { samples: out, total }
}

/** Remove "bicos" de ida e volta: o roteador vai até um ponto fora da via e volta pelo mesmo caminho. */
export function removeSpurs(line: LatLon[]): LatLon[] {
  const out = line.slice()
  for (let guard = 0; guard < 80; guard++) {
    const cum = cumulative(out)
    let done = true
    for (let i = 0; i < out.length && done; i++) {
      let cut = -1
      for (let j = i + 2; j < out.length && cum[j] - cum[i] < 3; j++) if (hav(out[i], out[j]) < 0.03) cut = j
      if (cut > 0 && cum[cut] - cum[i] > 0.06) { out.splice(i + 1, cut - i); done = false }
    }
    if (done) break
  }
  return out
}

/** Fração dos pontos de `a` que ficam a menos de 80 m de `b`. */
export function similar(a: LatLon[], b: LatLon[]): number {
  const step = Math.max(1, Math.floor(a.length / 40))
  const bs = b.filter((_, i) => i % Math.max(1, Math.floor(b.length / 300)) === 0)
  let near = 0, n = 0
  for (let i = 0; i < a.length; i += step) { n++; if (bs.some(q => hav(a[i], q) < 0.08)) near++ }
  return n ? near / n : 0
}

/** Posição → km ao longo da linha e distância até ela (km). */
export function project(pos: LatLon, line: LatLon[], cum: number[]): { d: number; off: number } {
  const kx = 111.32 * Math.cos(toRad(pos[0])), ky = 110.57
  let best = { off: Infinity, d: 0 }
  for (let i = 0; i < line.length - 1; i++) {
    const ax = (line[i][1] - pos[1]) * kx, ay = (line[i][0] - pos[0]) * ky
    const bx = (line[i + 1][1] - pos[1]) * kx, by = (line[i + 1][0] - pos[0]) * ky
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy
    const t = l2 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / l2)) : 0
    const off = Math.hypot(ax + t * dx, ay + t * dy)
    if (off < best.off) best = { off, d: cum[i] + t * (cum[i + 1] - cum[i]) }
  }
  return best
}

/** Ponto a `d` km do início da linha. */
export function pointAt(line: LatLon[], cum: number[], d: number): LatLon {
  let i = 0
  while (i < cum.length - 2 && cum[i + 1] < d) i++
  const a = line[i], b = line[i + 1] ?? a, seg = cum[i + 1] - cum[i], f = seg > 0 ? (d - cum[i]) / seg : 0
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]
}
