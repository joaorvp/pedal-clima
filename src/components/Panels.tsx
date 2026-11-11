import { CloudLightning, CloudRain, MapPin, RefreshCw, SlidersHorizontal } from 'lucide-react'
import { useMemo } from 'react'
import { checklist } from '../domain/advice'
import { fmt1, hhmm } from '../domain/format'
import { CATS, cat, clearTime, evaluate } from '../domain/weather'
import { useTripView } from '../hooks/useTripView'
import { useSettings } from '../store/settings'
import { useTrip } from '../store/trip'
import { Icon } from './icons'

export function AppBar({ onSettings }: { onSettings: () => void }) {
  const loading = useTrip(s => s.loading), offline = useTrip(s => s.offline), mode = useTrip(s => s.mode)
  const wxAt = useTrip(s => s.mode === 'trip' ? s.wxAt : s.local?.at ?? 0)
  const label = loading ? (wxAt ? `previsão ${hhmm(wxAt)} · atualizando…` : 'carregando…') : offline ? `sem conexão · previsão ${hhmm(wxAt)}` : wxAt ? `previsão ${hhmm(wxAt)}` : ''
  return (
    <header className="appbar">
      <div className="in">
        <img className="logo" src={import.meta.env.BASE_URL + 'icon.svg'} alt="" width={32} height={32} />
        <p className="brand">Pedal &amp; Clima</p>
        <span className="upd" id="updated">{label}</span>
        <button className={'ibtn' + (loading ? ' spin' : '')} id="refresh" type="button" aria-label="Atualizar" onClick={() => useTrip.getState().refresh()} data-mode={mode}><RefreshCw className="i" /></button>
        <button className="ibtn" id="open-settings" type="button" aria-label="Ajustes" onClick={onSettings}><SlidersHorizontal className="i" /></button>
      </div>
    </header>
  )
}

export function Banners() {
  const error = useTrip(s => s.error), routeNote = useTrip(s => s.routeNote), alerts = useTrip(s => s.alerts)
  const loc = useTrip(s => s.locStatus), mode = useTrip(s => s.mode), now = useTrip(s => s.now)
  const a = alerts?.[0]
  const when = a ? (!isNaN(a.start) && a.start > now ? `a partir de ${hhmm(a.start)}` : !isNaN(a.end) ? `até ${new Date(a.end).toLocaleString('pt-BR', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}` : '') : ''
  return <>
    {(error || routeNote) && <div id="error" className="err">{error || routeNote}</div>}
    {a && (
      <a id="alert" className="alert" href="https://portal.inmet.gov.br/" target="_blank" rel="noopener" data-sev={a.level}>
        <span className="ic">{a.level >= 2 ? <CloudLightning className="i" /> : <CloudRain className="i" />}</span>
        <div><b>INMET: {a.title}{a.sev ? ' · ' + a.sev : ''}</b><small>Alerta oficial para o DF {when}{alerts!.length > 1 ? ` · +${alerts!.length - 1} alerta(s)` : ''}. Toque para ver.</small></div>
      </a>
    )}
    {loc === 'denied' && mode === 'explore' && (
      <div id="setup-banner" className="banner">
        <MapPin className="i" /><span>A localização está bloqueada. Libere nas permissões do navegador para o app saber onde você está.</span>
      </div>
    )}
  </>
}

