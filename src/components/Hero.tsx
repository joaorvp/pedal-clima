import { Navigation, Share2 } from 'lucide-react'
import { rideVerdict, verdict, type Verdict } from '../domain/advice'
import { accuracyText } from '../domain/calibration'
import { fmt1, hhmm } from '../domain/format'
import { rideSpeed, useTripView } from '../hooks/useTripView'
import { useRideNumbers } from '../hooks/useRideNumbers'
import { buzz, startRide, stopRide } from '../hooks/location'
import { baseSpeed, useSettings } from '../store/settings'
import { endpointName, useTrip, type RideSummary } from '../store/trip'
import { Icon } from './icons'
import { RideTools } from './RideTools'
import { useEffect, useRef, useState } from 'react'

export function Hero() {
  const view = useTripView()
  const rn = useRideNumbers()
  const dep = useTrip(s => s.dep), ride = useTrip(s => s.ride), dest = useTrip(s => s.dest)
  const arrived = useTrip(s => s.arrived), pred = useTrip(s => s.feedbackPred), error = useTrip(s => s.error), summary = useTrip(s => s.summary)
  const speed = useSettings(baseSpeed)
  const warned = useRef(false)
  const tIda = useSettings(st => st.tIda), tVolta = useSettings(st => st.tVolta), now = useTrip(st => st.now)
  // "Amanhã": usa o horário da rotina (volta, se o destino é casa; ida, nos demais) ou 07:00
  const tomorrowTime = (dest?.kind === 'place' && dest.key === 'home' ? tVolta : tIda) || '07:00'
  const tomorrow = dep != null && new Date(dep).toDateString() !== new Date(now).toDateString() && dep > now
  const [thanks, setThanks] = useState('')
  const set = useTrip(s => s.set)

  let v: Verdict | null = null
  if (view) v = view.riding ? rideVerdict(view.ev, view.ctx, ride!.d, ride!.off, rideSpeed(ride, speed)) : verdict(view.ev, view.ctx)
  if (arrived && !view?.riding) v = { level: 'ok', icon: 'check', title: 'Você chegou', sub: thanks || 'Pedal encerrado. Bom trabalho!' }
  const loading = !view
  const riding = !!view?.riding
  const ev = view?.ev
  const left = riding && view ? Math.max(0, view.route.total - ride!.d) : 0
  const sp = rideSpeed(ride, speed)

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
    setTimeout(() => setThanks(''), 6000)
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
      {riding && ride!.offSince != null && ride!.off > 0.15 && (
        <div className="offroute" role="status">
          <span><b>Fora da rota · recalculando</b><small>Você está a {Math.round(ride!.off * 1000)} m do caminho. O app refaz a rota a partir de onde você está.</small></span>
          <button className="btn" type="button" id="recalc" onClick={() => useTrip.getState().setEnd('origin', { kind: 'me' })}>Recalcular agora</button>
        </div>
      )}
      {arrived && summary && !riding ? <Summary s={summary} /> : <>
      {!riding && rideButton}
      <div className="meta">
        <div><b id="s-time">{!ev ? '–' : riding ? fmt1(left) + ' km' : Math.round(ev.dur / 60000) + ' min'}</b><span id="m-l1">{riding ? 'faltam' : 'de viagem'}</span></div>
        <div><b id="s-arr">{!ev ? '–' : hhmm(riding ? (ride!.last?.t ?? ev.depMs) + left / sp * 3600e3 : ev.arr)}</b><span>chegada</span></div>
        <div><b id="s-rain">{!ev ? '–' : riding ? (ride!.ema > 2 ? Math.round(ride!.ema) + ' km/h' : 'parado') : ev.exposure < 0.05 ? '0 mm' : fmt1(ev.exposure) + ' mm'}</b><span id="m-l3">{riding ? 'velocidade' : 'chuva no trajeto'}</span></div>
        {riding && rn && <div><b id="s-ahead">{rn.aheadMm < 0.05 ? 'seco' : fmt1(rn.aheadMm) + ' mm'}</b><span>chuva à frente</span></div>}
        {riding && rn && <div><b id="s-prob">{rn.aheadProb}%</b><span>chance de chuva</span></div>}
        <div><b id="s-wind">{!ev ? '–' : Math.abs(ev.head).toFixed(0) + ' km/h'}</b><span id="s-wind-l">{!ev ? 'vento' : Math.abs(ev.head) < 3 ? 'vento fraco' : ev.head > 0 ? 'vento contra' : 'vento a favor'}</span></div>
      </div>
      </>}
      {arrived && pred && (
        <div className="fb" id="fb">
          <span>A previsão acertou? Choveu no caminho?</span>
          <div className="row">
            <button className="btn" type="button" data-rained="1" onClick={() => answer(true)}>Choveu</button>
            <button className="btn" type="button" data-rained="0" onClick={() => answer(false)}>Não choveu</button>
          </div>
        </div>
      )}
      {riding && <RideTools />}
      {riding && rideButton}
      <div className="when">
        <span>Saída</span>
        <button className="chip" type="button" id="dep-now" aria-pressed={dep == null} onClick={() => set({ dep: null })}>Agora</button>
        <button className="chip" type="button" id="dep-tomorrow" aria-pressed={tomorrow} onClick={() => set({ dep: tomorrowAt(tomorrowTime) })}>Amanhã {tomorrowTime}</button>
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

/** Resumo do pedal ao chegar, com botão de compartilhar. */
function Summary({ s }: { s: RideSummary }) {
  const [msg, setMsg] = useState('')
  const text = `Pedalei ${fmt1(s.km)} km até ${s.dest} em ${s.mins} min` + (s.avg > 0 && s.avg < 70 ? ` (média ${Math.round(s.avg)} km/h)` : '') +
    (s.rain >= 0.1 ? `, com ${fmt1(s.rain)} mm de chuva prevista no caminho.` : ', sem chuva no caminho.') + ' Pedágua · pedal com previsão'
  async function share() {
    try { if (navigator.share) { await navigator.share({ title: 'Pedágua', text }); return } } catch { return }
    try { await navigator.clipboard.writeText(text); setMsg('Resumo copiado.') } catch { setMsg(text) }
  }
  return (
    <div className="summary">
      <div className="meta">
        <div><b>{fmt1(s.km)} km</b><span>percorridos</span></div>
        <div><b>{s.mins} min</b><span>de pedal</span></div>
        <div><b>{s.avg > 0 && s.avg < 70 ? Math.round(s.avg) + ' km/h' : '–'}</b><span>média</span></div>
        <div><b>{s.rain >= 0.1 ? fmt1(s.rain) + ' mm' : 'seco'}</b><span>chuva no caminho</span></div>
      </div>
      {s.wh != null && <p className="note" style={{ margin: '8px 0 0' }}>Bateria usada: ~{Math.round(s.wh)} Wh (estimativa).</p>}
      <button className="btn" type="button" id="share" onClick={share} style={{ marginTop: 10, width: '100%', justifyContent: 'center' }}><Share2 className="i" />Compartilhar resumo</button>
      <button className="linkbtn" type="button" style={{ marginTop: 10 }} onClick={() => useTrip.getState().set({ historyOpen: true })}>Ver histórico de pedais</button>
      {msg && <p className="note" style={{ margin: '6px 0 0' }}>{msg}</p>}
    </div>
  )
}

/** Horário de amanhã (HH:MM) em milissegundos. */
function tomorrowAt(hm: string) {
  const [h, m] = hm.split(':').map(Number), d = new Date()
  d.setDate(d.getDate() + 1); d.setHours(h || 7, m || 0, 0, 0)
  return d.getTime()
}
