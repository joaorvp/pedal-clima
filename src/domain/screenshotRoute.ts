import type { LatLon } from './types'

/**
 * Rota a partir de um print de outro app (Google Maps, Waze, Strava…), tudo no aparelho:
 * 1) a cor da linha é lida perto do toque no começo da rota;
 * 2) a linha é seguida pelos pixels dessa cor, do toque no começo ao toque no fim;
 * 3) os dois toques são casados com os dois lugares escolhidos (ex.: Casa e Trabalho), o que dá escala,
 *    giro e posição do print no mapa (transformação de semelhança; vale para mapa girado, não para 3D).
 */
export type RGB = [number, number, number]
export type Px = [number, number]
interface Img { data: Uint8ClampedArray; width: number; height: number }

const sat = (r: number, g: number, b: number) => { const mx = Math.max(r, g, b), mn = Math.min(r, g, b); return mx ? (mx - mn) / mx : 0 }

/** Cor da rota: o pixel mais "colorido" (saturado e nem muito claro nem muito escuro) perto do toque. */
export function pickColor(img: Img, x: number, y: number, radius = 16): RGB | null {
  let best: RGB | null = null, score = 0
  for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) {
    const px = Math.round(x + dx), py = Math.round(y + dy)
    if (px < 0 || py < 0 || px >= img.width || py >= img.height || dx * dx + dy * dy > radius * radius) continue
    const i = (py * img.width + px) * 4, r = img.data[i], g = img.data[i + 1], b = img.data[i + 2], mx = Math.max(r, g, b)
    const s = sat(r, g, b) * (mx > 60 && mx < 250 ? 1 : 0.3) - Math.hypot(dx, dy) / (radius * 8)
    if (s > score) { score = s; best = [r, g, b] }
  }
  return score > 0.3 ? best : null
}

/** Pixels "da rota": parecidos com a cor escolhida. */
function maskOf(img: Img, c: RGB, tol: number): Uint8Array {
  const n = img.width * img.height, m = new Uint8Array(n), t2 = tol * tol
  for (let p = 0, i = 0; p < n; p++, i += 4) {
    const dr = img.data[i] - c[0], dg = img.data[i + 1] - c[1], db = img.data[i + 2] - c[2]
    if (dr * dr + dg * dg + db * db <= t2) m[p] = 1
  }
  return m
}

/** Engrossa a máscara (fecha falhas de linha tracejada, rótulos e ícones por cima da rota). */
function dilate(m: Uint8Array, w: number, h: number, r: number): Uint8Array {
  const tmp = new Uint8Array(m.length), out = new Uint8Array(m.length)
  for (let y = 0; y < h; y++) { let run = -1e9; for (let x = 0; x < w; x++) { if (m[y * w + x]) run = x; if (x - run <= r) tmp[y * w + x] = 1 } run = 1e9; for (let x = w - 1; x >= 0; x--) { if (m[y * w + x]) run = x; if (run - x <= r) tmp[y * w + x] = 1 } }
  for (let x = 0; x < w; x++) { let run = -1e9; for (let y = 0; y < h; y++) { if (tmp[y * w + x]) run = y; if (y - run <= r) out[y * w + x] = 1 } run = 1e9; for (let y = h - 1; y >= 0; y--) { if (tmp[y * w + x]) run = y; if (run - y <= r) out[y * w + x] = 1 } }
  return out
}

/** Pixel da máscara mais perto do toque (até `max` px). */
function nearest(m: Uint8Array, w: number, h: number, p: Px, max: number): number {
  let best = -1, bd = max * max + 1
  for (let dy = -max; dy <= max; dy++) for (let dx = -max; dx <= max; dx++) {
    const x = Math.round(p[0] + dx), y = Math.round(p[1] + dy)
    if (x < 0 || y < 0 || x >= w || y >= h || !m[y * w + x]) continue
    const d = dx * dx + dy * dy; if (d < bd) { bd = d; best = y * w + x }
  }
  return best
}

/** Distância de cada pixel da máscara até a borda (para o caminho ir pelo meio da linha). */
function depth(m: Uint8Array, w: number, h: number): Uint8Array {
  const d = new Uint8Array(m.length), q = new Int32Array(m.length); let head = 0, tail = 0
  for (let p = 0; p < m.length; p++) if (!m[p]) { d[p] = 0; q[tail++] = p } else d[p] = 255
  while (head < tail) {
    const p = q[head++], x = p % w, y = (p - x) / w, nd = d[p] + 1
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
      const np = ny * w + nx; if (d[np] > nd) { d[np] = nd; q[tail++] = np }
    }
  }
  return d
}

/**
 * Segue a linha da rota do toque no começo ao toque no fim. Devolve os pixels do caminho (simplificados)
 * ou null se a linha não liga os dois pontos.
 */
