import { Navigation } from 'lucide-react'
import { rideVerdict, verdict, type Verdict } from '../domain/advice'
import { accuracyText } from '../domain/calibration'
import { fmt1, hhmm } from '../domain/format'
import { rideSpeed, useTripView } from '../hooks/useTripView'
import { buzz, startRide, stopRide } from '../hooks/location'
import { useSettings } from '../store/settings'
import { endpointName, useTrip } from '../store/trip'
import { Icon } from './icons'
import { useEffect, useRef, useState } from 'react'

export function Hero() {
  const view = useTripView()
  const dep = useTrip(s => s.dep), ride = useTrip(s => s.ride), dest = useTrip(s => s.dest)
  const arrived = useTrip(s => s.arrived), pred = useTrip(s => s.feedbackPred), error = useTrip(s => s.error)
  const speed = useSettings(s => s.speed)
  const warned = useRef(false)
  const [thanks, setThanks] = useState('')
  const set = useTrip(s => s.set)

  let v: Verdict | null = null
  if (view) v = view.riding ? rideVerdict(view.ev, view.ctx, ride!.d, ride!.off, rideSpeed(ride!.ema, speed)) : verdict(view.ev, view.ctx)
  if (arrived && !view?.riding) v = { level: 'ok', icon: 'check', title: 'Você chegou', sub: thanks || 'Pedal encerrado. Bom trabalho!' }
  const loading = !view
  const riding = !!view?.riding
  const ev = view?.ev
  const left = riding && view ? Math.max(0, view.route.total - ride!.d) : 0
  const sp = rideSpeed(ride?.ema, speed)

  // vibração curta quando a chuva estiver a menos de 1 km à frente (uma vez por pedal)
  const rainAhead = riding && view ? view.ev.segs.find(sg => sg.to > ride!.d && sg.rate >= 0.2) : undefined
  const rainSoon = !!rainAhead && rainAhead.from - ride!.d < 1
  useEffect(() => { if (!ride) warned.current = false; else if (rainSoon && !warned.current) { warned.current = true; buzz([60, 80, 60]) } }, [ride, rainSoon])

  function answer(rained: boolean) {
    if (!pred) return
    const s = useSettings.getState()
    s.addFeedback({ ...pred, rained })
    const after = useSettings.getState()
    setThanks('Obrigado! ' + accuracyText(after.log, after.probTh))
    set({ feedbackPred: null })
    setTimeout(() => { setThanks(''); set({ arrived: false }) }, 6000)
  }
  function toggleRide() {
    if (ride) { stopRide(); return }
    const err = startRide(); if (err) set({ error: err })
  }

  const rideButton = (
    <button className="btn primary ride-btn" type="button" id="ride" onClick={toggleRide}>
      <Navigation className="i" /><span id="ride-lbl">{ride ? (ride.pos ? 'Encerrar pedal' : 'Procurando GPS…') : 'Iniciar pedal'}</span>
    </button>
  )

  return (
    <section className={'card hero' + (loading ? ' loading' : '') + (riding ? ' riding' : '')} id="hero" data-level={v?.level ?? 'ok'} aria-live="polite">
      <div className="livebadge"><i /><span id="live-txt">AO VIVO · {ride?.weakSignal ? 'sinal de GPS fraco' : 'indo para ' + (endpointName(dest) || 'o destino')}</span></div>
      <div className="hero-main">
        <div className="wx" id="wx-icon" data-icon={v?.icon}>{v && <Icon name={v.icon} />}</div>
        <div>
          <h1 id="v-title">{v?.title ?? (error ? 'Sem previsão' : 'Carregando previsão…')}</h1>
          <p className="sub" id="v-sub">{v?.sub ?? (error || 'Buscando rota, previsão e radar.')}</p>
        </div>
      </div>
      {!riding && rideButton}
      <div className="meta">
        <div><b id="s-time">{!ev ? '–' : riding ? fmt1(left) + ' km' : Math.round(ev.dur / 60000) + ' min'}</b><span id="m-l1">{riding ? 'faltam' : 'de viagem'}</span></div>
        <div><b id="s-arr">{!ev ? '–' : hhmm(riding ? (ride!.last?.t ?? ev.depMs) + left / sp * 3600e3 : ev.arr)}</b><span>chegada</span></div>
        <div><b id="s-rain">{!ev ? '–' : riding ? (ride!.ema > 2 ? Math.round(ride!.ema) + ' km/h' : 'parado') : ev.exposure < 0.05 ? '0 mm' : fmt1(ev.exposure) + ' mm'}</b><span id="m-l3">{riding ? 'velocidade' : 'chuva no trajeto'}</span></div>
        <div><b id="s-wind">{!ev ? '–' : Math.abs(ev.head).toFixed(0) + ' km/h'}</b><span id="s-wind-l">{!ev ? 'vento' : Math.abs(ev.head) < 3 ? 'vento fraco' : ev.head > 0 ? 'vento contra' : 'vento a favor'}</span></div>
      </div>
      {arrived && pred && (
        <div className="fb" id="fb">
          <span>A previsão acertou? Choveu no caminho?</span>
          <div className="row">
            <button className="btn" type="button" data-rained="1" onClick={() => answer(true)}>Choveu</button>
            <button className="btn" type="button" data-rained="0" onClick={() => answer(false)}>Não choveu</button>
          </div>
        </div>
      )}
      {riding && rideButton}
      <div className="when">
        <span>Saída</span>
        <button className="chip" type="button" id="dep-now" aria-pressed={dep == null} onClick={() => set({ dep: null })}>Agora</button>
        <input type="time" id="dep" step={300} aria-label="Horário de saída" value={ev ? hhmm(ev.depMs) : ''}
          onChange={e => {
            const [H, M] = e.target.value.split(':').map(Number); if (Number.isNaN(H)) return
            const d = new Date(); d.setHours(H, M, 0, 0); if (d.getTime() < Date.now() - 30 * 60e3) d.setDate(d.getDate() + 1)
            set({ dep: d.getTime() })
          }} />
      </div>
    </section>
  )
}
