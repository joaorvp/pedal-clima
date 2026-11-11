import { describe, expect, it } from 'vitest'
import { learnedSpeed, rideSpeedFrom } from './speed'

const rec = (km: number, mins: number) => ({ km, mins, avg: km / (mins / 60), rain: 0, wh: null, dest: 'X', at: 0 })
describe('estimativa de chegada', () => {
  it('aprende a média real de porta a porta (precisa de 2 pedais)', () => {
    expect(learnedSpeed([rec(17, 60)])).toBeNull()
    expect(learnedSpeed([rec(17, 60), rec(16, 55), rec(0.5, 3)])).toEqual({ kmh: 17.2, n: 2 })
  })
  it('no começo do pedal, usa a média aprendida', () => {
    expect(rideSpeedFrom({ dist: 0.3, startedAt: 0, last: { t: 60e3 }, moving: 0.01, pace: 25 }, 18)).toBe(18)
  })
  it('depois, usa o ritmo atual medido pelo celular descontando as paradas', () => {
    // 30 min de pedal, 24 min em movimento (20% parado), ritmo atual 25 km/h, 9 km rodados
    const v = rideSpeedFrom({ dist: 9, startedAt: 0, last: { t: 30 * 60e3 }, moving: 0.4, pace: 25 }, 18)
    expect(v).toBeCloseTo(25 * 0.8 * 0.9 + 18 * 0.1, 1)
  })
  it('se o ritmo acelera, a previsão acompanha', () => {
    const lento = rideSpeedFrom({ dist: 6, startedAt: 0, last: { t: 25 * 60e3 }, moving: 0.33, pace: 16 }, 18)
    const rapido = rideSpeedFrom({ dist: 6, startedAt: 0, last: { t: 25 * 60e3 }, moving: 0.33, pace: 26 }, 18)
    expect(rapido).toBeGreaterThan(lento + 6)
  })
})
