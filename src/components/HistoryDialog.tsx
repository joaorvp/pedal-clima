import { Bike, X } from 'lucide-react'
import { fmt1, hhmm } from '../domain/format'
import { periodStarts, totals } from '../domain/history'
import { useSettings } from '../store/settings'
import { useTrip } from '../store/trip'
import { useUndo } from '../store/undo'
import { Dialog } from './Dialog'

const dur = (m: number) => m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`
const day = (t: number) => new Date(t).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })

/** "Seus pedais": totais da semana e do mês e a lista dos últimos pedais. */
export function HistoryDialog() {
  const open = useTrip(s => s.historyOpen), history = useSettings(s => s.history), now = useTrip(s => s.now)
  const close = () => useTrip.getState().set({ historyOpen: false })
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
          <ul className="hist-list">
            {history.slice(0, 40).map(h => (
              <li key={h.at}>
                <span className="when"><b>{day(h.at)}</b><small className="num">{hhmm(h.at)}</small></span>
                <span className="txt"><b>{h.dest}</b><small>{fmt1(h.km)} km · {h.mins} min{h.avg > 0 && h.avg < 70 ? ` · ${Math.round(h.avg)} km/h` : ''}</small></span>
                <span className={'rain' + (h.rain >= 0.1 ? ' wet' : '')}>{h.rain >= 0.1 ? fmt1(h.rain) + ' mm' : 'seco'}</span>
              </li>
            ))}
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
