import { Map as MapIcon } from 'lucide-react'
import { useEffect } from 'react'
import { fmt1, hhmm } from '../domain/format'
import { CATS, cat } from '../domain/weather'
import { useRideNumbers } from '../hooks/useRideNumbers'
import { endpointName, useTrip } from '../store/trip'
import { Icon } from './icons'

/** Modo painel: números enormes e alto contraste para o celular preso no guidão. */
export function Dashboard() {
  const open = useTrip(s => s.dash), ride = useTrip(s => s.ride), dest = useTrip(s => s.dest)
  const n = useRideNumbers()
  const close = () => { useTrip.getState().set({ dash: false }); if (document.fullscreenElement) document.exitFullscreen().catch(() => {}) }
  useEffect(() => { if (open && !ride) close() }, [open, ride]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!open || !n) return null
  const { v, left, eta, ride: r, view } = n
  return (
    <div className="dash" role="dialog" aria-label="Modo painel" data-level={v.level}>
      <div className="dash-top">
        <span className="dash-to">até {endpointName(dest) || 'o destino'}</span>
        <button className="dash-exit" type="button" onClick={close}><MapIcon className="i" />Mapa</button>
      </div>
      <div className="dash-main">
        <div className="dash-ic" data-icon={v.icon}><Icon name={v.icon} /></div>
        <h2 className="dash-title">{v.title}</h2>
      </div>
      <div className="dash-speed"><b className="num">{r.ema > 2 ? Math.round(r.ema) : 0}</b><span>km/h</span></div>
      <div className="dash-grid">
        <div><b className="num">{hhmm(eta)}</b><span>chegada</span></div>
        <div><b className="num">{fmt1(left)}</b><span>km faltando</span></div>
      </div>
      <div className="dash-bar" aria-hidden="true">
        {view.ev.segs.map((sg, i) => <i key={i} style={{ flex: sg.to - sg.from, background: sg.to <= r.d ? '#56627d' : `var(${CATS[cat(sg.rate)].color})` }} />)}
        <em style={{ left: Math.min(100, r.d / view.route.total * 100) + '%' }} />
      </div>
    </div>
  )
}
