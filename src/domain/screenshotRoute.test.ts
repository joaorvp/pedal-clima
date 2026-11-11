import { describe, expect, it } from 'vitest'
import { hav } from './geo'
import { evenly, georeference, pickColor, traceRoute, type Px } from './screenshotRoute'

/** Print de mentira: fundo claro de mapa, uma rota azul em "L" e um rótulo cinza cortando a linha. */
function fakeShot(dashed = false) {
  const w = 200, h = 160, data = new Uint8ClampedArray(w * h * 4)
  for (let i = 0; i < w * h; i++) data.set([236, 238, 230, 255], i * 4)
  const paint = (x: number, y: number, c: number[]) => { if (x >= 0 && y >= 0 && x < w && y < h) data.set([...c, 255], (y * w + x) * 4) }
  const blue = [66, 133, 244]
  // uma rua cinza por baixo da rota
  for (let y = 0; y < h; y++) for (let t = -4; t <= 4; t++) paint(80 + t, y, [200, 200, 200])
  for (let x = 20; x <= 150; x++) for (let t = -3; t <= 3; t++) if (!dashed || x % 10 < 6) paint(x, 120 + t, blue)
  for (let y = 30; y <= 120; y++) for (let t = -3; t <= 3; t++) if (!dashed || y % 10 < 6) paint(150 + t, y, blue)
  // um ícone/rótulo pequeno em cima da rota
  if (!dashed) for (let x = 100; x < 107; x++) for (let y = 116; y < 125; y++) paint(x, y, [255, 255, 255])
  return { data, width: w, height: h }
}

describe('rota a partir de um print', () => {
  it('lê a cor da rota perto do toque', () => {
    const c = pickColor(fakeShot(), 22, 121)!
    expect(c[2]).toBeGreaterThan(200); expect(c[0]).toBeLessThan(100)
    expect(pickColor(fakeShot(), 60, 60)).toBeNull()
  })
  it('segue a linha do começo ao fim, passando por cima de rótulos e linha tracejada', () => {
    for (const dashed of [false, true]) {
      const img = fakeShot(dashed), c = pickColor(img, 22, 121)!
      const path = traceRoute(img, c, [20, 120], [150, 30])!
      expect(path).not.toBeNull()
      expect(path[0][0]).toBeLessThan(26); expect(path[path.length - 1][1]).toBeLessThan(36)
      // passa rente à esquina (pode cortar alguns pixels por dentro da linha grossa; o ajuste às ruas corrige)
      const segDist = (p: Px, a: Px, b: Px) => { const dx = b[0] - a[0], dy = b[1] - a[1], t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1))); return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy) }
      expect(Math.min(...path.slice(1).map((q, i) => segDist([150, 120], path[i], q))), JSON.stringify(path)).toBeLessThan(9)
    }
  })
  it('sem linha ligando os toques: não inventa caminho', () => {
    const img = fakeShot(), c = pickColor(img, 22, 121)!
    expect(traceRoute(img, c, [20, 120], [40, 20])).toBeNull()
  })
  it('encaixa no mapa pelos dois lugares, inclusive com o print girado', () => {
    const a: [number, number] = [-15.8762, -48.0925], b: [number, number] = [-15.8032, -47.9555]
    const path: Px[] = [[20, 120], [150, 120], [150, 30]]
    const geo = georeference(path, path[0], path[2], a, b)
    expect(hav(geo[0], a)).toBeLessThan(0.01); expect(hav(geo[2], b)).toBeLessThan(0.01)
    // o canto fica no lugar certo: as duas pernas mantêm a proporção do print (130 px e 90 px)
    expect(hav(geo[0], geo[1]) / hav(geo[1], geo[2])).toBeCloseTo(130 / 90, 1)
  })
  it('pontos igualmente espaçados para o roteador', () => {
    const pts = evenly([[0, 0], [0, 0.01], [0.01, 0.01]], 5)
    expect(pts).toHaveLength(5); expect(pts[2][1]).toBeCloseTo(0.01, 4)
  })
})
