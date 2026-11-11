import { ArrowUpDown, X } from 'lucide-react'
import { endpointLL, endpointName, useTrip } from '../store/trip'

/** Cabeçalho do trajeto: de onde, para onde, inverter, fechar e abrir em outro app. */
export function TripHeader() {
  const origin = useTrip(s => s.origin), dest = useTrip(s => s.dest), ride = useTrip(s => s.ride)
  const t = useTrip.getState
  if (ride) return null
  return (
    <section className="card triphead" aria-label="Trajeto">
      <div className="ends">
        <div className="end"><i className="dot-o" aria-hidden="true" /><span className="nm">{endpointName(origin)}</span></div>
        <div className="end"><i className="dot-d" aria-hidden="true" /><span className="nm"><b>{endpointName(dest)}</b></span></div>
      </div>
      <div className="actions">
        <button className="ibtn" type="button" aria-label="Inverter origem e destino" onClick={() => t().swap()}><ArrowUpDown className="i" /></button>
        <button className="ibtn" type="button" aria-label="Fechar trajeto" onClick={() => t().closeTrip()}><X className="i" /></button>
      </div>
    </section>
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
