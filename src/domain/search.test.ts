import { describe, expect, it } from 'vitest'
import { distLabel, matchLocal, mergeHits, nominatimHit, norm, parseCep, type PlaceHit } from './places'

const hit = (main: string, ll: [number, number], sub = ''): PlaceHit => ({ main, sub, ll, kind: 'search' })

describe('busca de lugares', () => {
  it('compara sem acentos e sem pontuação', () => {
    expect(norm('Cidade São João, UF')).toBe('cidade sao joao uf')
  })
  it('reconhece CEP com ou sem traço', () => {
    expect(parseCep('72000-000')).toBe('72000000'); expect(parseCep('70040010')).toBe('70040010'); expect(parseCep('7200-000')).toBeNull()
  })
  it('acha seus lugares por qualquer palavra do nome, sem acento', () => {
    const local: PlaceHit[] = [{ main: 'Academia Bodytech', sub: '', ll: [0, 0], kind: 'saved' }, { main: 'Casa', sub: 'Rua 5', ll: [0, 0], kind: 'home' }]
    expect(matchLocal('acad', local).map(h => h.main)).toEqual(['Academia Bodytech'])
    expect(matchLocal('rua 5', local).map(h => h.main)).toEqual(['Casa'])
  })
  it('lê o endereço do Nominatim', () => {
    const h = nominatimHit({ lat: '-15.8', lon: '-48.0', name: 'Parque Central', address: { road: 'Avenida Principal', suburb: 'Bairro X', city: 'Cidade Y', state: 'Estado Z' } })
    expect(h.main).toBe('Parque Central'); expect(h.sub).toBe('Avenida Principal · Bairro X · Cidade Y · Estado Z'); expect(h.ll).toEqual([-15.8, -48])
  })
  it('junta as fontes sem repetir e põe primeiro o que combina e está perto', () => {
    const me: [number, number] = [-15.80, -48.00]
    const photon = [hit('Padaria Pão Bom', [-15.70, -47.90]), hit('Padaria Central', [-15.801, -48.001])]
    const nomi = [hit('Padaria Central', [-15.8012, -48.0011], 'Bairro X'), hit('Padaria Longe', [-16.5, -49.2])]
    const r = mergeHits('padaria central', [photon, nomi], me)
    expect(r[0].main).toBe('Padaria Central'); expect(r[0].sub).toBe('Bairro X')
    expect(r.filter(h => h.main === 'Padaria Central')).toHaveLength(1)
  })
  it('distância legível', () => {
    expect(distLabel([-15.8, -48], [-15.8, -48.003])).toBe('300 m')
    expect(distLabel([-15.8, -48], [-15.8, -47.98])).toBe('2,1 km')
    expect(distLabel(null, [0, 0])).toBe('')
  })
})

describe('tipos de lugar', async () => {
  const { guessKind, kindOf } = await import('./placeKinds')
  it('adivinha o tipo pelo nome', () => {
    expect(guessKind('Academia do bairro')).toBe('academia')
    expect(guessKind('Casa da mãe')).toBe('familia')
    expect(guessKind('Casa da vó')).toBe('familia')
    expect(guessKind('Vovó')).toBe('outro')
    expect(guessKind('Casa do João')).toBe('amigos')
    expect(guessKind('Supermercado X')).toBe('mercado')
    expect(guessKind('Padaria Pão Bom')).toBe('comida')
    expect(guessKind('Farmácia 24h')).toBe('saude')
    expect(guessKind('Faculdade')).toBe('estudo')
    expect(guessKind('Lugar qualquer')).toBe('outro')
  })
  it('tipo desconhecido vira "Outro"', () => { expect(kindOf('xyz').id).toBe('outro'); expect(kindOf(undefined).id).toBe('outro') })
})

describe('comércios pelo nome', async () => {
  const { nameWords, accentRegex, overpassHit } = await import('./places')
  it('ignora palavras genéricas', () => {
    expect(nameWords('supermercado Kaique')).toEqual(['kaique'])
    expect(nameWords('Smart Fit')).toEqual(['smart', 'fit'])
    expect(nameWords('academia')).toEqual(['academia'])
  })
  it('compara sem acento e sem ligar para espaço ou hífen no meio da palavra', () => {
    expect(new RegExp(accentRegex('cafe'), 'i').test('Café do Ponto')).toBe(true)
    const re = new RegExp(accentRegex('smartfit'), 'i')
    expect(re.test('Smart Fit')).toBe(true); expect(re.test('Smart-Fit')).toBe(true); expect(re.test('SmartFit')).toBe(true)
  })
  it('"smartfit" perto vem antes de "SmartFit" longe', async () => {
    const { mergeHits } = await import('./places')
    const me: [number, number] = [-15.8, -48.0]
    const r = mergeHits('smartfit', [[{ main: 'SmartFit', sub: '', ll: [-15.75, -47.8], kind: 'search' }], [{ main: 'Smart Fit', sub: 'Academia', ll: [-15.81, -48.01], kind: 'search' }]], me)
    expect(r[0].main).toBe('Smart Fit')
  })
  it('unidade só com a marca cadastrada também aparece', () => {
    expect(overpassHit({ lat: -15.8, lon: -48, tags: { brand: 'Smart Fit', leisure: 'fitness_centre' } })!.main).toBe('Smart Fit')
  })
  it('lê o lugar do OpenStreetMap com a categoria', () => {
    const h = overpassHit({ center: { lat: -15.8, lon: -48 }, tags: { name: 'Smart Fit', leisure: 'fitness_centre', 'addr:street': 'Avenida 1' } })!
    expect(h.main).toBe('Smart Fit'); expect(h.sub).toBe('Academia · Avenida 1'); expect(h.ll).toEqual([-15.8, -48])
    expect(overpassHit({ lat: 1, lon: 2, tags: {} })).toBeNull()
  })
})
