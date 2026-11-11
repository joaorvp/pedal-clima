import { ArrowUpDown, Briefcase, House, LocateFixed, MapPinned, Star, X } from 'lucide-react'
import { useState } from 'react'
import { useSettings } from '../store/settings'
import { endpointLL, endpointName, useTrip, type Endpoint } from '../store/trip'
import { AddressCombo } from './AddressCombo'

type Which = 'origin' | 'dest'

/** Cabeçalho do trajeto: de onde, para onde (toque para trocar), ponto de passagem, inverter e fechar. */
export function TripHeader() {
  const origin = useTrip(s => s.origin), dest = useTrip(s => s.dest), ride = useTrip(s => s.ride), via = useTrip(s => s.via)
  const [editing, setEditing] = useState<Which | null>(null)
  const t = useTrip.getState
  if (ride) return null
  return (
    <section className="card triphead" aria-label="Trajeto">
      <div className="ends">
        <button type="button" className="end" aria-label={'Trocar origem: ' + endpointName(origin)} aria-expanded={editing === 'origin'} onClick={() => setEditing(editing === 'origin' ? null : 'origin')}>
          <i className="dot-o" aria-hidden="true" /><span className="nm">{endpointName(origin)}</span>
        </button>
        {via && <div className="end via"><i className="dot-v" aria-hidden="true">P</i><span className="nm">Passando pelo ponto P</span>
          <button type="button" className="ibtn sm" aria-label="Remover ponto de passagem" onClick={() => { t().set({ via: null, routes: [] }); t().refresh() }}><X className="i" /></button></div>}
        <button type="button" className="end" aria-label={'Trocar destino: ' + endpointName(dest)} aria-expanded={editing === 'dest'} onClick={() => setEditing(editing === 'dest' ? null : 'dest')}>
          <i className="dot-d" aria-hidden="true" /><span className="nm"><b>{endpointName(dest)}</b></span>
        </button>
      </div>
      <div className="actions">
        <button className="ibtn" type="button" aria-label="Inverter origem e destino" onClick={() => { setEditing(null); t().swap() }}><ArrowUpDown className="i" /></button>
        <button className="ibtn" type="button" aria-label="Fechar trajeto" onClick={() => t().closeTrip()}><X className="i" /></button>
      </div>
      {editing && <EndPicker which={editing} onDone={() => setEditing(null)} />}
    </section>
  )
}

/** Escolher a origem ou o destino: busca, sua localização, lugares salvos ou tocar no mapa. */
function EndPicker({ which, onDone }: { which: Which; onDone: () => void }) {
  const s = useSettings(), me = useTrip(st => st.me), t = useTrip.getState
  const pick = (e: Endpoint) => { onDone(); t().setEnd(which, e) }
  const place = (ll: [number, number], name: string, key?: string) => pick({ kind: 'place', ll, name, key })
  return (
    <div className="endpick">
      <AddressCombo id={'end-' + which} label={which === 'origin' ? 'De onde?' : 'Para onde?'} placeholder={which === 'origin' ? 'De onde você sai?' : 'Para onde vamos?'} value="" autoFocus
        onPick={(ll, name) => place(ll, name || 'Ponto colado')} />
      <div className="shortcuts" role="list">
        {me && <button type="button" role="listitem" className="sc" onClick={() => pick({ kind: 'me' })}><LocateFixed className="i" /><span>Sua localização</span></button>}
        {s.homeSet && <button type="button" role="listitem" className="sc" onClick={() => place(s.home, 'Casa', 'home')}><House className="i" /><span>Casa</span></button>}
        {s.workSet && <button type="button" role="listitem" className="sc" onClick={() => place(s.work, 'Trabalho', 'work')}><Briefcase className="i" /><span>Trabalho</span></button>}
        {s.places.map(p => <button key={p.id} type="button" role="listitem" className="sc" onClick={() => place([p.lat, p.lon], p.name, p.id)}><Star className="i" /><span>{p.name}</span></button>)}
        <button type="button" role="listitem" className="sc" onClick={() => { onDone(); t().set({ pickMode: which, sheet: 'peek' }) }}><MapPinned className="i" /><span>Escolher no mapa</span></button>
      </div>
    </div>
  )
}

/** Abrir o trajeto em outro app, para a navegação curva a curva. */
export function OpenIn() {
  const origin = useTrip(s => s.origin), dest = useTrip(s => s.dest), me = useTrip(s => s.me), via = useTrip(s => s.via)
  const a = endpointLL(origin, me), b = endpointLL(dest, me), f = (p: [number, number]) => p[0] + ',' + p[1]
  if (!b) return null
  const g = new URLSearchParams({ api: '1', destination: f(b), travelmode: 'bicycling' })
  if (a && origin.kind !== 'me') g.set('origin', f(a))
  if (via) g.set('waypoints', f(via))
  return (
      <div className="open-in">
        <a className="btn" id="open-gmaps" href={'https://www.google.com/maps/dir/?' + g} target="_blank" rel="noopener">Abrir no Google Maps</a>
        <a className="btn" id="open-waze" href={`https://waze.com/ul?ll=${f(b)}&navigate=yes`} target="_blank" rel="noopener">Abrir no Waze</a>
      </div>
  )
}
