import { describe, expect, it } from 'vitest'
import { appendTrack, insertVia, lineKm, matchSaved, simplify, type SavedRoute } from './savedRoutes'
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
  it('ponto de passagem novo entra na ordem do caminho', () => {
    const line = straight(100), a = line[20], b = line[80], mid = line[50]
    expect(insertVia([a, b], mid, line)).toEqual([a, mid, b])
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
