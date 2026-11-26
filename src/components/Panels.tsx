import { ChevronLeft, ChevronRight, CloudLightning, CloudRain, HardDriveDownload, MapPin, Wrench } from 'lucide-react'
import { downloadText, makeBackup } from '../services/backup'
import { ChainringIcon, PlacePinIcon, SpeedoIcon, WheelIcon } from './bikeIcons'
import { maintenance } from '../domain/maintenance'
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { checklist } from '../domain/advice'
import { ddmm, fmt1, hhmm } from '../domain/format'
import { CURRENT_APP_VERSION } from '../domain/changelog'
import { CATS, cat, clearTime, evaluate } from '../domain/weather'
import { useTripView } from '../hooks/useTripView'
import { baseSpeed, useSettings } from '../store/settings'
import { useTrip } from '../store/trip'
import { onStorageFull, storageFull } from '../services/cache'
import { Icon } from './icons'

export function AppBar({ onSettings }: { onSettings: () => void }) {
  const busy = useTrip(s => s.loading || s.localLoading), offline = useTrip(s => s.offline), mode = useTrip(s => s.mode)
  const wxAt = useTrip(s => s.mode === 'trip' ? s.wxAt : s.local?.at ?? 0)
  // a rodinha gira enquanto atualiza (pelo menos ~0,8 s, para dar para ver) e depois mostra "atualizado agora"
  const [held, setHeld] = useState(false), [done, setDone] = useState(false), started = useRef(0)
  useEffect(() => {
    if (busy || !held) return
    const t = setTimeout(() => { setHeld(false); setDone(true) }, Math.max(0, 800 - (Date.now() - started.current)))
    return () => clearTimeout(t)
  }, [busy, held])
  useEffect(() => { if (!done) return; const t = setTimeout(() => setDone(false), 3000); return () => clearTimeout(t) }, [done])
  const spinning = busy || held
  // data e hora da previsão (dd/mm hh:mm): mostra na hora se o app está com dados de hoje; em tela estreita sai a palavra "previsão"
  const when = wxAt ? <><span className="upd-w">previsão </span>{ddmm(wxAt)} {hhmm(wxAt)}</> : null
  const label = spinning ? (wxAt ? 'atualizando…' : 'carregando…') : offline ? <>sem conexão · {when}</> : done && !offline ? 'atualizado agora' : when ?? ''
  return (
    <header className="appbar">
      <div className="in">
        <img className="logo" src={import.meta.env.BASE_URL + 'icon.svg'} alt="" width={32} height={32} />
        <p className="brand">Pedágua</p>
        <span className="upd" id="updated" role="status" aria-live="polite" data-done={done ? '1' : undefined}>{label}</span>
        <button className={'ibtn' + (spinning ? ' spin' : '')} id="refresh" type="button" aria-label="Atualizar previsão e radar" aria-keyshortcuts="R" aria-busy={spinning} disabled={spinning}
          onClick={() => { started.current = Date.now(); setHeld(true); setDone(false); useTrip.getState().refresh() }} data-mode={mode}><WheelIcon /></button>
        <button className="ibtn" id="open-places" type="button" aria-label="Meus lugares: salvos por tipo" onClick={() => useTrip.getState().set({ placesOpen: {} })}><PlacePinIcon /></button>
        <button className="ibtn" id="open-history" type="button" aria-label="Seus pedais: histórico, conquistas e manutenção" onClick={() => useTrip.getState().set({ historyOpen: true })}><SpeedoIcon /></button>
        <button className="ibtn" id="open-settings" type="button" aria-label="Ajustes: casa, trabalho, rotina e aparência" onClick={onSettings}><ChainringIcon /></button>
      </div>
    </header>
  )
}

/** alertas mostrados por inteiro nesta abertura do app (na próxima, ficam numa linha só) */
const fullThisSession = new Set<string>()
const alertKey = (a: { title: string; start: number }) => a.title + '|' + a.start

