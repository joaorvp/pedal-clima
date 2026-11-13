import { describe, expect, it } from 'vitest'
import { badges, impact, streak } from './achievements'
import { maintenance } from './maintenance'

const ride = (y: number, m: number, d: number, km = 12, rain = 0) => ({ km, mins: 40, avg: 18, rain, wh: null, dest: 'Trabalho', at: new Date(y, m, d, 8, 40).getTime() })

describe('conquistas', () => {
  it('impacto: CO₂ e calorias aproximados', () => {
    const r = impact([ride(2026, 10, 10), ride(2026, 10, 11)])
    expect(r.km).toBe(24); expect(r.co2).toBeCloseTo(3.12, 2); expect(r.kcal).toBe(480)
  })
  it('sequência: fim de semana não quebra; dia útil sem pedal quebra', () => {
    // 13/11/2026 é sexta. Pedais seg 9 a sex 13, e sex 6 (a semana anterior, com o fim de semana no meio)
    const list = [6, 9, 10, 11, 12, 13].map(d => ride(2026, 10, d))
    expect(streak(list, new Date(2026, 10, 13, 18).getTime())).toBe(6)
    // ainda não pedalou hoje (sábado 14): conta a partir de sexta
    expect(streak(list, new Date(2026, 10, 14, 9).getTime())).toBe(6)
    // quinta 12 sem pedal: a sequência é só sexta 13
    expect(streak(list.filter(r => new Date(r.at).getDate() !== 12), new Date(2026, 10, 13, 18).getTime())).toBe(1)
  })
  it('selos de km, pedais e chuva', () => {
    const list = Array.from({ length: 12 }, (_, i) => ride(2026, 9, i + 1, 10, i < 6 ? 1 : 0))
    const ids = badges(list, new Date(2026, 9, 30).getTime()).map(b => b.id)
    expect(ids).toContain('km100'); expect(ids).toContain('r10'); expect(ids).toContain('wet')
  })
})

describe('manutenção', () => {
  it('corrente a cada 300 km, revisão a cada 1000 km, pneus toda semana', () => {
    const now = new Date(2026, 10, 13).getTime()
    const m = maintenance(650, { chain: 300, review: 0, tiresAt: now - 9 * 864e5 }, now)
    expect(m.find(x => x.id === 'chain')!.due).toBe(true)
    expect(m.find(x => x.id === 'review')!.due).toBe(false)
    expect(m.find(x => x.id === 'review')!.detail).toBe('faltam 350 km')
    expect(m.find(x => x.id === 'tires')!.due).toBe(true)
  })
})
