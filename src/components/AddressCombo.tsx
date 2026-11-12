import { Briefcase, Clock, Hash, House, Loader2, MapPin, Star, X } from 'lucide-react'
import { quickSave } from '../store/actions'
import { useEffect, useId, useRef, useState } from 'react'
import { distLabel, matchLocal, parseCep, parseCoords, type PlaceHit } from '../domain/places'
import type { LatLon } from '../domain/types'
import { lastView } from '../hooks/location'
import { resolveShared, searchPlaces } from '../services/places'
import { looksShared, parseShared } from '../domain/shareParse'
import { useSettings } from '../store/settings'
import { useTrip } from '../store/trip'

interface Props {
  id: string
  value: string
  placeholder: string
  label: string
  onPick: (ll: LatLon, name: string) => void
  onClear?: () => void
  caption?: string
  autoFocus?: boolean
  onFocusField?: () => void
  /** mostra a estrela ☆ para salvar o resultado em Meus lugares */
  saveStar?: boolean
}

const ICON = { home: House, work: Briefcase, saved: Star, recent: Clock, search: MapPin, cep: Hash }

/** Seus lugares (casa, trabalho, salvos e recentes) como resultados de busca. */
function localHits(): PlaceHit[] {
  const s = useSettings.getState(), out: PlaceHit[] = []
  if (s.homeSet) out.push({ ll: s.home, main: 'Casa', sub: s.names.home, kind: 'home' })
  if (s.workSet) out.push({ ll: s.work, main: 'Trabalho', sub: s.names.work, kind: 'work' })
  s.places.forEach(p => out.push({ ll: [p.lat, p.lon], main: p.name, sub: p.addr ?? '', kind: 'saved' }))
  s.recent.forEach(r => out.push({ ll: [r.lat, r.lon], main: r.name.split(',')[0], sub: r.name.split(',').slice(1).join(',').trim(), kind: 'recent' }))
  return out
}

/**
 * Campo de endereço: seus lugares aparecem na hora; nome, rua, bairro ou CEP são procurados na internet
 * (Photon e Nominatim juntos, perto de você primeiro). Também aceita link do Google Maps ou coordenadas.
 */
