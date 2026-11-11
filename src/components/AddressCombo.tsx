import { MapPin, X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { featLabel, parseCoords, shortName, type PhotonFeature } from '../domain/places'
import type { LatLon } from '../domain/types'
import { searchPlaces } from '../services/places'

interface Props {
  id: string
  value: string
  placeholder: string
  label: string
  onPick: (ll: LatLon, name: string) => void
  onClear?: () => void
  caption?: string
}

/** Campo de endereço com sugestões enquanto digita (Photon), link do Google Maps ou coordenadas. */
export function AddressCombo({ id, value, placeholder, label, onPick, onClear, caption }: Props) {
  const [text, setText] = useState(value)
  const [items, setItems] = useState<PhotonFeature[]>([])
  const [open, setOpen] = useState(false)
  const [msg, setMsg] = useState('')
  const [sel, setSel] = useState(-1)
  const seq = useRef(0), timer = useRef<ReturnType<typeof setTimeout>>(undefined), focused = useRef(false)
  const listId = useId()
  useEffect(() => { if (!focused.current) setText(value) }, [value])

  function onInput(q: string) {
    setText(q); clearTimeout(timer.current)
    const co = parseCoords(q.trim())
    if (co) { setOpen(false); onPick(co, ''); setText('Ponto colado'); return }
    if (q.trim().length < 3) { setOpen(false); return }
    timer.current = setTimeout(async () => {
      const my = ++seq.current
      try { const res = await searchPlaces(q.trim()); if (my !== seq.current) return; setItems(res); setSel(-1); setMsg(res.length ? '' : 'Nada encontrado. Tente outro termo ou marque no mapa.'); setOpen(true) }
      catch { setItems([]); setMsg('Busca indisponível agora. Marque no mapa.'); setOpen(true) }
    }, 280)
  }
  function choose(i: number) {
    const f = items[i]; if (!f) return
    const c = f.geometry.coordinates, n = shortName(f)
    setText(n); setOpen(false); onPick([c[1], c[0]], n)
  }
  return (
    <div className="combo">
      {caption && <label className="cap" htmlFor={id}>{caption}</label>}
      <input id={id} type="text" autoComplete="off" spellCheck={false} placeholder={placeholder} aria-label={label} value={text}
        role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={listId} aria-activedescendant={sel >= 0 ? `${listId}-${sel}` : undefined}
        onChange={e => onInput(e.target.value)}
        onFocus={e => { focused.current = true; e.target.select() }}
        onBlur={() => setTimeout(() => { focused.current = false; setOpen(false); setText(value) }, 150)}
        onKeyDown={e => {
          if (!open || !items.length) { if (e.key === 'Escape' && open) { e.preventDefault(); setOpen(false) } return }
          if (e.key === 'ArrowDown') { e.preventDefault(); setSel((sel + 1) % items.length) }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((sel - 1 + items.length) % items.length) }
          else if (e.key === 'Enter') { e.preventDefault(); choose(sel < 0 ? 0 : sel) }
          else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setOpen(false) }
        }} />
      {onClear && <button className="clear" type="button" aria-label={'Limpar ' + label} onClick={() => { setText(''); onClear() }}><X /></button>}
      {open && (
        <ul className="sugg" id={listId} role="listbox" onMouseDown={e => e.preventDefault()}>
          {items.length ? items.map((f, i) => { const l = featLabel(f); return (
            <li key={i} role="option" id={`${listId}-${i}`} aria-selected={i === sel} data-i={i} onClick={() => choose(i)}>
              <MapPin /><div><b>{l.main}</b>{l.sub && <small>{l.sub}</small>}</div>
            </li>) }) : <li className="empty">{msg}</li>}
        </ul>
      )}
    </div>
  )
}
