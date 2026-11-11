import { ArrowRight, Briefcase, History, House, MapPinned, Plus, Search, Star } from 'lucide-react'
import { nextCommute } from '../domain/commute'
import { localSummary } from '../domain/local'
import { hhmm } from '../domain/format'
import { useSettings } from '../store/settings'
import { useTrip } from '../store/trip'
import { readJson } from '../services/cache'
import { AddressCombo } from './AddressCombo'
import { Icon } from './icons'

/** Clima onde você está agora: o resumo que aparece ao abrir o app. */
export function LocalCard() {
  const local = useTrip(s => s.local), now = useTrip(s => s.now), loc = useTrip(s => s.locStatus), me = useTrip(s => s.me)
  const sum = local ? localSummary(local.wx, now) : null
  const where = me ? 'Onde você está' : loc === 'denied' || loc === 'unavailable' ? 'Perto da sua casa' : 'Procurando você…'
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
      {sum && (sum.temp != null || sum.wind != null) && (
        <div className="local-meta">
          {sum.temp != null && <span><b className="num">{Math.round(sum.temp)}°</b> agora</span>}
          {sum.wind != null && <span><b className="num">{Math.round(sum.wind)}</b> km/h de vento</span>}
        </div>
      )}
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
        <AddressCombo id="where" label="Para onde vamos?" placeholder="Para onde vamos?" value="" onPick={(ll, name) => go(ll, name || 'Ponto colado')}
          onFocusField={() => t().set({ sheet: 'full' })} />
      </div>
      <div className="shortcuts" role="list" aria-label="Atalhos">
        {s.homeSet && <button type="button" role="listitem" className="sc" onClick={() => go(s.home, 'Casa', 'home')}><House className="i" /><span>Casa</span></button>}
        {s.workSet && <button type="button" role="listitem" className="sc" onClick={() => go(s.work, 'Trabalho', 'work')}><Briefcase className="i" /><span>Trabalho</span></button>}
        {s.places.map(p => <button key={p.id} type="button" role="listitem" className="sc" onClick={() => go([p.lat, p.lon], p.name, p.id)}><Star className="i" /><span>{p.name}</span></button>)}
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
