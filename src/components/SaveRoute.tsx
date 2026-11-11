import { BookmarkCheck } from 'lucide-react'
import { useState } from 'react'
import { useTrip } from '../store/trip'

/** Formulário curto: nome + Salvar (usado no histórico e na importação do print). */
export function NameForm({ initial, label, onSave, onCancel }: { initial: string; label: string; onSave: (name: string) => void; onCancel: () => void }) {
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

/** Aviso abaixo das rotas quando a escolhida é uma rota sua. */
export function SavedNote() {
  const routes = useTrip(s => s.routes), sel = useTrip(s => s.sel), ride = useTrip(s => s.ride)
  const route = routes[sel]
  if (!route?.saved || ride) return null
  return <p className="saved-note" id="route-saved"><BookmarkCheck className="i" /><span>Sua rota: <b>{route.saved.name}</b>. Gerencie em Ajustes → Rotas salvas.</span></p>
}
