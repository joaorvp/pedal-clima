import { describe, expect, it } from 'vitest'
import { filterAlerts } from './alerts'
import { batteryEstimate } from './battery'
import { calibrate } from './calibration'
import { nextCommute } from './commute'
import { areaName, parseCoords } from './places'
import { evaluate } from './weather'
import { sampleRoute } from './testData'
import { parseSettings } from '../store/settings'

describe('endereços', () => {
  it('aceita link do Google Maps e coordenadas', () => {
    expect(parseCoords('https://www.google.com/maps/place/x/@-15.8771,-48.0912,17z')).toEqual([-15.8771, -48.0912])
    expect(parseCoords('-15.8, -47.9')).toEqual([-15.8, -47.9])
    expect(parseCoords('Rua 5')).toBeNull()
  })
  it('nomeia pontos pela rua e bairro, nunca pelo comércio', () => {
    expect(areaName({ geometry: { coordinates: [0, 0] }, properties: { name: 'Padaria', osm_key: 'shop', street: 'Rua 22', district: 'Bairro X' } })).toBe('Rua 22, Bairro X')
  })
})

describe('alertas do INMET', () => {
  const now = Date.parse('2026-11-11T12:00:00-03:00')
  it('filtra alertas ativos do DF', () => {
    const j = { hoje: [{ descricao: 'Tempestade', severidade: 'Perigo', geocodes: '5300108,5208707', inicio: '2026-11-11 10:00:00', fim: '2026-11-12 10:00:00' },
      { descricao: 'Baixa umidade', severidade: 'Perigo Potencial', geocodes: '3550308', inicio: '2026-11-11 10:00:00', fim: '2026-11-12 10:00:00' }], futuro: [] }
    const a = filterAlerts(j, now)
    expect(a).toHaveLength(1); expect(a[0]).toMatchObject({ title: 'Tempestade', level: 2 })
  })
  it('ignora alertas já encerrados', () => {
    expect(filterAlerts([{ descricao: 'X', geocodes: '5300108', fim: '2026-11-10 10:00:00' }], now)).toHaveLength(0)
  })
})

describe('rotina, bateria e calibragem', () => {
  it('escolhe a próxima saída', () => {
    const d = new Date(); d.setHours(6, 30, 0, 0)
    expect(nextCommute('07:00', '17:30', d)).toEqual({ d: 'ida', diff: 30 })
  })
  it('estima a bateria a partir da distância e das subidas', () => {
    const r = sampleRoute(), ev = evaluate(r, 'ida', Date.now(), 22)
    const flat = batteryEstimate(ev, r.total, [{ km: 0, z: 1000 }, { km: r.total, z: 1000 }], 10, 500)
    const hilly = batteryEstimate(ev, r.total, [{ km: 0, z: 1000 }, { km: r.total / 2, z: 1100 }, { km: r.total, z: 1000 }], 10, 500)
    expect(hilly.wh).toBeGreaterThan(flat.wh); expect(hilly.up).toBe(100)
  })
  it('só ajusta a sensibilidade depois de 3 avaliações', () => {
    const fa = { t: 0, dir: 'ida', rainy: true, prob: 70, exp: 1, rained: false }
    expect(calibrate([fa])).toBe(50); expect(calibrate([fa, fa, fa])).toBe(65)
  })
})

describe('configurações salvas', () => {
  it('lê o formato do app antigo sem perder nada', () => {
    const old = { home: [-15.9, -48.1], via: null, work: [-15.8, -47.9], speed: 25, batt: 720, places: [{ id: 'p1', name: 'Academia', lat: -15.83, lon: -47.99 }], nameVer: 2, names: { home: 'Rua 9', via: '', work: '' }, topic: 'pedal-abcdefghijkl', customized: true }
    const s = parseSettings(old)
    expect(s).toMatchObject({ home: [-15.9, -48.1], via: null, speed: 25, batt: 720, customized: true })
    expect(s.places[0].name).toBe('Academia'); expect(s.names.home).toBe('Rua 9')
  })
  it('corrige valores inválidos em vez de quebrar', () => {
    const s = parseSettings({ speed: 'rápido', home: 'x' })
    expect(s.speed).toBe(22); expect(s.home).toHaveLength(2)
  })
})
