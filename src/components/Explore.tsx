import { ArrowRight, Bell, BellRing, Briefcase, Clock, History, House, LocateFixed, MapPinned, Navigation, Plus, Search } from 'lucide-react'
import { discardRide, pendingRide, resumeRide, startLocation } from '../hooks/location'
import { nextCommute } from '../domain/commute'
import { localSummary } from '../domain/local'
import { airLabel, comfortAlerts } from '../domain/air'
import { hourlyAt } from '../domain/weather'
import { fmt1, hhmm } from '../domain/format'
import { useSettings } from '../store/settings'
import { useTrip } from '../store/trip'
import { readJson } from '../services/cache'
import { useState } from 'react'
import { AddressCombo } from './AddressCombo'
import { KindIcon } from './KindIcon'
import { guessKind, kindOf } from '../domain/placeKinds'
import { Icon } from './icons'

/** Clima onde você está agora: o resumo que aparece ao abrir o app. */
export function LocalCard() {
  const local = useTrip(s => s.local), now = useTrip(s => s.now), loc = useTrip(s => s.locStatus), me = useTrip(s => s.me), watch = useTrip(s => s.watchClear)
  const sum = local ? localSummary(local.wx, now) : null
  const air = useTrip(s => s.air)
  const humidity = local ? hourlyAt(local.wx, now, 'relative_humidity_2m') : null
  const comfort = local ? comfortAlerts({ feels: hourlyAt(local.wx, now, 'apparent_temperature'), humidity, aqi: air?.aqi ?? null }) : []
  const homeSet = useSettings(s => s.homeSet)
  const where = me ? 'Onde você está' : loc === 'asking' ? 'Procurando você…' : homeSet ? 'Perto da sua casa' : 'Na região do mapa'
  return (
    <section className={'card hero local' + (sum ? '' : ' loading')} id="hero" data-level={sum?.level ?? 'ok'} aria-live="polite">
      <div className="local-where"><span>{where}</span>{local && <span className="num">{hhmm(local.at)}</span>}</div>
      <div className="hero-main">
        <div className="wx" id="wx-icon" data-icon={sum?.icon}>{sum && <Icon name={sum.icon} />}</div>
        <div>
          <h1 id="v-title">{sum?.title ?? 'Olhando o céu…'}</h1>
          <p className="sub" id="v-sub">{sum?.sub ?? 'Buscando a previsão para onde você está.'}</p>
        </div>
      </div>
      {sum?.raining && (
        <button className={'btn watch' + (watch ? ' on' : '')} type="button" id="watch-clear" aria-pressed={watch} onClick={() => useTrip.getState().set({ watchClear: !watch })}>
          {watch ? <BellRing className="i" /> : <Bell className="i" />}{watch ? 'Vou avisar quando parar · deixe o app aberto' : 'Me avise quando parar'}
        </button>
      )}
      {sum && (sum.temp != null || sum.wind != null) && (
        <div className="local-meta">
          {sum.temp != null && <span><b className="num">{Math.round(sum.temp)}°</b> agora</span>}
          {sum.wind != null && <span><b className="num">{Math.round(sum.wind)}</b> km/h de vento</span>}
          {humidity != null && <span><b className="num">{Math.round(humidity)}%</b> umidade</span>}
          {air && <span>ar <b>{airLabel(air.aqi).word}</b></span>}
        </div>
      )}
      {comfort.length > 0 && <ul className="comfort">{comfort.map(c => <li key={c.icon} data-l={c.level}><Icon name={c.icon} />{c.title}</li>)}</ul>}
    </section>
  )
}

/** "Para onde vamos?": busca, lugares salvos e o último trajeto. */
export function WhereTo({ onAddPlace }: { onAddPlace: () => void }) {
  const s = useSettings(), t = useTrip.getState, now = useTrip(st => st.now)
  const last = readJson<{ dest?: { name?: string }; wxAt: number }>('pedalclima.last')
  const hasLast = !!last?.dest && now - last.wxAt < 20 * 3600e3
  const go = (ll: [number, number], name: string, key?: string) => t().startTrip({ kind: 'place', ll, name, key })
  return (
    <section className="card whereto">
      <div className="search">
        <Search className="i" aria-hidden="true" />
        <AddressCombo id="where" saveStar label="Para onde vamos?" placeholder="Para onde vamos?" value="" onPick={(ll, name) => go(ll, name || 'Ponto colado')}
          onFocusField={() => t().set({ sheet: 'full' })} />
      </div>
      <div className="shortcuts" role="list" aria-label="Atalhos">
        {s.homeSet && <button type="button" role="listitem" className="sc" onClick={() => go(s.home, 'Casa', 'home')}><House className="i" /><span>Casa</span></button>}
        {s.workSet && <button type="button" role="listitem" className="sc" onClick={() => go(s.work, 'Trabalho', 'work')}><Briefcase className="i" /><span>Trabalho</span></button>}
        {s.places.map(p => <button key={p.id} type="button" role="listitem" className="sc" onClick={() => go([p.lat, p.lon], p.name, p.id)} style={{ '--kc': kindOf(p.kind ?? guessKind(p.name)).color } as React.CSSProperties} data-kind="1"><KindIcon kind={p.kind ?? guessKind(p.name)} /><span>{p.name}</span></button>)}
        {s.recent.map(r => <button key={r.t} type="button" role="listitem" className="sc recent" onClick={() => go([r.lat, r.lon], r.name)}><Clock className="i" /><span>{r.name.split(',')[0]}</span></button>)}
        {hasLast && <button type="button" role="listitem" className="sc" onClick={() => t().loadSnapshot()}><History className="i" /><span>Último: {last!.dest!.name}</span></button>}
        <button type="button" role="listitem" className="sc" onClick={() => t().set({ pickMode: 'dest', sheet: 'peek' })}><MapPinned className="i" /><span>Escolher no mapa</span></button>
        <button type="button" role="listitem" className="sc add" onClick={onAddPlace}><Plus className="i" /><span>{s.homeSet && s.workSet ? 'Lugar' : !s.homeSet ? 'Casa' : 'Trabalho'}</span></button>
      </div>
    </section>
  )
}

