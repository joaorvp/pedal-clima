import { describe, expect, it } from 'vitest'
import { localSummary } from './local'
import type { PointWeather } from './types'

const now = Math.floor(Date.now() / 900e3) * 900e3
function wx(rain: (k: number) => number): PointWeather {
  const t0 = now / 1000, time = Array.from({ length: 40 }, (_, k) => t0 + (k - 4) * 900)
  const ht = Array.from({ length: 10 }, (_, k) => t0 - 3600 + k * 3600), f = (v: number) => Array(10).fill(v)
  return { minutely_15: { time, precipitation: time.map((_, i) => rain(i - 4)) },
    hourly: { time: ht, precipitation_probability: f(20), precipitation: f(0), temperature_2m: f(24), weather_code: f(2), wind_speed_10m: f(10), wind_direction_10m: f(0), wind_gusts_10m: f(20), is_day: f(1) } }
}

describe('clima onde você está', () => {
  it('seco nas próximas 3 h', () => { expect(localSummary(wx(() => 0), now).title).toBe('Seco por aqui') })
  it('avisa quanto falta para a chuva chegar', () => {
    const s = localSummary(wx(k => k >= 3 ? 0.5 : 0), now)
    expect(s.title).toBe('Chuva chegando em ~45 min'); expect(s.level).toBe('warn')
  })
  it('diz quando a chuva deve parar', () => {
    const s = localSummary(wx(k => k <= 2 ? 0.6 : 0), now)
    expect(s.title).toMatch(/aqui agora/); expect(s.sub).toMatch(/parar por volta/)
  })
})