export function Banners() {
  const error = useTrip(s => s.error), routeNote = useTrip(s => s.routeNote), alerts = useTrip(s => s.alerts)
  const loc = useTrip(s => s.locStatus), mode = useTrip(s => s.mode), now = useTrip(s => s.now)
  const riding = useTrip(s => !!s.ride?.pos)
  const noSpace = useSyncExternalStore(onStorageFull, storageFull)
  const seen = useSettings(s => s.seenAlerts)
  const a = alerts?.[0]
  const key = a ? alertKey(a) : ''
  // primeira vez que o alerta aparece: mostra por inteiro nesta abertura e anota como visto
  if (key && !seen.includes(key)) fullThisSession.add(key)
  useEffect(() => {
    if (key && !useSettings.getState().seenAlerts.includes(key)) useSettings.getState().patch({ seenAlerts: [key, ...useSettings.getState().seenAlerts].slice(0, 20) })
  }, [key])
  const full = !!key && fullThisSession.has(key) && !riding
  const when = a ? (!isNaN(a.start) && a.start > now ? `a partir de ${hhmm(a.start)}` : !isNaN(a.end) ? `até ${new Date(a.end).toLocaleString('pt-BR', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}` : '') : ''
  return <>
    {(error || routeNote) && <div id="error" className="err">{error || routeNote}</div>}
    {noSpace && <div id="storage-full" className="err" role="alert">O espaço do navegador para o app acabou e as últimas mudanças podem não ter sido salvas. Exporte um backup em Ajustes → Seus dados e apague pedais antigos em Seus pedais.</div>}
    {a && (
      <a id="alert" className={'alert' + (full ? '' : ' compact')} href="https://portal.inmet.gov.br/" target="_blank" rel="noopener" data-sev={a.level}
        aria-label={`Alerta do INMET: ${a.title}${a.sev ? ', ' + a.sev : ''} ${when}. Abrir no site do INMET.`}>
        <span className="ic">{a.level >= 2 ? <CloudLightning className="i" /> : <CloudRain className="i" />}</span>
        {full
          ? <div><b>INMET: {a.title}{a.sev ? ' · ' + a.sev : ''}</b><small>Alerta oficial para o DF {when}{alerts!.length > 1 ? ` · +${alerts!.length - 1} alerta(s)` : ''}. Toque para ver.</small></div>
          : <div className="one"><b>INMET: {a.title}{a.sev ? ' · ' + a.sev : ''}</b>{!riding && when && <small>{when.replace('a partir de', 'às')}{alerts!.length > 1 ? ` · +${alerts!.length - 1}` : ''}</small>}</div>}
      </a>
    )}
    {mode === 'explore' && <MaintBanner />}
    {mode === 'explore' && <BackupBanner />}
    {loc === 'denied' && mode === 'explore' && (
      <div id="setup-banner" className="banner">
        <MapPin className="i" /><span>A localização está bloqueada. Libere nas permissões do navegador para o app saber onde você está.</span>
      </div>
    )}
  </>
}

const SLOT_COUNT = 49 // agora + 48 de 15 em 15 min = 12 h