/** Perto dos horários da rotina: "Indo para o Trabalho?" monta o trajeto já com o horário da saída. */
export function RoutineCard() {
  const s = useSettings(), now = useTrip(st => st.now)
  const n = nextCommute(s.tIda, s.tVolta, new Date(now))
  if (!n || n.diff > 90 || n.diff < -20) return null
  const toWork = n.d === 'ida'
  if (toWork ? !s.workSet : !s.homeSet) return null
  const depAt = now + Math.max(0, n.diff) * 60e3
  const when = n.diff > 2 ? `em ${n.diff} min` : n.diff >= -2 ? 'agora' : `era há ${-n.diff} min`
  const go = () => {
    const t = useTrip.getState()
    t.startTrip(toWork ? { kind: 'place', ll: s.work, name: 'Trabalho', key: 'work' } : { kind: 'place', ll: s.home, name: 'Casa', key: 'home' })
    if (n.diff > 2) t.set({ dep: depAt - (depAt % 60e3) })
  }
  return (
    <button type="button" className="card routine" onClick={go}>
      {toWork ? <Briefcase className="i" /> : <House className="i" />}
      <span className="txt"><b>{toWork ? 'Indo para o Trabalho?' : 'Voltando para casa?'}</b>
        <small>Saída às {toWork ? s.tIda : s.tVolta} · {when}. Toque para ver a chuva no caminho.</small></span>
      <ArrowRight className="i go" />
    </button>
  )
}

/** Antes do pedido do navegador: por que o app quer a sua localização. */
export function LocationAsk() {
  const loc = useTrip(s => s.locStatus), allowed = useSettings(s => s.locAllowed)
  const [later, setLater] = useState(false)
  if (loc !== 'idle' || allowed || later) return null
  return (
    <section className="card locask" aria-labelledby="locask-title">
      <span className="ic"><LocateFixed className="i" /></span>
      <div>
        <b id="locask-title">Mostrar onde você está?</b>
        <p>O Pedágua usa a localização para mostrar a chuva ao seu redor e acompanhar o pedal. Ela fica só no seu aparelho.</p>
        <div className="row">
          <button className="btn primary" type="button" id="loc-allow" onClick={() => { useSettings.getState().patch({ locAllowed: true }); startLocation() }}>Permitir localização</button>
          <button className="btn" type="button" onClick={() => setLater(true)}>Agora não</button>
        </div>
      </div>
    </section>
  )
}

/** O app fechou no meio de um pedal: oferece continuar de onde parou (com tempo, distância e chuva acumulados). */
export function ResumeRide() {
  const [snap, setSnap] = useState(() => pendingRide())
  const [busy, setBusy] = useState(false), [err, setErr] = useState('')
  const riding = useTrip(s => !!s.ride), now = useTrip(s => s.now)
  if (!snap || riding) return null
  const mins = Math.max(1, Math.round((now - snap.savedAt) / 60e3))
  const km = snap.dist >= 0.1 ? `, ${fmt1(snap.dist)} km rodados` : ''
  return (
    <section className="card locask resume" aria-labelledby="resume-title">
      <span className="ic"><Navigation className="i" /></span>
      <div>
        <b id="resume-title">Continuar o pedal até {snap.dest.name}?</b>
        <p>O app fechou no meio do caminho há {mins} min{km}. Continue de onde parou: o tempo e a distância seguem contando.</p>
        {err && <p className="err-text">{err}</p>}
        <div className="row">
          <button className="btn primary" type="button" id="resume-go" disabled={busy}
            onClick={async () => { setBusy(true); setErr(''); const e = await resumeRide(snap); setBusy(false); if (e) setErr(e); else setSnap(null) }}>
            <Navigation className="i" />{busy ? 'Recalculando a rota…' : 'Continuar pedal'}</button>
          <button className="btn" type="button" id="resume-drop" disabled={busy} onClick={() => { discardRide(); setSnap(null) }}>Descartar</button>
        </div>
      </div>
    </section>
  )
}
