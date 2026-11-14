import { useEffect } from 'react'
import { useTrip } from '../store/trip'

/**
 * Atalhos de teclado (útil no computador): "/" vai para a busca, "R" atualiza, "Esc" fecha o trajeto.
 * Nunca disparam enquanto você digita, com uma janela aberta ou durante o pedal.
 */
export type ShortcutAction = 'search' | 'refresh' | 'close-popup' | 'close-trip' | null

export interface ShortcutContext { typing: boolean; dialogOpen: boolean; riding: boolean; mode: string; popupOpen: boolean }

export function shortcutFor(e: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'altKey'>, c: ShortcutContext): ShortcutAction {
  if (e.ctrlKey || e.metaKey || e.altKey || c.typing || c.dialogOpen) return null
  if (e.key === 'Escape') return c.popupOpen ? 'close-popup' : c.mode === 'trip' && !c.riding ? 'close-trip' : null
  if (c.riding) return null
  if (e.key === '/') return c.mode === 'trip' ? null : 'search'
  if (e.key === 'r' || e.key === 'R') return 'refresh'
  return null
}

const isTyping = (el: Element | null) => !!el && (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement || (el as HTMLElement).isContentEditable)

export function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.repeat) return
      const t = useTrip.getState()
      const action = shortcutFor(e, {
        typing: isTyping(document.activeElement), dialogOpen: !!document.querySelector('dialog[open]'),
        riding: !!t.ride, mode: t.mode, popupOpen: !!document.querySelector('#map .leaflet-popup'),
      })
      if (!action) return
      e.preventDefault()
      if (action === 'search') document.querySelector<HTMLInputElement>('#where')?.focus()
      else if (action === 'refresh') document.querySelector<HTMLButtonElement>('#refresh:not(:disabled)')?.click()
      else if (action === 'close-popup') document.querySelector<HTMLElement>('#map .leaflet-popup-close-button')?.click()
      else if (action === 'close-trip') t.closeTrip()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])
}