export function traceRoute(img: Img, color: RGB, start: Px, end: Px, opts: { tol?: number; gap?: number } = {}): Px[] | null {
  const { width: w, height: h } = img
  const mask = dilate(maskOf(img, color, opts.tol ?? 70), w, h, opts.gap ?? 4)
  const s = nearest(mask, w, h, start, 24), e = nearest(mask, w, h, end, 24)
  if (s < 0 || e < 0) return null
  const dep = depth(mask, w, h)
  // Dijkstra simples com custo maior perto da borda: o caminho corre pelo meio da linha
  // Float64: com Float32 o arredondamento descartava nós válidos e o caminho não era achado
  const dist = new Float64Array(w * h).fill(Infinity), prev = new Int32Array(w * h).fill(-1)
  const heap: number[] = [], hd: number[] = []
  const push = (p: number, d: number) => { heap.push(p); hd.push(d); let i = heap.length - 1; while (i > 0) { const j = (i - 1) >> 1; if (hd[j] <= hd[i]) break; [heap[i], heap[j]] = [heap[j], heap[i]]; [hd[i], hd[j]] = [hd[j], hd[i]]; i = j } }
  const pop = () => { const p = heap[0], d = hd[0], lp = heap.pop()!, ld = hd.pop()!; if (heap.length) { heap[0] = lp; hd[0] = ld; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && hd[l] < hd[m]) m = l; if (r < heap.length && hd[r] < hd[m]) m = r; if (m === i) break; [heap[i], heap[m]] = [heap[m], heap[i]]; [hd[i], hd[m]] = [hd[m], hd[i]]; i = m } } return [p, d] as const }
  dist[s] = 0; push(s, 0)
  const N8: [number, number, number][] = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]]
  while (heap.length) {
    const [p, d] = pop(); if (d > dist[p]) continue; if (p === e) break
    const x = p % w, y = (p - x) / w
    for (const [dx, dy, c] of N8) {
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
      const np = ny * w + nx; if (!mask[np]) continue
      const nd = d + c * (1 + 3 / Math.max(1, dep[np])); if (nd < dist[np]) { dist[np] = nd; prev[np] = p; push(np, nd) }
    }
  }
  if (prev[e] < 0 && e !== s) return null
  const path: Px[] = []
  for (let p = e; p >= 0; p = prev[p]) { const x = p % w; path.push([x, (p - x) / w]); if (p === s) break }
  path.reverse()
  return simplifyPx(path, 1.5)
}

function simplifyPx(pts: Px[], tol: number): Px[] {
  if (pts.length < 3) return pts
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1
  const st: [number, number][] = [[0, pts.length - 1]]
  while (st.length) {
    const [a, b] = st.pop()!, [ax, ay] = pts[a], [bx, by] = pts[b], dx = bx - ax, dy = by - ay, l = Math.hypot(dx, dy) || 1
    let far = -1, fd = tol
    for (let i = a + 1; i < b; i++) { const d = Math.abs((pts[i][0] - ax) * dy - (pts[i][1] - ay) * dx) / l; if (d > fd) { fd = d; far = i } }
    if (far > 0) { keep[far] = 1; st.push([a, far], [far, b]) }
  }
  return pts.filter((_, i) => keep[i])
}

/**
 * Leva os pixels do print para o mapa: o toque no começo vira `a`, o toque no fim vira `b`, e o resto segue
 * pela mesma escala e giro (semelhança no plano local; precisa só de dois pontos).
 */
export function georeference(path: Px[], startPx: Px, endPx: Px, a: LatLon, b: LatLon): LatLon[] {
  const lat0 = a[0], kx = 111320 * Math.cos(lat0 * Math.PI / 180), ky = 110540
  const toM = (p: LatLon): [number, number] => [(p[1] - a[1]) * kx, (p[0] - a[0]) * ky]
  // pixels com y para cima (no print o y cresce para baixo)
  const z1: [number, number] = [startPx[0], -startPx[1]], z2: [number, number] = [endPx[0], -endPx[1]]
  const w1 = toM(a), w2 = toM(b)
  const dzx = z2[0] - z1[0], dzy = z2[1] - z1[1], dwx = w2[0] - w1[0], dwy = w2[1] - w1[1], den = dzx * dzx + dzy * dzy || 1
  // a = (w2 - w1) / (z2 - z1), em números complexos
  const ar = (dwx * dzx + dwy * dzy) / den, ai = (dwy * dzx - dwx * dzy) / den
  return path.map(([px, py]) => {
    const zx = px - z1[0], zy = -py - z1[1]
    const mx = w1[0] + ar * zx - ai * zy, my = w1[1] + ar * zy + ai * zx
    return [+(a[0] + my / ky).toFixed(5), +(a[1] + mx / kx).toFixed(5)] as LatLon
  })
}

/** Pontos igualmente espaçados ao longo da linha (para encaixar nas ruas pelo roteador). */
export function evenly(line: LatLon[], n: number): LatLon[] {
  if (line.length < 2 || n < 2) return line.slice()
  const seg: number[] = [0]
  for (let i = 1; i < line.length; i++) seg.push(seg[i - 1] + Math.hypot(line[i][0] - line[i - 1][0], (line[i][1] - line[i - 1][1]) * Math.cos(line[0][0] * Math.PI / 180)))
  const total = seg[seg.length - 1], out: LatLon[] = []
  for (let k = 0, i = 0; k < n; k++) {
    const t = total * k / (n - 1)
    while (i < seg.length - 2 && seg[i + 1] < t) i++
    const f = seg[i + 1] > seg[i] ? (t - seg[i]) / (seg[i + 1] - seg[i]) : 0
    out.push([line[i][0] + (line[i + 1][0] - line[i][0]) * f, line[i][1] + (line[i + 1][1] - line[i][1]) * f])
  }
  return out
}
