import { describe, expect, it } from 'vitest'
import { periodStarts, totals } from './history'

describe('histórico de pedais', () => {
  it('semana começa na segunda e mês no dia 1', () => {
    const { week, month } = periodStarts(new Date(2026, 10, 12, 15, 0)) // quinta, 12/11/2026
    expect(new Date(week).getDay()).toBe(1); expect(new Date(week).getDate()).toBe(9)
    expect(new Date(month).getDate()).toBe(1)
  })
  it('soma km, tempo e pedais secos do período', () => {
    const t0 = Date.parse('2026-11-10T08:00:00')
    const list = [{ km: 17, mins: 50, avg: 20, rain: 0, wh: 170, dest: 'Trabalho', at: t0 }, { km: 16.5, mins: 48, avg: 21, rain: 0.6, wh: 165, dest: 'Casa', at: t0 + 9 * 3600e3 }, { km: 5, mins: 15, avg: 20, rain: 0, wh: 50, dest: 'X', at: t0 - 40 * 86400e3 }]
    expect(totals(list, t0 - 3600e3)).toEqual({ rides: 2, km: 33.5, mins: 98, dry: 1 })
  })
})
