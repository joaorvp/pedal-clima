import { describe, expect, it } from 'vitest'
import { appendTrack, lineKm, matchSaved, planFits, planSaved, realTime, simplify, type SavedRoute } from './savedRoutes'
import type { LatLon } from './types'

const straight = (n: number): LatLon[] => Array.from({ length: n }, (_, i) => [-15.8 + i * 0.0001, -48.0])
const route = (line: LatLon[]): SavedRoute => ({ id: 'r1', name: 'Meu caminho', line, km: lineKm(line), createdAt: 0 })

describe('rotas salvas', () => {
  it('simplificar mantém o formato e tira pontos de uma reta', () => {
    const l = simplify(straight(200))
    expect(l).toHaveLength(2)
    const corner: LatLon[] = [...straight(50), ...Array.from({ length: 50 }, (_, i) => [-15.8 + 49 * 0.0001, -48.0 + (i + 1) * 0.0001] as LatLon)]
    expect(simplify(corner)).toHaveLength(3)
  })
  it('serve para o trajeto nos dois sentidos', () => {
    const r = route([[-15.8, -48.0], [-15.79, -47.99]])
    expect(matchSaved([r], [-15.8001, -48.0], [-15.7901, -47.99])).toHaveLength(1)
    const back = matchSaved([r], [-15.79, -47.99], [-15.8, -48.0])
    expect(back[0].line[0]).toEqual([-15.79, -47.99])
    expect(matchSaved([r], [-15.7, -48.0], [-15.79, -47.99])).toHaveLength(0)
  })
  it('gravação do pedal: um ponto a cada ~20 m e sem saltos do GPS', () => {
    let t: LatLon[] = []
    t = appendTrack(t, [-15.8, -48.0], true)
    t = appendTrack(t, [-15.80005, -48.0], true)
    expect(t).toHaveLength(1)
    t = appendTrack(t, [-15.8003, -48.0], true)
    expect(t).toHaveLength(2)
    t = appendTrack(t, [-15.7, -48.0], false)
    expect(t).toHaveLength(2)
    // depois de uma falha (ou ao reabrir o app mais à frente), volta a gravar
    t = appendTrack(t, [-15.79, -48.0], true)
    expect(t).toHaveLength(3)
  })
})

describe('aproveitar um trecho salvo', () => {
  // rota salva reta, de oeste para leste, ~11 km
  const r = { id: 'r1', name: 'Meu trecho', line: [[-15.8, -48.1], [-15.8, -48.0]] as [number, number][], km: 10.7, createdAt: 0 }
  it('usa só o pedaço entre a saída e o destino, no sentido certo', () => {
    const p = planSaved(r, [-15.801, -48.08], [-15.799, -48.02])!
    expect(p.head).toBeLessThan(0.2); expect(p.tail).toBeLessThan(0.2)
    expect(p.line[0][1]).toBeCloseTo(-48.08, 2); expect(p.line.at(-1)![1]).toBeCloseTo(-48.02, 2)
    expect(p.pieceKm).toBeGreaterThan(6)
    const back = planSaved(r, [-15.799, -48.02], [-15.801, -48.08])!
    expect(back.line[0][1]).toBeCloseTo(-48.02, 2)
  })
  it('sugere quando as ligações são curtas e descarta rota que não passa perto', () => {
    const o: [number, number] = [-15.81, -48.105], d: [number, number] = [-15.79, -47.995] // ~1 km fora das pontas
    expect(planFits(planSaved(r, o, d)!, o, d)).toBe(true)
    const far: [number, number] = [-15.9, -48.05], far2: [number, number] = [-15.95, -48.0]
    const p = planSaved(r, far, far2)
    expect(p == null || !planFits(p, far, far2)).toBe(true)
  })
})

describe('tempo real de cada rota', () => {
  const line: LatLon[] = [[-15.8, -48.1], [-15.8, -48.05], [-15.8, -48.0]]
  const along: LatLon[] = [[-15.8002, -48.0995], [-15.8001, -48.07], [-15.7999, -48.03], [-15.8, -48.0005]]
  it('usa a mediana dos pedais que andaram por ela', () => {
    expect(realTime(line, [{ track: along, mins: 30 }, { track: along, mins: 26 }, { track: along, mins: 40 }])).toEqual({ n: 3, mins: 30 })
  })
  it('ignora pedais por outro caminho, no outro sentido ou sem caminho, e pede pelo menos 2', () => {
    const other: LatLon[] = [[-15.8, -48.1], [-15.82, -48.07], [-15.82, -48.03], [-15.8, -48.0]]
    expect(realTime(line, [{ track: along, mins: 30 }, { track: other, mins: 20 }, { track: along.slice().reverse(), mins: 22 }, { mins: 25 }])).toBeNull()
  })
})