export function SlotsCard() {
  const view = useTripView()
  const routes = useTrip(s => s.routes), sel = useTrip(s => s.sel), dep = useTrip(s => s.dep), now = useTrip(s => s.now)
  const speed = useSettings(baseSpeed)
  const route = routes[sel]
  const data = useMemo(() => {
    if (!route?.wx) return null
    const base = Math.ceil((now + 5 * 60e3) / 900e3) * 900e3
    // 12 h à frente, de 15 em 15 min (a previsão cobre 36 h); a "melhor" saída é procurada nas próximas 3 h
    const items = Array.from({ length: SLOT_COUNT }, (_, k) => { const t = k === 0 ? now : base + (k - 1) * 900e3; return { t, ev: evaluate(route, 'ida', t, speed) } })
    let best = items[0]
    for (const x of items.slice(0, 13)) if (!x.ev.storm && (best.ev.storm || x.ev.exposure < best.ev.exposure - 0.03)) best = x
    const showBest = best !== items[0] && items[0].ev.exposure - best.ev.exposure > 0.1
    const raining = items[0].ev.exposure >= 0.15 || items[0].ev.storm
    return { items, best, showBest, clear: raining && !showBest ? clearTime(route, 'ida', now, speed) : undefined, raining }
  }, [route, now, speed])
  if (!view || !data || view.riding) return null
  const { items, best, showBest, clear, raining } = data
  const maxE = Math.max(0.6, ...items.map(x => x.ev.exposure))
  const scroll = (dir: number) => { const el = document.getElementById('slots'); el?.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' }) }
  let hint = 'Altura da barra = chuva que você pegaria no trajeto. Toque para ver aquela saída.', strong = false
  if (showBest) { hint = `Saindo às ${hhmm(best.t)} você pega ~${fmt1(best.ev.exposure)} mm, contra ~${fmt1(items[0].ev.exposure)} mm saindo agora.`; strong = true }
  else if (raining) { hint = clear ? `A chuva no trajeto deve passar por volta de ${hhmm(clear)}.` : 'Sem janela seca nas próximas 6 h: vá preparado.'; strong = true }
  else if (items.slice(0, 13).every(x => x.ev.exposure < 0.05 && !x.ev.storm)) hint = 'Seco em qualquer horário das próximas 3 h. Arraste para ver até 12 h.'
  return (
    <section className="card" id="slots-card">
      <h2>Melhor hora para sair <span className="aside slots-nav">
        <button className="ibtn sm" type="button" id="slots-prev" aria-label="Horários anteriores" onClick={() => scroll(-1)}><ChevronLeft className="i" /></button>
        <span>próximas 12 h</span>
        <button className="ibtn sm" type="button" id="slots-next" aria-label="Horários seguintes" onClick={() => scroll(1)}><ChevronRight className="i" /></button>
      </span></h2>
      <div className="slots" id="slots">
        {items.map((x, k) => {
          const selected = k === 0 ? dep == null : dep != null && Math.abs(dep - x.t) < 450e3
          const col = x.ev.storm ? 'var(--r4)' : `var(${CATS[cat(x.ev.exposure / (x.ev.dur / 3600e3))].color})`
          return (
            <button key={k} type="button" className="slot" aria-pressed={selected} aria-label={`${k === 0 ? 'agora' : hhmm(x.t)}: ${fmt1(x.ev.exposure)} mm no trajeto${x.ev.storm ? ', trovoada' : ''}`}
              onClick={() => useTrip.getState().set({ dep: k === 0 ? null : x.t })}>
              {showBest && x === best && <span className="best">melhor</span>}
              <span className="bar" style={{ height: 10 + 76 * Math.min(1, x.ev.exposure / maxE), background: col }} />
              <span className={'lbl' + (k === 0 || new Date(x.t).getMinutes() % 30 === 0 ? '' : ' minor')}>{k === 0 ? 'agora' : new Date(x.t).getHours() === 0 && new Date(x.t).getMinutes() === 0 ? 'amanhã' : hhmm(x.t)}</span>
            </button>
          )
        })}
      </div>
      <p className={'note' + (strong ? ' strong' : '')} id="slot-hint">{hint}</p>
    </section>
  )
}

export function Checklist() {
  const view = useTripView(), sun = useTrip(s => s.sun), air = useTrip(s => s.air)
  if (!view) return null
  const items = checklist(view.ev, view.ctx, sun, view.prof ? view.battery.pct : null, air?.aqi ?? null)
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
        <a href="#sobre" id="open-about" onClick={e => { e.preventDefault(); useTrip.getState().set({ landing: true }) }}>Sobre, termos e privacidade</a>
      </div>
      <span>A previsão vem de modelos com resolução de alguns km: boa para tendência, pode errar o bairro exato. Para os próximos 30–60 min, confie mais no radar.</span>
      <span className="app-ver" id="app-version">Pedágua {CURRENT_APP_VERSION} · publicado em {new Date(__BUILD_DATE__).toLocaleDateString('pt-BR')}</span>
    </section>
  )
}

/**
 * Lembrete de backup (uma vez por mês): os dados ficam só neste aparelho; perder o celular ou limpar o navegador apaga tudo.
 * Aparece só para quem já tem o que perder; "Depois" adia por 7 dias.
 */
const backupDue = (s: { history: unknown[]; places: unknown[]; savedRoutes: unknown[]; lastBackup?: number; backupSnooze?: number }, now: number) =>
  (s.history.length >= 3 || s.places.length >= 2 || s.savedRoutes.length >= 1) && (!s.lastBackup || now - s.lastBackup > 30 * 86400e3) && !(s.backupSnooze && now < s.backupSnooze)
function BackupBanner() {
  const s = useSettings(), now = useTrip(st => st.now)
  if (!backupDue(s, now)) return null
  const days = s.lastBackup ? Math.floor((now - s.lastBackup) / 86400e3) : null
  return (
    <div className="banner backup-banner" id="backup-banner" role="status">
      <HardDriveDownload className="i" />
      <span>Seus dados ficam só neste celular. {days == null ? 'Você ainda não fez um backup.' : `Último backup há ${days} dias.`}</span>
      <div className="bb-act">
        <button className="btn" type="button" id="backup-later" onClick={() => s.patch({ backupSnooze: Date.now() + 7 * 86400e3 })}>Depois</button>
        <button className="btn primary" type="button" id="backup-now" onClick={() => { const { name, text } = makeBackup(useSettings.getState()); downloadText(name, text); s.patch({ lastBackup: Date.now() }) }}>Fazer backup</button>
      </div>
    </div>
  )
}

/** Na tela inicial: lembrete de manutenção vencida (some ao tocar em Feito, em Seus pedais). */
function MaintBanner() {
  const odo = useSettings(s => s.odo ?? 0), maint = useSettings(s => s.maint ?? {}), now = useTrip(s => s.now)
  const due = maintenance(odo, maint, now).find(i => i.due)
  if (!due) return null
  return (
    <button type="button" id="maint-banner" className="banner maint-banner" onClick={() => useTrip.getState().set({ historyOpen: true })}>
      <Wrench className="i" /><span><b>{due.title}</b> · {due.detail}</span><span className="linkbtn">Ver</span>
    </button>
  )
}
