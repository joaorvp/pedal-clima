import { ArrowUp, ArrowUpLeft, ArrowUpRight, CornerUpLeft, CornerUpRight, Flag, Undo2 } from 'lucide-react'
import { nextTurn, turnDistance, turnText, type Turn } from '../domain/turns'
import { useTripView } from '../hooks/useTripView'
import { endpointName, useTrip } from '../store/trip'

function TurnIcon({ t }: { t: Turn | undefined }) {
  if (!t) return <Flag className="i" />
  if (t.kind === 'uturn') return <Undo2 className="i" />
  if (t.kind === 'slight') return t.dir === 'right' ? <ArrowUpRight className="i" /> : <ArrowUpLeft className="i" />
  return t.dir === 'right' ? <CornerUpRight className="i" /> : <CornerUpLeft className="i" />
}

/** Cartão da próxima manobra no topo do mapa, durante o pedal. */
export function NextTurn() {
  const view = useTripView(), ride = useTrip(s => s.ride), dest = useTrip(s => s.dest)
  if (!ride?.pos || !view || ride.off > 0.15) return null
  const d = ride.d, t = nextTurn(view.turns, d), left = Math.max(0, view.route.total - d)
  // sem curva nos próximos 2 km: só "siga em frente"
  const far = t && t.km - d > 2
  const dist = t && !far ? t.km - d : left
  const text = t && !far ? turnText(t) : far ? 'siga em frente' : 'até ' + (endpointName(dest) || 'o destino')
  return (
    <div className="nextturn" id="next-turn" role="status" aria-label={`${turnDistance(dist)}: ${text}`} data-now={t && !far && t.km - d <= 0.05 ? '1' : undefined}>
      <span className="nt-ic">{far ? <ArrowUp className="i" /> : <TurnIcon t={t} />}</span>
      <span className="nt-txt"><b className="num">{turnDistance(dist)}</b><small>{text}</small></span>
    </div>
  )
}