export function SlotsCard() {
  const view = useTripView()
  const routes = useTrip(s => s.routes), sel = useTrip(s => s.sel), dep = useTrip(s => s.dep), now = useTrip(s => s.now)
  const speed = useSettings(s => s.speed)
  const route = routes[sel]
  const data = useMemo(() => {
    if (!route?.wx) return null
    const base = Math.ceil((now + 5 * 60e3) / 900e3) * 900e3
    const items = Array.from({ length: 13 }, (_, k) => { const t = k === 0 ? now : base + (k - 1) * 900e3; return { t, ev: evaluate(route, 'ida', t, speed) } })
    let best = items[0]
    for (const x of items) if (!x.ev.storm && (best.ev.storm || x.ev.exposure < best.ev.exposure - 0.03)) best = x
    const showBest = best !== items[0] && items[0].ev.exposure - best.ev.exposure > 0.1
    const raining = items[0].ev.exposure >= 0.15 || items[0].ev.storm
    return { items, best, showBest, clear: raining && !showBest ? clearTime(route, 'ida', now, speed) : undefined, raining }
  }, [route, now, speed])
  if (!view || !data || view.riding) return null
  const { items, best, showBest, clear, raining } = data
  const maxE = Math.max(0.6, ...items.map(x => x.ev.exposure))
  let hint = 'Altura da barra = chuva que você pegaria no trajeto. Toque para ver aquela saída.', strong = false
  if (showBest) { hint = `Saindo às ${hhmm(best.t)} você pega ~${fmt1(best.ev.exposure)} mm, contra ~${fmt1(items[0].ev.exposure)} mm saindo agora.`; strong = true }
  else if (raining) { hint = clear ? `A chuva no trajeto deve passar por volta de ${hhmm(clear)}.` : 'Sem janela seca nas próximas 6 h: vá preparado.'; strong = true }
  else if (items.every(x => x.ev.exposure < 0.05 && !x.ev.storm)) hint = 'Seco em qualquer horário das próximas 3 h.'
  return (
    <section className="card" id="slots-card">
      <h2>Melhor hora para sair <span className="aside">próximas 3 h</span></h2>
      <div className="slots" id="slots">
        {items.map((x, k) => {
          const selected = k === 0 ? dep == null : dep != null && Math.abs(dep - x.t) < 450e3
          const col = x.ev.storm ? 'var(--r4)' : `var(${CATS[cat(x.ev.exposure / (x.ev.dur / 3600e3))].color})`
          return (
            <button key={k} type="button" className="slot" aria-pressed={selected} aria-label={`${k === 0 ? 'agora' : hhmm(x.t)}: ${fmt1(x.ev.exposure)} mm no trajeto${x.ev.storm ? ', trovoada' : ''}`}
              onClick={() => useTrip.getState().set({ dep: k === 0 ? null : x.t })}>
              {showBest && x === best && <span className="best">melhor</span>}
              <span className="bar" style={{ height: 10 + 76 * Math.min(1, x.ev.exposure / maxE), background: col }} />
              <span className="lbl">{k === 0 ? 'agora' : hhmm(x.t)}</span>
            </button>
          )
        })}
      </div>
      <p className={'note' + (strong ? ' strong' : '')} id="slot-hint">{hint}</p>
    </section>
  )
}

export function Checklist() {
  const view = useTripView(), sun = useTrip(s => s.sun)
  if (!view) return null
  const items = checklist(view.ev, view.ctx, sun, view.prof ? view.battery.pct : null)
  return (
    <section className="card">
      <h2>Antes de sair</h2>
      <div className="checks" id="checklist">
        {items.map((c, i) => <div key={i} className="check" data-l={c.level}><span className="ic"><Icon name={c.icon} /></span><div><b>{c.title}</b>{c.detail && <small>{c.detail}</small>}</div></div>)}
      </div>
    </section>
  )
}

export function Footer() {
  return (
    <section className="card foot">
      <div className="links">
        <a href="https://portal.inmet.gov.br/" target="_blank" rel="noopener">Alertas INMET</a>
        <a href="https://www.redemet.aer.mil.br/?i=produtos&p=radares-meteorologicos" target="_blank" rel="noopener">Radar REDEMET</a>
        <a href="https://www.rainviewer.com/map.html" target="_blank" rel="noopener">RainViewer</a>
        <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo</a>
      </div>
      <span>A previsão vem de modelos com resolução de alguns km: boa para tendência, pode errar o bairro exato. Para os próximos 30–60 min, confie mais no radar.</span>
    </section>
  )
}
