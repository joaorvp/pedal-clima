import { describe, expect, it } from 'vitest'
import { weekPlan, type HourlyRain } from './week'

// segunda-feira, 6h da manhã (horário local)
const now = new Date(2026, 10, 23, 6, 0, 0).getTime()
function hours(fn: (d: Date) => [number, number]): HourlyRain {
  const h: HourlyRain = { time: [], precipitation_probability: [], precipitation: [] }
  for (let k = 0; k < 24 * 8; k++) { const t = now + k * 3600e3, [p, mm] = fn(new Date(t)); h.time.push(t / 1000); h.precipitation_probability.push(p); h.precipitation.push(mm) }
  return h
}

describe('semana do pedal', () => {
  it('lista os próximos dias úteis com a ida e a volta, pulando o fim de semana', () => {
    const w = hours(d => d.getHours() >= 17 && d.getDay() === 2 ? [80, 2] : d.getDay() === 3 && d.getHours() < 9 ? [60, 0] : [10, 0])
    const plan = weekPlan(w, w, now, '07:30', '18:00', 30)
    expect(plan.map(p => p.label)).toEqual(['Hoje', 'Amanhã', 'Qua 25', 'Qui 26', 'Sex 27'])
    expect(plan[0].ida!.level).toBe('dry')
    expect(plan[1].volta!.level).toBe('rain') // terça à tarde
    expect(plan[2].ida!.level).toBe('maybe') // quarta cedo: chance alta, sem mm
  })
  it('pula hoje depois da volta e para quando a previsão acaba', () => {
    const late = new Date(2026, 10, 23, 20, 0, 0).getTime()
    const short: HourlyRain = { time: [], precipitation_probability: [], precipitation: [] }
    for (let k = 0; k <= 24; k++) { short.time.push(late / 1000 + k * 3600); short.precipitation_probability.push(0); short.precipitation.push(0) } // só até amanhã às 20h
    const plan = weekPlan(short, short, late, '07:30', '18:00', 30)
    expect(plan[0].label).toBe('Amanhã')
    expect(plan.length).toBe(1)
  })
})
