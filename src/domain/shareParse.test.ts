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

describe('Plus Code copiado do Google Maps', async () => {
  const { encode } = await import('./plusCode')
  const { parseShared, looksShared, shortLinkOnly } = await import('./shareParse')
  const short = encode(-15.8267, -48.0912).slice(4)
  it('código curto com a cidade: posição exata pela região de quem usa', () => {
    const s = parseShared({ text: short + ' Cidade, UF' }, [-15.8, -48.0])!
    expect(Math.abs(s.coords![0] - -15.8267)).toBeLessThan(0.0002); expect(Math.abs(s.coords![1] - -48.0912)).toBeLessThan(0.0002)
    expect(looksShared(short + ' Cidade')).toBe(true)
  })
  it('nome + código', () => {
    const s = parseShared({ text: 'Mercado Y\n' + short + ' Cidade - UF' }, [-15.8, -48.0])!
    expect(s.name).toBe('Mercado Y'); expect(s.coords).toBeDefined()
  })
  it('só o link curto: avisa em vez de fingir que entendeu', () => {
    expect(shortLinkOnly('https://maps.app.goo.gl/AbC123')).toBe(true)
    expect(shortLinkOnly('Mercado\nhttps://maps.app.goo.gl/AbC123')).toBe(false)
  })
})