export function AddressCombo({ id, value, placeholder, label, onPick, onClear, caption, autoFocus, onFocusField, saveStar }: Props) {
  const [text, setText] = useState(value)
  const [items, setItems] = useState<PlaceHit[]>([])
  const [open, setOpen] = useState(false)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [sel, setSel] = useState(-1)
  const [savedIdx, setSavedIdx] = useState<number[]>([])
  const seq = useRef(0), timer = useRef<ReturnType<typeof setTimeout>>(undefined), focused = useRef(false)
  const listId = useId()
  useEffect(() => { if (!focused.current) setText(value) }, [value])
  const near = (): LatLon | null => useTrip.getState().me?.pos ?? lastView()?.c ?? null

  function onInput(q: string) {
    setText(q); clearTimeout(timer.current)
    const t = q.trim(), co = parseCoords(t)
    if (co) { seq.current++; setBusy(false); setOpen(false); onPick(co, ''); setText('Ponto colado'); return }
    // texto compartilhado do Google Maps (nome, endereço, link) colado aqui: acha o lugar pelo endereço
    if (looksShared(q)) {
      const sh = parseShared({ text: q })
      if (sh) {
        const my = ++seq.current
        setItems([]); setMsg(''); setOpen(true); setBusy(true)
        resolveShared(sh, near()).then(r => {
          if (my !== seq.current) return
          setBusy(false)
          if (r) { setOpen(false); setText(r.name); onPick(r.ll, r.name) }
          else setMsg('Não achei o endereço desse link. Busque pelo nome ou marque no mapa.')
        })
        return
      }
    }
    const mine = t ? matchLocal(t, localHits()).slice(0, 4) : []
    // texto curto: cancela a busca anterior (senão o "Procurando…" ficava preso)
    if (t.length < 3) { seq.current++; setBusy(false) }
    if (t.length < 3 && !mine.length) { setOpen(false); return }
    setItems(mine); setSel(-1); setMsg(''); setOpen(true)
    if (t.length < 3) return
    const my = ++seq.current
    setBusy(true)
    // espera uma pausa na digitação: uma busca por pausa (os serviços gratuitos pedem uso leve)
    timer.current = setTimeout(async () => {
      try {
        const withMine = (found: PlaceHit[]) => [...mine, ...found.filter(f => !mine.some(m => Math.abs(m.ll[0] - f.ll[0]) + Math.abs(m.ll[1] - f.ll[1]) < 0.0004))]
        // o que chegar primeiro já aparece; o resto se junta quando chegar
        const found = await searchPlaces(t, near(), part => { if (my === seq.current) { setItems(withMine(part)); setSavedIdx([]) } })
        if (my !== seq.current) return
        const all = withMine(found)
        setItems(all); setSel(-1); setSavedIdx([])
        setMsg(all.length ? '' : parseCep(t) ? 'CEP não encontrado. Confira os números ou procure pelo nome da rua.' : 'Nada encontrado. Tente o nome do lugar, a rua com a cidade ou o CEP, ou marque no mapa.')
      } catch {
        if (my !== seq.current) return
        setMsg(mine.length ? '' : 'Busca indisponível agora (sem conexão?). Marque no mapa.')
      } finally { if (my === seq.current) setBusy(false) }
    }, 350)
  }
  function choose(i: number) {
    const h = items[i]; if (!h) return
    const n = h.kind === 'home' || h.kind === 'work' || h.kind === 'saved' ? h.main : h.sub ? h.main + ', ' + h.sub.split(' · ')[0] : h.main
    setText(n); setOpen(false); onPick(h.ll, n)
  }
  const from = open ? near() : null
  return (
    <div className="combo">
      {caption && <label className="cap" htmlFor={id}>{caption}</label>}
      <input id={id} type="text" autoComplete="off" spellCheck={false} placeholder={placeholder} aria-label={label} value={text} autoFocus={autoFocus}
        role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={listId} aria-activedescendant={sel >= 0 ? `${listId}-${sel}` : undefined}
        enterKeyHint="search"
        onChange={e => onInput(e.target.value)}
        // colar um compartilhamento do Google Maps: lê com as quebras de linha (o campo de uma linha as apagaria)
        onPaste={e => { const t = e.clipboardData.getData('text'); if (looksShared(t)) { e.preventDefault(); onInput(t) } }}
        onFocus={e => { focused.current = true; e.target.select(); onFocusField?.() }}
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
          {items.map((h, i) => { const I = ICON[h.kind], d = h.kind === 'search' || h.kind === 'cep' ? distLabel(from, h.ll) : ''; return (
            <li key={i} role="option" id={`${listId}-${i}`} aria-selected={i === sel} data-i={i} data-kind={h.kind} onClick={() => choose(i)}>
              <I /><div><b>{h.main}</b>{h.sub && <small>{h.sub}</small>}</div>{d && <span className="dist num">{d}</span>}
              {saveStar && (h.kind === 'search' || h.kind === 'cep') && (savedIdx.includes(i)
                ? <span className="star on" aria-label="Salvo"><Star /></span>
                : <button type="button" className="star" aria-label={'Salvar ' + h.main + ' em Meus lugares'} onClick={e => { e.stopPropagation(); quickSave(h.main, h.sub ? h.main + ', ' + h.sub.split(' · ').join(', ') : h.main, h.ll); setSavedIdx([...savedIdx, i]) }}><Star /></button>)}
            </li>) })}
          {busy && <li className="empty busy" aria-live="polite"><Loader2 className="spin-i" />Procurando…</li>}
          {!busy && !items.length && msg && <li className="empty">{msg}</li>}
        </ul>
      )}
    </div>
  )
}
