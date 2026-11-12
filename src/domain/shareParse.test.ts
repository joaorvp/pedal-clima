import { describe, expect, it } from 'vitest'
import { addressQuery, looksShared, parseShared } from './shareParse'

describe('lugar compartilhado do Google Maps', () => {
  it('nome, endereço com CEP e link', () => {
    const s = parseShared({ text: 'Supermercado X\nQuadra 10 Conjunto A - Bairro Y, Cidade - DF, 72000-100\nhttps://maps.app.goo.gl/abc123' })!
    expect(s.name).toBe('Supermercado X')
    expect(s.address).toBe('Quadra 10 Conjunto A - Bairro Y, Cidade - DF, 72000-100')
    expect(s.cep).toBe('72000100'); expect(s.link).toBe('https://maps.app.goo.gl/abc123'); expect(s.coords).toBeUndefined()
  })
  it('título separado do texto (alguns celulares mandam assim)', () => {
    const s = parseShared({ title: 'Academia Z', text: 'https://maps.app.goo.gl/xyz' })!
    expect(s.name).toBe('Academia Z'); expect(s.link).toContain('goo.gl')
  })
  it('link longo com coordenadas', () => {
    const s = parseShared({ text: 'https://www.google.com/maps/place/Padaria/@-15.8312,-48.1077,17z/data=abc' })!
    expect(s.coords).toEqual([-15.8312, -48.1077])
  })
  it('pino marcado com coordenadas no texto', () => {
    const s = parseShared({ text: 'Pin marcado\n-15.8312, -48.1077\nhttps://maps.app.goo.gl/q' })!
    expect(s.coords).toEqual([-15.8312, -48.1077]); expect(s.name).toBeUndefined()
  })
  it('só o endereço', () => {
    const s = parseShared({ text: 'Rua 7, 120 - Bairro W, Cidade - UF, 72000-000' })!
    expect(s.address).toContain('Rua 7'); expect(s.cep).toBe('72000000'); expect(s.name).toBeUndefined()
  })
  it('reconhece quando o texto colado é um compartilhamento', () => {
    expect(looksShared('https://maps.app.goo.gl/abc')).toBe(true)
    expect(looksShared('Nome\nEndereço')).toBe(true)
    expect(looksShared('smart fit')).toBe(false)
  })
  it('endereço para o buscador sem CEP nem país', () => {
    expect(addressQuery('Rua 7, 120 - Bairro W, Cidade - UF, 72000-000, Brasil')).toBe('Rua 7, 120 - Bairro W, Cidade - UF')
  })
  it('nada aproveitável', () => { expect(parseShared({ text: '' })).toBeNull() })
})
