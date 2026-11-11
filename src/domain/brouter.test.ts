import { describe, expect, it } from 'vitest'
import { isCycleWay, parseBRouter } from './brouter'

describe('rotas por ciclovia (BRouter)', () => {
  it('reconhece ciclovias e ciclofaixas', () => {
    expect(isCycleWay('highway=cycleway surface=asphalt')).toBe(true)
    expect(isCycleWay('highway=primary cycleway:right=lane')).toBe(true)
    expect(isCycleWay('highway=residential')).toBe(false)
  })
  it('calcula a fração do caminho em ciclovia', () => {
    const json = { features: [{ geometry: { coordinates: [[-48, -15.8], [-47.99, -15.8], [-47.98, -15.8]] }, properties: { messages: [
      ['Longitude', 'Latitude', 'Elevation', 'Distance', 'CostPerKm', 'WayTags'],
      ['-47990000', '-15800000', '1100', '600', '1000', 'highway=cycleway'],
      ['-47980000', '-15800000', '1100', '400', '1300', 'highway=secondary'],
    ] } }] }
    const r = parseBRouter(json)!
    expect(r.cycle).toBeCloseTo(0.6); expect(r.line).toHaveLength(3)
  })
})
