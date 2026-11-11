import { beforeEach, describe, expect, it } from 'vitest'
import { parseSettings, useSettings } from './settings'

describe('lugares salvos e recentes', () => {
  beforeEach(() => useSettings.setState({ ...parseSettings({ customized: true, home: [-15.9, -48.1], work: [-15.8, -47.9] }), places: [], recent: [] }))
  it('renomeia e reordena lugares', () => {
    const s = useSettings.getState()
    s.addPlace('Academia', 'Rua 1', [-15.83, -47.99]); s.addPlace('Faculdade', 'Rua 2', [-15.85, -47.95])
    const [a, f] = useSettings.getState().places
    useSettings.getState().renamePlace(a.id, '  Crossfit  ')
    useSettings.getState().shiftPlace(f.id, -1)
    expect(useSettings.getState().places.map(p => p.name)).toEqual(['Faculdade', 'Crossfit'])
    useSettings.getState().renamePlace(a.id, '   ')
    expect(useSettings.getState().places[1].name).toBe('Crossfit')
  })
  it('guarda até 5 destinos recentes, sem repetir nem duplicar lugares salvos', () => {
    const s = useSettings.getState()
    for (let i = 0; i < 7; i++) s.addRecent('Lugar ' + i, [-15.7 - i * 0.01, -47.8])
    s.addRecent('Lugar 6 de novo', [-15.76, -47.8])
    s.addRecent('Casa', [-15.9, -48.1])
    const r = useSettings.getState().recent
    expect(r).toHaveLength(5); expect(r[0].name).toBe('Lugar 6 de novo'); expect(r.some(x => x.name === 'Casa')).toBe(false)
  })
})
