import { describe, expect, it } from 'vitest'
import { rankShelters, shelterKind } from './shelter'

describe('onde me abrigar', () => {
  it('reconhece os tipos de abrigo', () => {
    expect(shelterKind({ highway: 'bus_stop', shelter: 'yes' })).toBe('Ponto de ônibus coberto')
    expect(shelterKind({ highway: 'bus_stop' })).toBeNull()
    expect(shelterKind({ railway: 'station', station: 'subway' })).toBe('Estação de metrô')
    expect(shelterKind({ amenity: 'fuel', brand: 'Shell' })).toBe('Posto de combustível')
  })
  it('ordena pelos mais próximos e não repete pontos colados', () => {
    const json = { elements: [
      { type: 'node', id: 1, lat: -15.8, lon: -48.0, tags: { amenity: 'fuel', brand: 'Posto X' } },
      { type: 'node', id: 2, lat: -15.8001, lon: -48.0001, tags: { amenity: 'shelter' } },
      { type: 'way', id: 3, center: { lat: -15.805, lon: -48.0 }, tags: { shop: 'mall', name: 'Shopping Y' } },
      { type: 'node', id: 4, lat: -15.79, lon: -48.0, tags: { highway: 'bus_stop' } },
    ] }
    const r = rankShelters(json, [-15.8, -48.0])
    expect(r.map(s => s.name)).toEqual(['Posto X', 'Shopping Y'])
  })
})
