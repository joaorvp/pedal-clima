import { describe, expect, it } from 'vitest'
import { decodeFull, encode, findPlusCode, plusCodeToLatLon, recoverNearest } from './plusCode'

describe('Plus Code', () => {
  it('exemplo público do Google (sede, "CWC8+R9 Mountain View"): 849VCWC8+R9', () => {
    const c = decodeFull('849VCWC8+R9')!
    expect(c[0]).toBeCloseTo(37.422, 2); expect(c[1]).toBeCloseTo(-122.084, 2)
    expect(encode(c[0], c[1])).toBe('849VCWC8+R9')
  })
  it('ida e volta em vários pontos (até ~14 m de erro)', () => {
    for (const [la, lo] of [[-15.8267, -48.0912], [-23.5505, -46.6333], [40.7128, -74.006], [-33.8688, 151.2093]] as [number, number][]) {
      const back = decodeFull(encode(la, lo))!
      expect(Math.abs(back[0] - la)).toBeLessThan(0.0002); expect(Math.abs(back[1] - lo)).toBeLessThan(0.0002)
    }
  })
  it('código curto do Google Maps, completado pela região de quem usa', () => {
    const full = encode(-15.8267, -48.0912), short = full.slice(4)
    const c = recoverNearest(short, [-15.80, -48.0])!
    expect(Math.abs(c[0] - -15.8267)).toBeLessThan(0.0002); expect(Math.abs(c[1] - -48.0912)).toBeLessThan(0.0002)
    // com a referência a ~40 km do lugar também funciona (códigos curtos valem num raio de ~50 km)
    const c2 = recoverNearest(short, [-15.5, -48.4])!
    expect(Math.abs(c2[0] - -15.8267)).toBeLessThan(0.0002)
  })
  it('acha o código no texto copiado', () => {
    const full = encode(-15.8267, -48.0912), short = full.slice(4)
    expect(findPlusCode(short + ' Cidade, UF')).toBe(short)
    expect(findPlusCode('Rua 9, 72000-000')).toBeNull()
    const ll = plusCodeToLatLon(short + ' Cidade - UF', [-15.8, -48.0])!
    expect(Math.abs(ll[1] - -48.0912)).toBeLessThan(0.0002)
  })
})
