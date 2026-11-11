import { describe, expect, it } from 'vitest'
import { cumulative } from './geo'
import { findTurns, nextTurn, turnDistance, turnText } from './turns'
import type { LatLon } from './types'

// ~111 m por 0,001° de latitude; perto do equador a longitude vale quase o mesmo
const dense = (pts: LatLon[], step = 0.0001): LatLon[] => {
  const out: LatLon[] = [pts[0]]
  for (let i = 1; i < pts.length; i++) {
    const [a, b] = [pts[i - 1], pts[i]], n = Math.max(1, Math.round(Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])) / step))
    for (let k = 1; k <= n; k++) out.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n])
  }
  return out
}
const turnsOf = (pts: LatLon[]) => { const line = dense(pts); return findTurns(line, cumulative(line)) }

describe('curvas do trajeto', () => {
  it('reta: nenhuma curva', () => {
    expect(turnsOf([[0, 0], [0.01, 0]])).toEqual([])
  })
  it('para o norte e depois para o leste: vire à direita', () => {
    const t = turnsOf([[0, 0], [0.003, 0], [0.003, 0.003]])
    expect(t).toHaveLength(1)
    expect(t[0].dir).toBe('right'); expect(t[0].kind).toBe('turn')
    expect(t[0].km).toBeCloseTo(0.333, 1)
    expect(turnText(t[0])).toBe('vire à direita')
  })
  it('esquerda, depois direita', () => {
    const t = turnsOf([[0, 0], [0.003, 0], [0.003, -0.003], [0.006, -0.003]])
    expect(t.map(x => x.dir)).toEqual(['left', 'right'])
  })
  it('desvio leve vira "mantenha-se"', () => {
    const t = turnsOf([[0, 0], [0.003, 0], [0.006, 0.0025]])
    expect(t).toHaveLength(1); expect(t[0].kind).toBe('slight'); expect(turnText(t[0])).toBe('mantenha-se à direita')
  })
  it('esquina arredondada em vários vértices conta como uma curva só', () => {
    const t = turnsOf([[0, 0], [0.003, 0], [0.00315, 0.00005], [0.0032, 0.0001], [0.00325, 0.00025], [0.00325, 0.003]])
    expect(t).toHaveLength(1); expect(t[0].dir).toBe('right')
  })
  it('zigue-zague pequeno do GPS não vira curva', () => {
    const line = dense([[0, 0], [0.005, 0]]).map((p, i) => [p[0], i % 2 ? 0.00001 : 0] as LatLon)
    expect(findTurns(line, cumulative(line))).toEqual([])
  })
  it('próxima curva ignora as que já passaram', () => {
    const t = turnsOf([[0, 0], [0.003, 0], [0.003, -0.003], [0.006, -0.003]])
    expect(nextTurn(t, 0.1)).toBe(t[0])
    expect(nextTurn(t, t[0].km + 0.02)).toBe(t[1])
    expect(nextTurn(t, 5)).toBeUndefined()
  })
  it('distância da próxima curva', () => {
    expect(turnDistance(0.034)).toBe('30 m')
    expect(turnDistance(0.23)).toBe('250 m')
    expect(turnDistance(1.44)).toBe('1,4 km')
  })
})
