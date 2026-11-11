import { Wind } from 'lucide-react'
import { useTripView } from '../hooks/useTripView'
import { useTrip } from '../store/trip'

const MAX = 40 // km/h no fim do arco
const R = 40, C = 2 * Math.PI * R, ARC = 0.75 // arco de 270°

/** Velocímetro sobre o mapa durante o pedal, com o vento logo abaixo. */
export function Speedometer() {
  const ride = useTrip(s => s.ride), view = useTripView()
  if (!ride?.pos) return null
  const kmh = ride.weakSignal ? null : ride.ema > 2 ? Math.round(ride.ema) : 0
  const frac = Math.min(1, (kmh ?? 0) / MAX)
  const head = view?.ev.head ?? 0
  const wind = Math.abs(head) < 3 ? 'vento fraco' : `${Math.round(Math.abs(head))} ${head > 0 ? 'contra' : 'a favor'}`
  return (
    <div className="speedo" id="speedo" role="status" aria-label={kmh == null ? 'Velocidade indisponível: sinal de GPS fraco' : `Velocidade: ${kmh} quilômetros por hora`}>
      <div className="speedo-dial">
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <circle cx="50" cy="50" r={R} className="speedo-track" strokeDasharray={`${C * ARC} ${C}`} />
          <circle cx="50" cy="50" r={R} className="speedo-val" strokeDasharray={`${C * ARC * frac} ${C}`} />
        </svg>
        <b className="num" id="speedo-num">{kmh ?? '–'}</b>
        <span>km/h</span>
      </div>
      {view && <div className="speedo-wind" data-head={head > 3 ? 'contra' : head < -3 ? 'favor' : 'fraco'}><Wind className="i" />{wind}</div>}
    </div>
  )
}
