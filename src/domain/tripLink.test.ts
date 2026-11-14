import { describe, expect, it } from 'vitest'
import { parseTripLink, tripLinkQuery } from './tripLink'

describe('link do trajeto (QR)', () => {
  it('vai e volta com destino, saída e ponto de passagem', () => {
    const q = tripLinkQuery({ dest: { ll: [-15.123456, -47.987654], name: 'Academia São José' }, origin: { ll: [-15.2, -48], name: 'Casa' }, via: [-15.15, -47.99] })
    expect(parseTripLink(new URLSearchParams(q))).toEqual({ dest: { ll: [-15.12346, -47.98765], name: 'Academia São José' }, origin: { ll: [-15.2, -48], name: 'Casa' }, via: [-15.15, -47.99] })
  })
  it('sem saída: o celular sai de onde estiver', () => {
    const l = parseTripLink(new URLSearchParams(tripLinkQuery({ dest: { ll: [1, 2], name: 'X' } })))
    expect(l?.origin).toBeUndefined(); expect(l?.via).toBeUndefined()
  })
  it('ignora links quebrados ou coordenadas impossíveis', () => {
    expect(parseTripLink(new URLSearchParams('para=1,2'))).toBeNull()
    expect(parseTripLink(new URLSearchParams('trajeto=1&para=abc'))).toBeNull()
    expect(parseTripLink(new URLSearchParams('trajeto=1&para=95,2'))).toBeNull()
    expect(parseTripLink(new URLSearchParams('trajeto=1&para=1,2&de=x&por=1,999'))).toEqual({ dest: { ll: [1, 2], name: 'Destino' } })
  })
})
