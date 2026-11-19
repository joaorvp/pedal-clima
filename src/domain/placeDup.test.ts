import { describe, expect, it } from 'vitest'
import { duplicateOf } from './placeDup'

const c = { home: [-15.8, -48.0] as [number, number], work: [-15.7, -47.9] as [number, number], homeSet: true, workSet: true, places: [{ name: 'Academia', lat: -15.75, lon: -47.95 }] }

describe('lugar repetido', () => {
  it('avisa quando o ponto ou o nome já é a Casa ou o Trabalho', () => {
    expect(duplicateOf('Casa da vó', [-15.8003, -48.0002], c)).toMatch(/sua Casa/)
    expect(duplicateOf('Casa', [-15.9, -48.2], c)).toMatch(/sua Casa/)
    expect(duplicateOf('trabalho', [-15.9, -48.2], c)).toMatch(/seu Trabalho/)
  })
  it('avisa quando já existe um lugar no mesmo ponto ou com o mesmo nome', () => {
    expect(duplicateOf('Smart', [-15.7502, -47.9501], c)).toMatch(/"Academia" neste ponto/)
    expect(duplicateOf('academia', [-15.6, -47.5], c)).toMatch(/chamado "Academia"/)
  })
  it('deixa salvar um lugar novo', () => {
    expect(duplicateOf('Mercado', [-15.6, -47.5], c)).toBeNull()
    expect(duplicateOf('Casa', [-15.9, -48.2], { ...c, homeSet: false })).toBeNull()
  })
})
