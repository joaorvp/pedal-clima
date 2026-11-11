import { describe, expect, it } from 'vitest'
import { parseSettings } from '../store/settings'
import { makeBackup, readBackup } from './backup'

describe('backup dos dados', () => {
  it('exporta e importa sem perder nada', () => {
    const s = parseSettings({ customized: true, home: [-15.8, -48.1], work: [-15.78, -47.95], names: { home: 'Casa X', via: '', work: 'Trab Y' }, nameVer: 2,
      places: [{ id: 'p1', name: 'Academia', lat: -15.7, lon: -47.9 }], history: [{ km: 12, mins: 40, avg: 18, rain: 0, wh: null, dest: 'Trabalho', at: 1 }] })
    const { name, text } = makeBackup(s, new Date(2026, 10, 11).getTime())
    expect(name).toBe('pedagua-backup-2026-11-11.json')
    const r = readBackup(text)
    expect(r.ok).toBe(true)
    if (r.ok) { expect(r.settings.places[0].name).toBe('Academia'); expect(r.settings.history).toHaveLength(1); expect(r.settings.names.home).toBe('Casa X') }
  })
  it('recusa arquivos que não são backup do app', () => {
    expect(readBackup('oi').ok).toBe(false)
    expect(readBackup('{"foo":1}').ok).toBe(false)
    expect(readBackup('{"app":"pedagua"}').ok).toBe(false)
  })
})
