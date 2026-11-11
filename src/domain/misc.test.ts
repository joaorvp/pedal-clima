import { describe, expect, it } from 'vitest'
import { filterAlerts } from './alerts'
import { batteryEstimate } from './battery'
import { calibrate } from './calibration'
import { nextCommute } from './commute'
import { areaName, parseCoords } from './places'
import { evaluate } from './weather'
import { sampleRoute } from './testData'
import { baseSpeed, parseSettings } from '../store/settings'

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

describe('velocidade das estimativas', () => {
  it('sem média aprendida, desconta as paradas da velocidade de cruzeiro', () => {
    expect(baseSpeed(parseSettings({ speed: 22 }))).toBeCloseTo(18, 0)
    expect(baseSpeed(parseSettings({ speed: 22, speedAuto: false }))).toBe(22)
  })
  it('com 2+ pedais, usa a média real', () => {
    const h = [{ km: 16, mins: 60, avg: 16, rain: 0, wh: null, dest: 'T', at: 2 }, { km: 16, mins: 60, avg: 16, rain: 0, wh: null, dest: 'C', at: 1 }]
    expect(baseSpeed(parseSettings({ speed: 22, history: h }))).toBe(16)
  })
})

describe('configurações salvas', () => {
  it('lê o formato do app antigo sem perder nada', () => {
    const old = { home: [-15.9, -48.1], via: null, work: [-15.8, -47.9], speed: 25, batt: 720, places: [{ id: 'p1', name: 'Academia', lat: -15.83, lon: -47.99 }], nameVer: 2, names: { home: 'Rua 9', via: '', work: '' }, topic: 'pedal-abcdefghijkl', customized: true }
    const s = parseSettings(old)
    expect(s).toMatchObject({ home: [-15.9, -48.1], via: null, speed: 25, batt: 720, customized: true })
    expect(s.places[0].name).toBe('Academia'); expect(s.names.home).toBe('Rua 9')
  })
  it('quem já usava mantém casa, trabalho e o próprio ponto P', () => {
    const s = parseSettings({ customized: true, via: [-15.84, -48.02], nameVer: 2 })
    expect(s.homeSet).toBe(true); expect(s.workSet).toBe(true); expect(s.via).toEqual([-15.84, -48.02])
  })
  it('quem nunca configurou não vê pontos de exemplo', () => {
    const s = parseSettings({})
    expect(s.homeSet).toBe(false); expect(s.workSet).toBe(false); expect(s.via).toBeNull()
  })
  it('corrige valores inválidos em vez de quebrar', () => {
    const s = parseSettings({ speed: 'rápido', home: 'x' })
    expect(s.speed).toBe(22); expect(s.home).toHaveLength(2)
  })
})

describe('resumo da semana', async () => {
  const { weekly, avgSpeed, speedTrend } = await import('./history')
  const now = new Date(2026, 10, 11, 18) // quarta, 11/11
  const at = (d: number, h = 8, m = 10) => new Date(2026, m, d, h).getTime()
  const rec = (d: number, km: number, mins: number, rain = 0, m = 10) => ({ km, mins, avg: km / (mins / 60), rain, wh: null, dest: 'Trabalho', at: at(d, 8, m) })
  const list = [rec(10, 12, 40), rec(11, 12, 36, 0.5), rec(3, 12, 48), rec(27, 6, 20, 0, 9)]
  it('km por semana, da mais antiga para a atual', () => {
    const w = weekly(list, now, 3)
    expect(w.map(x => +x.km.toFixed(1))).toEqual([6, 12, 24])
    expect(w[2].rides).toBe(2); expect(w[2].wet).toBe(1)
    expect(new Date(w[2].start).getDay()).toBe(1)
  })
  it('média de porta a porta pesa pelos km', () => {
    expect(avgSpeed(list, at(10, 0))!).toBeCloseTo(24 / (76 / 60), 5)
    expect(avgSpeed([], 0)).toBeNull()
  })
  it('tendência compara com as 4 semanas anteriores', () => {
    const t = speedTrend(list, now)
    expect(t.diff!).toBeGreaterThan(0)
  })
})
