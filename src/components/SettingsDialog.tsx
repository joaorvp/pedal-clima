import { ChevronDown, ChevronUp, Crosshair, Download, ImagePlus, Trash2, Upload, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { accuracyText } from '../domain/calibration'
import { STOP_FACTOR, useSettings, type PointKey } from '../store/settings'
import { useTrip } from '../store/trip'
import { setPointFromMap } from '../store/actions'
import { downloadText, makeBackup, readBackup } from '../services/backup'
import { useUndo } from '../store/undo'
import type { Settings } from '../store/settings'
import { learnedSpeed } from '../domain/speed'
import { AddressCombo } from './AddressCombo'
import { Dialog } from './Dialog'
import { ImportRoute } from './ImportRoute'

const PLACE_DEF: { k: PointKey; label: string; caption: string; ph: string; color: string; letter: string }[] = [
  { k: 'home', label: 'Casa', caption: 'Casa', ph: 'Endereço de casa', color: '#1b2b4b', letter: 'C' },
  { k: 'work', label: 'Trabalho', caption: 'Trabalho', ph: 'Endereço do trabalho', color: '#e2662a', letter: 'T' },
]
export function SettingsDialog({ open, onClose, focus }: { open: boolean; onClose: () => void; focus?: string }) {
  const s = useSettings()
  const [plName, setPlName] = useState('')
  const [gpsMsg, setGpsMsg] = useState('')
  const [importing, setImporting] = useState(false), [importMsg, setImportMsg] = useState('')
  const learned = learnedSpeed(s.history)
  const pick = (k: PointKey) => { onClose(); useTrip.getState().set({ pickMode: k, sheet: 'peek' }) }

  return (
    <Dialog open={open} onClose={onClose} labelledBy="settings-title">
      <div className="dlg-head">
        <h2 id="settings-title">Ajustes</h2>
        <button className="ibtn" type="button" id="close-settings" aria-label="Fechar" style={{ marginLeft: 'auto' }} onClick={onClose}><X className="i" /></button>
      </div>
      <div className="dlg-body">
        <div className="sec">
          <h3>Seus lugares</h3>
          <div className="places" id="places">
            {PLACE_DEF.map(p => (
              <div className="place" key={p.k}>
                <span className="tag" style={{ background: p.color }} aria-hidden="true">{p.letter}</span>
                <AddressCombo id={'addr-' + p.k} caption={p.caption} label={p.label} placeholder={p.ph} value={s[p.k] ? s.names[p.k] || 'Ponto marcado no mapa' : ''}
                  onPick={(pt, name) => { if (name) s.setPoint(p.k, pt, name); else setPointFromMap(p.k, pt) }} />
                <button className="mapbtn" type="button" aria-label={`Marcar ${p.label.toLowerCase()} no mapa`} onClick={() => pick(p.k)}><Crosshair /></button>
              </div>
            ))}
          </div>
          <div className="row" style={{ marginTop: 10 }}>
            <button className="btn" type="button" id="gps" onClick={() => navigator.geolocation?.getCurrentPosition(
              pos => { onClose(); setPointFromMap('home', [pos.coords.latitude, pos.coords.longitude]) }, () => setGpsMsg('Não consegui sua localização. Permita o acesso no navegador.'))}>Estou em casa agora</button>
            {gpsMsg && <span className="note" style={{ margin: 0 }}>{gpsMsg}</span>}
          </div>
          <p className="note">Digite um endereço, um lugar ou cole um link do Google Maps. Se não achar, toque no ícone de alvo e marque no mapa. Tudo fica salvo só neste aparelho.</p>
        </div>

        <div className="sec" id="sec-places" ref={el => { if (el && focus === 'places') el.scrollIntoView({ block: 'start' }) }}>
          <h3>Lugares salvos</h3>
          <div className="plist" id="plist">
            {s.places.map((p, i) => (
              <div className="prow" key={p.id}>
                <div className="pname"><input aria-label={'Nome de ' + p.name} defaultValue={p.name} maxLength={30} onBlur={e => s.renamePlace(p.id, e.target.value)} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }} /><small>{p.addr || 'Ponto marcado'}</small></div>
                <div className="pact">
                  <button className="ibtn sm" type="button" aria-label={'Subir ' + p.name} disabled={i === 0} onClick={() => s.shiftPlace(p.id, -1)}><ChevronUp className="i" /></button>
                  <button className="ibtn sm" type="button" aria-label={'Descer ' + p.name} disabled={i === s.places.length - 1} onClick={() => s.shiftPlace(p.id, 1)}><ChevronDown className="i" /></button>
                  <button className="ibtn sm" type="button" aria-label={'Remover ' + p.name} onClick={() => s.removePlace(p.id)}><Trash2 className="i" /></button>
                </div>
              </div>
            ))}
          </div>
          <div className="padd">
            <input id="pl-name" type="text" placeholder="Nome (ex.: Academia)" aria-label="Nome do lugar" maxLength={30} value={plName} onChange={e => setPlName(e.target.value)} autoFocus={focus === 'places'} />
            <AddressCombo id="pl-addr" label="Endereço do lugar" placeholder="Endereço do lugar" value=""
              onPick={(pt, label) => { s.addPlace((plName.trim() || (label || 'Lugar').split(',')[0]).slice(0, 30), label, pt); setPlName('') }} />
          </div>
          <p className="note">Toque no nome para renomear. A ordem aqui é a mesma dos atalhos da tela inicial.</p>
        </div>

        <div className="sec" id="sec-routes">
          <h3>Rotas salvas</h3>
          {s.savedRoutes.length ? (
            <div className="places">
              {s.savedRoutes.map(r => (
                <div className="prow" key={r.id}>
                  <div className="pname"><input aria-label={'Nome da rota ' + r.name} defaultValue={r.name} maxLength={40} onBlur={e => s.renameRoute(r.id, e.target.value)} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }} />
                    <small>{String(r.km.toFixed(1)).replace('.', ',')} km · salva em {new Date(r.createdAt).toLocaleDateString('pt-BR')}</small></div>
                  <div className="pact">
                    <button className="ibtn sm" type="button" aria-label={'Remover a rota ' + r.name} onClick={() => {
                      const prev = useSettings.getState().savedRoutes
                      s.removeRoute(r.id); refreshTrip()
                      useUndo.getState().show('Rota removida', () => { useSettings.getState().patch({ savedRoutes: prev }); refreshTrip() })
                    }}><Trash2 className="i" /></button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          <button className="btn imp-open" type="button" id="import-open" onClick={() => setImporting(true)}><ImagePlus className="i" />Importar de um print</button>
          {importMsg && <p className="note ok-text" id="import-msg" style={{ margin: '6px 0 0' }}>{importMsg}</p>}
          <p className="note">{s.savedRoutes.length ? 'Cada rota aparece primeiro sempre que você for de perto do início até perto do fim dela (ou o contrário). Toque no nome para renomear.' : 'Nenhuma ainda. Em Seus pedais (ícone de relógio no topo), toque num pedal concluído e em "Usar como minha rota", ou importe de um print de outro app.'}</p>
        </div>

        <div className="sec">
          <h3>Rotina</h3>
          <div className="grid2">
            <label className="fld" htmlFor="t-ida">Saída de casa<input type="time" id="t-ida" value={s.tIda} onChange={e => s.patch({ tIda: e.target.value })} /></label>
            <label className="fld" htmlFor="t-volta">Saída do trabalho<input type="time" id="t-volta" value={s.tVolta} onChange={e => s.patch({ tVolta: e.target.value })} /></label>
            <label className="fld" htmlFor="speed">{s.speedAuto ? 'Cruzeiro (km/h)' : 'Média (km/h)'}<input type="number" id="speed" min={8} max={45} step={1} defaultValue={s.speed} onBlur={e => s.patch({ speed: Math.min(45, Math.max(8, +e.target.value || 22)) })} /></label>
          </div>
          <div className="grid2" style={{ marginTop: 10 }}>
            <label className="fld" htmlFor="batt">Bateria (Wh)<input type="number" id="batt" min={150} max={2000} step={10} defaultValue={s.batt} onBlur={e => s.patch({ batt: Math.min(2000, Math.max(150, +e.target.value || 500)) })} /></label>
            <label className="fld" htmlFor="whkm">Consumo (Wh/km)<input type="number" id="whkm" min={3} max={30} step={0.5} defaultValue={s.whkm} onBlur={e => s.patch({ whkm: Math.min(30, Math.max(3, +e.target.value || 10)) })} /></label>
          </div>
          <label className="toggle" htmlFor="speed-auto">
            <input type="checkbox" id="speed-auto" checked={s.speedAuto} onChange={e => s.patch({ speedAuto: e.target.checked })} />
            <span><b>Aprender com meus pedais</b><small>{learned ? `Sua média real, de porta a porta: ${String(learned.kmh).replace('.', ',')} km/h (${learned.n} pedais). É ela que o app usa para prever a chegada.` : `Até você concluir 2 pedais, o app desconta as paradas da velocidade de cruzeiro: prevê com ${String(Math.round(s.speed * STOP_FACTOR * 10) / 10).replace('.', ',')} km/h de porta a porta. Depois, usa a sua média real.`}</small></span>
          </label>
          <div className="fld" style={{ marginTop: 12 }}>Aparência
            <div className="dirs" role="group" aria-label="Aparência" style={{ margin: '2px 0 0' }}>
              {([['auto', 'Automática'], ['light', 'Clara'], ['dark', 'Escura']] as const).map(([k, l]) =>
                <button key={k} type="button" id={'theme-' + k} aria-pressed={s.theme === k} onClick={() => s.patch({ theme: k })}>{l}</button>)}
            </div>
            <small className="note" style={{ margin: '4px 0 0' }}>Automática segue o celular. Sob sol forte, a clara é mais fácil de ler no guidão.</small>
          </div>
          <div className="fld" style={{ marginTop: 12 }}>Tipo de rota
            <div className="dirs" role="group" aria-label="Tipo de rota" style={{ margin: '2px 0 0' }}>
              <button type="button" id="prof-bike" aria-pressed={s.profile !== 'main'} onClick={() => s.setProfile('bike')}>Bike: ciclovias</button>
              <button type="button" id="prof-main" aria-pressed={s.profile === 'main'} onClick={() => s.setProfile('main')}>Vias principais</button>
            </div>
          </div>
          <p className="note">Com os horários preenchidos, o app abre no sentido certo e já mostra a previsão para a sua próxima saída.</p>
        </div>

        <DataSection />

        <div className="sec">
          <h3>Precisão da previsão</h3>
          <p className="note" id="acc-txt" style={{ margin: '0 0 8px' }}>{accuracyText(s.log, s.probTh)}</p>
          {s.log.length > 0 && <button className="btn" type="button" id="acc-reset" onClick={() => s.resetFeedback()}>Zerar avaliações</button>}
        </div>

      </div>
      <div className="dlg-foot"><button className="btn primary" type="button" id="settings-done" onClick={onClose}>Pronto</button></div>
      <ImportRoute open={importing} onClose={m => { setImporting(false); if (m) setImportMsg(m) }} />
    </Dialog>
  )
}

/** Seus dados: exportar um backup em arquivo e importar (em outro aparelho, ou depois de limpar o navegador). */
function DataSection() {
  const [pending, setPending] = useState<{ settings: Settings; exportedAt: number } | null>(null)
  const [msg, setMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const when = (t: number) => t ? new Date(t).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'data desconhecida'
  return (
    <div className="sec" id="sec-data">
      <h3>Seus dados</h3>
      <p className="note" style={{ margin: '0 0 8px' }}>Tudo fica só neste aparelho. Guarde um backup (casa, trabalho, lugares, rotas salvas, rotina e histórico) para levar para outro celular ou não perder nada se limpar o navegador.</p>
      <div className="row data-row">
        <button className="btn" type="button" id="backup-export" onClick={() => {
          const { name, text } = makeBackup(useSettings.getState()); downloadText(name, text); setMsg('Backup salvo: ' + name)
        }}><Download className="i" />Exportar backup</button>
        <button className="btn" type="button" id="backup-import" onClick={() => fileRef.current?.click()}><Upload className="i" />Importar backup</button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden id="backup-file" onChange={async e => {
          const f = e.target.files?.[0]; e.target.value = ''; if (!f) return
          const r = readBackup(await f.text())
          if (!r.ok) { setMsg(r.error); setPending(null); return }
          setMsg(''); setPending({ settings: r.settings, exportedAt: r.exportedAt })
        }} />
      </div>
      {pending && (
        <div className="confirm-box" role="alert">
          <p>Substituir os dados deste aparelho pelo backup de <b>{when(pending.exportedAt)}</b>? ({pending.settings.places.length} lugares salvos, {pending.settings.history.length} pedais)</p>
          <div className="row">
            <button className="btn primary" type="button" id="backup-apply" onClick={() => {
              const prev = useSettings.getState()
              const before = JSON.parse(JSON.stringify({ ...prev })) as Settings
              try { localStorage.setItem('pedalclima.v1.antes-do-backup', JSON.stringify(before)) } catch { /* sem espaço: segue com o desfazer */ }
              useSettings.setState(pending.settings)
              setPending(null); setMsg('Backup importado.')
              useUndo.getState().show('Backup importado', () => useSettings.setState(before))
            }}>Substituir</button>
            <button className="btn" type="button" onClick={() => setPending(null)}>Cancelar</button>
          </div>
        </div>
      )}
      {msg && <p className="note" style={{ margin: '8px 0 0' }} id="backup-msg">{msg}</p>}
    </div>
  )
}

/** Recalcula o trajeto aberto (para uma rota salva entrar ou sair da lista). */
function refreshTrip() { const t = useTrip.getState(); if (t.mode === 'trip' && !t.ride) { t.set({ routes: [] }); t.refresh() } }
