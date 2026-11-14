import { describe, expect, it } from 'vitest'
import { shortcutFor, type ShortcutContext } from './shortcuts'

const k = (key: string, mod: Partial<{ ctrlKey: boolean; metaKey: boolean; altKey: boolean }> = {}) => ({ key, ctrlKey: false, metaKey: false, altKey: false, ...mod })
const base: ShortcutContext = { typing: false, dialogOpen: false, riding: false, mode: 'explore', popupOpen: false }

describe('atalhos de teclado', () => {
  it('"/" vai para a busca e "R" atualiza', () => {
    expect(shortcutFor(k('/'), base)).toBe('search')
    expect(shortcutFor(k('r'), base)).toBe('refresh')
    expect(shortcutFor(k('R'), base)).toBe('refresh')
  })
  it('Esc fecha o balão do mapa antes do trajeto', () => {
    expect(shortcutFor(k('Escape'), { ...base, mode: 'trip' })).toBe('close-trip')
    expect(shortcutFor(k('Escape'), { ...base, mode: 'trip', popupOpen: true })).toBe('close-popup')
    expect(shortcutFor(k('Escape'), base)).toBeNull()
  })
  it('não atrapalha quem digita, janelas abertas, Ctrl+R nem o pedal', () => {
    expect(shortcutFor(k('r'), { ...base, typing: true })).toBeNull()
    expect(shortcutFor(k('/'), { ...base, dialogOpen: true })).toBeNull()
    expect(shortcutFor(k('r', { ctrlKey: true }), base)).toBeNull()
    expect(shortcutFor(k('Escape'), { ...base, mode: 'trip', riding: true })).toBeNull()
    expect(shortcutFor(k('r'), { ...base, riding: true })).toBeNull()
    expect(shortcutFor(k('/'), { ...base, mode: 'trip' })).toBeNull()
  })
})
