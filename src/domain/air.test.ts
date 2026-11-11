import { describe, expect, it } from 'vitest'
import { airLabel, comfortAlerts } from './air'

describe('calor, ar e umidade', () => {
  it('traduz o índice de qualidade do ar', () => {
    expect(airLabel(30).word).toBe('bom'); expect(airLabel(120).level).toBe('warn'); expect(airLabel(180).word).toBe('ruim')
  })
  it('avisa sobre umidade baixa da seca e calor forte', () => {
    const a = comfortAlerts({ feels: 34, humidity: 18, aqi: 40 })
    expect(a.map(x => x.icon)).toEqual(['thermo', 'drop']); expect(a[1].level).toBe('bad')
    expect(comfortAlerts({ feels: 25, humidity: 60, aqi: 30 })).toEqual([])
  })
})
