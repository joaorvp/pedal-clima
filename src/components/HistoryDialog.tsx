import { Bike, Bookmark, ChevronDown, Download, Share2, TrendingDown, TrendingUp, X } from 'lucide-react'
import { gpxFileName, rideGpx } from '../domain/gpx'
import { downloadText } from '../services/backup'
import { useState } from 'react'
import { fmt1, hhmm } from '../domain/format'
import { periodStarts, speedTrend, totals, weekly } from '../domain/history'
import { useSettings } from '../store/settings'
import { useTrip } from '../store/trip'
import { useUndo } from '../store/undo'
import { Dialog } from './Dialog'
import { NameForm } from './SaveRoute'
import { saveAsRoute } from '../store/actions'
import type { LatLon } from '../domain/types'

const dur = (m: number) => m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`
const day = (t: number) => new Date(t).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })

/** "Seus pedais": totais da semana e do mês e a lista dos últimos pedais. */
export function HistoryDialog() {
  const open = useTrip(s => s.historyOpen), history = useSettings(s => s.history), now = useTrip(s => s.now)
  const close = () => useTrip.getState().set({ historyOpen: false })
  const [expanded, setExpanded] = useState<number | null>(null), [naming, setNaming] = useState(false), [msg, setMsg] = useState('')
  const { week, month } = periodStarts(new Date(now))
  const blocks = [{ label: 'Esta semana', t: totals(history, week) }, { label: 'Este mês', t: totals(history, month) }]
  return (
    <Dialog open={open} onClose={close} labelledBy="history-title">
      <div className="dlg-head">
        <h2 id="history-title">Seus pedais</h2>
        <button className="ibtn" type="button" aria-label="Fechar" style={{ marginLeft: 'auto' }} onClick={close}><X className="i" /></button>
      </div>
      <div className="dlg-body">
        {!history.length ? (
          <div className="hist-empty"><Bike className="i" /><p>Seus pedais aparecem aqui quando você chegar com o <b>Iniciar pedal</b> ligado.</p></div>
        ) : <>
          <div className="hist-totals">
            {blocks.map(b => (
              <div key={b.label} className="hist-box">
                <span className="lb">{b.label}</span>
                <b className="num">{fmt1(b.t.km)} km</b>
                <small>{b.t.rides} {b.t.rides === 1 ? 'pedal' : 'pedais'} · {dur(b.t.mins)}</small>
                <small>{b.t.dry} {b.t.dry === 1 ? 'seco' : 'secos'}</small>
              </div>
            ))}
          </div>
          <Weeks />
          {msg && <p className="note ok-text" id="hist-msg" style={{ margin: 0 }}>{msg}</p>}
          {history.some(h => h.track) && <p className="note" style={{ margin: 0 }}>Toque num pedal para ver o caminho que você fez e usá-lo como sua rota.</p>}
          <ul className="hist-list">
            {history.slice(0, 40).map(h => {
              const row = <>
                <span className="when"><b>{day(h.at)}</b><small className="num">{hhmm(h.at)}</small></span>
                <span className="txt"><b>{h.dest}</b><small>{fmt1(h.km)} km · {h.mins} min{h.avg > 0 && h.avg < 70 ? ` · ${Math.round(h.avg)} km/h` : ''}</small></span>
                <span className={'rain' + (h.rain >= 0.1 ? ' wet' : '')}>{h.rain >= 0.1 ? fmt1(h.rain) + ' mm' : 'seco'}{h.track && <ChevronDown className="i chev" aria-hidden="true" />}</span>
              </>
              return (
                <li key={h.at} className={expanded === h.at ? 'open' : ''}>
                  {h.track
                    ? <button type="button" className="hist-row" aria-expanded={expanded === h.at} onClick={() => { setExpanded(expanded === h.at ? null : h.at); setNaming(false) }}>{row}</button>
                    : <div className="hist-row">{row}</div>}
                  {expanded === h.at && h.track && (
                    <div className="hist-detail">
                      <TrackPreview line={h.track} />
                      {naming
                        ? <NameForm initial={'Meu caminho para ' + h.dest} label="Nome da rota" onCancel={() => setNaming(false)}
                            onSave={name => { saveAsRoute(name, h.track!); setNaming(false); setExpanded(null); setMsg(`"${name.trim() || 'Minha rota'}" salva. Ela aparece primeiro quando você fizer esse trajeto (nos dois sentidos).`) }} />
                        : <div className="hist-actions">
                            <button className="btn primary" type="button" id="hist-use" onClick={() => setNaming(true)}><Bookmark className="i" />Usar como minha rota</button>
                            <button className="btn" type="button" id="hist-gpx" onClick={() => downloadText(gpxFileName(h.at, h.dest), rideGpx({ track: h.track!, at: h.at, mins: h.mins, dest: h.dest }), 'application/gpx+xml')}><Download className="i" />Exportar GPX (Strava)</button>
                          </div>}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
          <button className="btn" type="button" id="hist-clear" onClick={() => {
            const prev = useSettings.getState().history
            useSettings.getState().patch({ history: [] })
            useUndo.getState().show('Histórico apagado', () => useSettings.getState().patch({ history: prev }))
          }}>Apagar histórico</button>
        </>}
      </div>
      <div className="dlg-foot"><button className="btn primary" type="button" onClick={close}>Pronto</button></div>
    </Dialog>
  )
}

const ddmm = (t: number) => new Date(t).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
const kmh = (v: number) => String(Math.round(v * 10) / 10).replace('.', ',')

/** Últimas 8 semanas em barras (km), média da semana comparada com as anteriores e resumo para compartilhar. */
function Weeks() {
  const history = useSettings(s => s.history), now = useTrip(s => s.now)
  const weeks = weekly(history, new Date(now), 8), cur = weeks.length - 1
  const [pick, setPick] = useState(cur), [msg, setMsg] = useState('')
  const w = weeks[Math.min(pick, cur)], max = Math.max(1, ...weeks.map(x => x.km))
  const trend = speedTrend(history, new Date(now))
  const thisWeek = weeks[cur]
  const text = `Minha semana no Pedágua: ${fmt1(thisWeek.km)} km em ${thisWeek.rides} ${thisWeek.rides === 1 ? 'pedal' : 'pedais'}` +
    (thisWeek.rides ? `, ${thisWeek.rides - thisWeek.wet} sem chuva` : '') + (trend.cur ? `, média de ${kmh(trend.cur)} km/h` : '') + '. Pedágua · pedal com previsão'
  async function share() {
    try { if (navigator.share) { await navigator.share({ title: 'Pedágua', text }); return } } catch { return }
    try { await navigator.clipboard.writeText(text); setMsg('Resumo copiado.') } catch { setMsg(text) }
  }
  return (
    <div className="weeks">
      <div className="weeks-head">
        <span className="lb">Últimas 8 semanas</span>
        <span className="weeks-sel num">{pick === cur ? 'Esta semana' : 'Semana de ' + ddmm(w.start)}: <b>{fmt1(w.km)} km</b> · {w.rides} {w.rides === 1 ? 'pedal' : 'pedais'}{w.wet ? ` · ${w.wet} com chuva` : ''}</span>
      </div>
      <div className="weeks-bars" role="group" aria-label="Quilômetros por semana">
        {weeks.map((x, i) => (
          <button key={x.start} type="button" className="wbar" aria-pressed={i === pick} data-cur={i === cur ? '1' : undefined}
            aria-label={`Semana de ${ddmm(x.start)}: ${fmt1(x.km)} km, ${x.rides} ${x.rides === 1 ? 'pedal' : 'pedais'}`} onClick={() => setPick(i)}>
            {(i === cur || (x.km === max && x.km > 0)) && <span className="wv num">{Math.round(x.km)}</span>}
            <i style={{ height: x.km > 0 ? Math.max(4, x.km / max * 100) + '%' : '2px' }} />
          </button>
        ))}
      </div>
      <div className="weeks-axis num"><span>{ddmm(weeks[0].start)}</span><span>esta semana</span></div>
      {trend.cur != null && (
        <p className="weeks-trend">
          {trend.diff != null && Math.abs(trend.diff) >= 0.3 ? (trend.diff > 0 ? <TrendingUp className="i" /> : <TrendingDown className="i" />) : null}
          Média de porta a porta nesta semana: <b>{kmh(trend.cur)} km/h</b>
          {trend.diff != null && Math.abs(trend.diff) >= 0.3 ? ` (${trend.diff > 0 ? '+' : '−'}${kmh(Math.abs(trend.diff))} em relação às 4 semanas anteriores)` : trend.diff != null ? ' (igual às semanas anteriores)' : ''}
        </p>
      )}
      <button className="btn" type="button" id="share-week" onClick={share}><Share2 className="i" />Compartilhar a semana</button>
      {msg && <p className="note" style={{ margin: 0 }}>{msg}</p>}
    </div>
  )
}

/** Desenho do caminho do pedal (sem mapa por baixo): início em azul, chegada em laranja. */
function TrackPreview({ line }: { line: LatLon[] }) {
  const W = 300, H = 150, pad = 12
  const lats = line.map(p => p[0]), lons = line.map(p => p[1]), k0 = Math.cos(lats[0] * Math.PI / 180)
  const minLa = Math.min(...lats), maxLa = Math.max(...lats), minLo = Math.min(...lons), maxLo = Math.max(...lons)
  const k = Math.min((W - 2 * pad) / Math.max(1e-6, (maxLo - minLo) * k0), (H - 2 * pad) / Math.max(1e-6, maxLa - minLa))
  const ox = (W - (maxLo - minLo) * k0 * k) / 2, oy = (H - (maxLa - minLa) * k) / 2
  const P = (p: LatLon) => [ox + (p[1] - minLo) * k0 * k, oy + (maxLa - p[0]) * k] as const
  const d = line.map((p, i) => (i ? 'L' : 'M') + P(p).map(v => v.toFixed(1)).join(' ')).join('')
  const [sx, sy] = P(line[0]), [ex, ey] = P(line[line.length - 1])
  return (
    <svg className="track-preview" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Desenho do caminho que você fez">
      <path d={d} fill="none" stroke="var(--line)" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} fill="none" stroke="var(--link)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={sx} cy={sy} r="6" fill="var(--surface)" stroke="var(--link)" strokeWidth="3" />
      <circle cx={ex} cy={ey} r="6.5" fill="#e2662a" stroke="var(--surface)" strokeWidth="2.5" />
    </svg>
  )
}
