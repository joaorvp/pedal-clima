import { Bookmark, BookmarkCheck } from 'lucide-react'
import { useState } from 'react'
import type { LatLon } from '../domain/types'
import { useSettings } from '../store/settings'
import { endpointName, useTrip } from '../store/trip'
import { useUndo } from '../store/undo'

/** Formulário curto: nome + Salvar. Usado para a rota escolhida e para o caminho gravado no pedal. */
function NameForm({ initial, label, onSave, onCancel }: { initial: string; label: string; onSave: (name: string) => void; onCancel: () => void }) {
  const [name, setName] = useState(initial)
  return (
    <form className="save-form" onSubmit={e => { e.preventDefault(); onSave(name) }}>
      <label htmlFor="route-name">{label}</label>
      <input id="route-name" value={name} maxLength={40} autoFocus onChange={e => setName(e.target.value)} onFocus={e => e.currentTarget.select()} />
      <div className="row">
        <button className="btn primary" type="submit" id="route-save-ok">Salvar</button>
        <button className="btn" type="button" onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  )
}

/** "Salvar esta rota": a rota escolhida (inclusive moldada com pontos de passagem) vira uma rota sua, com nome. */
export function SaveRoute() {
  const routes = useTrip(s => s.routes), sel = useTrip(s => s.sel), dest = useTrip(s => s.dest), ride = useTrip(s => s.ride)
  const [open, setOpen] = useState(false), [msg, setMsg] = useState('')
  const route = routes[sel]
  if (!route || ride) return null
  if (route.saved) return <p className="saved-note" id="route-saved"><BookmarkCheck className="i" /><span>Rota salva: <b>{route.saved.name}</b>. Gerencie em Ajustes → Rotas salvas.</span></p>
  if (open) return <NameForm initial={'Meu caminho para ' + (endpointName(dest) || 'o destino')} label="Nome da rota"
    onCancel={() => setOpen(false)}
    onSave={name => { save(name, route.line); setOpen(false); setMsg('Rota salva. Da próxima vez ela aparece primeiro neste trajeto.') }} />
  return <>
    <button className="btn save-btn" type="button" id="route-save" onClick={() => { setMsg(''); setOpen(true) }}><Bookmark className="i" />Salvar esta rota</button>
    {msg && <p className="note" style={{ margin: '6px 0 0' }}>{msg}</p>}
  </>
}

/** Ao chegar: salvar o caminho que você realmente fez como rota de referência. */
export function SaveTrack() {
  const track = useTrip(s => s.lastTrack), dest = useTrip(s => s.dest)
  const [open, setOpen] = useState(false)
  if (!track) return null
  if (open) return <NameForm initial={'Meu caminho para ' + (endpointName(dest) || 'o destino')} label="Nome para o caminho que você fez"
    onCancel={() => setOpen(false)}
    onSave={name => { save(name, track); useTrip.getState().set({ lastTrack: null }); setOpen(false) }} />
  return <button className="btn save-btn" type="button" id="track-save" onClick={() => setOpen(true)}><Bookmark className="i" />Salvar o caminho que você fez</button>
}

function save(name: string, line: LatLon[]) {
  const id = useSettings.getState().saveRoute(name, line)
  // a rota salva passa a valer já neste trajeto
  const t = useTrip.getState(); t.set({ routes: [], vias: [], viaName: '' }); useSettings.getState().patch({ routePick: useSettings.getState().savedRoutes.find(r => r.id === id)?.name }); t.refresh()
  useUndo.getState().show('Rota salva', () => { useSettings.getState().removeRoute(id); useTrip.getState().set({ routes: [] }); useTrip.getState().refresh() })
}
