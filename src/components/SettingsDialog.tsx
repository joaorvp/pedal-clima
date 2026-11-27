import { ChevronDown, Crosshair, Download, FileUp, ImagePlus, Trash2, Upload, X } from 'lucide-react'
import { parseGpx } from '../domain/gpxImport'
import { NameForm } from './SaveRoute'
import { PlacePinIcon } from './bikeIcons'
import { useMemo, useRef, useState, type ReactNode } from 'react'
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

/** Bloco que abre e fecha: o título mostra um resumo do que tem dentro, para achar o que mudar sem rolar tudo. */
function Sec({ id, title, hint, open, children }: { id: string; title: string; hint?: string; open?: boolean; children: ReactNode }) {
  return (
    <details className="sec acc" id={id} open={open}>
      <summary><span className="acc-t"><h3>{title}</h3>{hint && <small className="acc-hint">{hint}</small>}</span><ChevronDown className="i acc-chev" /></summary>
      <div className="acc-body">{children}</div>
    </details>
  )
}
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
export function SettingsDialog({ open, onClose, focus }: { open: boolean; onClose: () => void; focus?: string }) {
  const s = useSettings()
  const [gpsMsg, setGpsMsg] = useState('')
  const [importing, setImporting] = useState(false), [importMsg, setImportMsg] = useState('')
  const gpxRef = useRef<HTMLInputElement>(null), [gpx, setGpx] = useState<{ name: string; line: [number, number][] } | null>(null), [importErr, setImportErr] = useState(false)
  const learned = learnedSpeed(s.history)
  const pick = (k: PointKey) => { onClose(); useTrip.getState().set({ pickMode: k, sheet: 'peek' }) }
  // abre já aberto só o que falta preencher (ou o bloco pedido); o resto fica fechado como um menu
  const first = useMemo(() => focus || (!s.homeSet || !s.workSet ? 'home-work' : ''), [open]) // eslint-disable-line react-hooks/exhaustive-deps
  const hwHint = s.homeSet && s.workSet ? `${s.names.home || 'Casa'} · ${s.names.work || 'Trabalho'}` : !s.homeSet && !s.workSet ? 'Defina casa e trabalho' : !s.homeSet ? 'Falta a casa' : 'Falta o trabalho'
  const routine = [s.tIda && `ida ${s.tIda}`, s.tVolta && `volta ${s.tVolta}`, s.speedAuto && learned ? `${String(learned.kmh).replace('.', ',')} km/h (aprendida)` : `${s.speed} km/h`].filter(Boolean).join(' · ')
  const themeName = { auto: 'Automática', light: 'Clara', dark: 'Escura' }[s.theme]

  return (
    <Dialog open={open} onClose={onClose} labelledBy="settings-title">
      <div className="dlg-head">
        <h2 id="settings-title">Ajustes</h2>
        <button className="ibtn" type="button" id="close-settings" aria-label="Fechar" style={{ marginLeft: 'auto' }} onClick={onClose}><X className="i" /></button>
      </div>
      <div className="dlg-body">
        <Sec id="sec-home-work" title="Casa e trabalho" hint={hwHint} open={first === 'home-work'}>
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
        </Sec>

        <Sec id="sec-places" title="Meus lugares" hint={s.places.length ? plural(s.places.length, 'lugar', 'lugares') : 'Nenhum ainda'} open={first === 'places'}>
          <button className="btn imp-open" type="button" id="open-places-settings" onClick={() => { onClose(); useTrip.getState().set({ placesOpen: {} }) }}>
            <PlacePinIcon />{s.places.length ? `Ver e organizar (${s.places.length} ${s.places.length === 1 ? 'lugar' : 'lugares'})` : 'Adicionar lugares'}</button>
          <p className="note">Academia, mercado, família, amigos…: cada lugar com o seu tipo e ícone. Também fica no alfinete com estrela, no topo do app.</p>
        </Sec>

        <Sec id="sec-routes" title="Rotas salvas" hint={s.savedRoutes.length ? plural(s.savedRoutes.length, 'rota', 'rotas') : 'Nenhuma ainda'} open={first === 'routes'}>
          {s.savedRoutes.length ? (
            <div className="saved-routes">
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
          <div className="imp-row">
            <button className="btn imp-open" type="button" id="import-open" onClick={() => setImporting(true)}><ImagePlus className="i" />Importar de um print</button>
            <button className="btn imp-open" type="button" id="gpx-open" onClick={() => gpxRef.current?.click()}><FileUp className="i" />Importar GPX</button>
            <input ref={gpxRef} type="file" accept=".gpx,application/gpx+xml,application/xml,text/xml" hidden id="gpx-file" onChange={async e => {
              const f = e.target.files?.[0]; e.target.value = ''; if (!f) return
              const g = parseGpx(await f.text())
              if (!g) { setImportErr(true); setImportMsg('Esse arquivo não parece um GPX com caminho. Exporte de novo como GPX (trilha ou rota).'); return }
              setImportErr(false); setImportMsg(''); setGpx({ name: g.name || f.name.replace(/\.gpx$/i, '').slice(0, 40) || 'Rota importada', line: g.line })
            }} />
          </div>
          {gpx && <NameForm initial={gpx.name} label="Nome da rota" onCancel={() => setGpx(null)}
            onSave={name => { s.saveRoute(name, gpx.line); setGpx(null); setImportMsg(`"${name.trim() || 'Minha rota'}" importada do GPX. Ela aparece nos trajetos que passam por ela.`); refreshTrip() }} />}
          {importMsg && <p className={'note ' + (importErr ? 'warn-text' : 'ok-text')} id="import-msg" role={importErr ? 'alert' : undefined} style={{ margin: '6px 0 0' }}>{importMsg}</p>}
          <p className="note">{s.savedRoutes.length ? 'Cada rota aparece nos trajetos que passam por ela, inteira ou só um trecho (nos dois sentidos). Toque no nome para renomear.' : 'Nenhuma ainda. Em Seus pedais (velocímetro no topo), toque num pedal concluído e em "Usar como minha rota", ou importe de um print ou de um arquivo GPX (Strava, Komoot, Google My Maps).'}</p>
        </Sec>

        <Sec id="sec-routine" title="Rotina e rota" hint={routine} open={first === 'routine'}>
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
          <div className="fld" style={{ marginTop: 12 }}>Tipo de rota
            <div className="dirs" role="group" aria-label="Tipo de rota" style={{ margin: '2px 0 0' }}>
              <button type="button" id="prof-bike" aria-pressed={s.profile !== 'main'} onClick={() => s.setProfile('bike')}>Bike: ciclovias</button>
              <button type="button" id="prof-main" aria-pressed={s.profile === 'main'} onClick={() => s.setProfile('main')}>Vias principais</button>
            </div>
          </div>
          <p className="note">Com os horários preenchidos, o app abre no sentido certo e já mostra a previsão para a sua próxima saída.</p>
        </Sec>

        <Sec id="sec-look" title="Aparência" hint={themeName} open={first === 'look'}>
          <div className="fld">
            <div className="dirs" role="group" aria-label="Aparência" style={{ margin: '2px 0 0' }}>
              {([['auto', 'Automática'], ['light', 'Clara'], ['dark', 'Escura']] as const).map(([k, l]) =>
                <button key={k} type="button" id={'theme-' + k} aria-pressed={s.theme === k} onClick={() => s.patch({ theme: k })}>{l}</button>)}
            </div>
            <small className="note" style={{ margin: '4px 0 0' }}>Automática segue o celular. Sob sol forte, a clara é mais fácil de ler no guidão.</small>
          </div>
          <button className="btn" type="button" id="hints-reset" style={{ marginTop: 12 }} disabled={!s.hintsSeen.length}
            onClick={() => { s.patch({ hintsSeen: [] }); onClose() }}>{s.hintsSeen.length ? 'Mostrar as dicas de novo' : 'As dicas vão aparecer de novo'}</button>
        </Sec>

        <Sec id="sec-data" title="Seus dados" hint="Backup em arquivo" open={first === 'data'}><DataSection /></Sec>

        <Sec id="sec-acc" title="Precisão da previsão" hint={s.log.length ? plural(s.log.length, 'avaliação', 'avaliações') : 'Sem avaliações ainda'} open={first === 'acc'}>
          <p className="note" id="acc-txt" style={{ margin: '0 0 8px' }}>{accuracyText(s.log, s.probTh)}</p>
          {s.log.length > 0 && <button className="btn" type="button" id="acc-reset" onClick={() => s.resetFeedback()}>Zerar avaliações</button>}
        </Sec>

      </div>
      <div className="dlg-foot"><button className="btn primary" type="button" id="settings-done" onClick={onClose}>Pronto</button></div>
      <ImportRoute open={importing} onClose={m => { setImporting(false); if (m) { setImportErr(false); setImportMsg(m) } }} />
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
    <>
      <p className="note" style={{ margin: '0 0 8px' }}>Tudo fica só neste aparelho. Guarde um backup (casa, trabalho, lugares, rotas salvas, rotina e histórico) para levar para outro celular ou não perder nada se limpar o navegador.</p>
      <div className="row data-row">
        <button className="btn" type="button" id="backup-export" onClick={() => {
          const { name, text } = makeBackup(useSettings.getState()); downloadText(name, text); setMsg('Backup salvo: ' + name)
          useSettings.getState().patch({ lastBackup: Date.now() })
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
    </>
  )
}

/** Recalcula o trajeto aberto (para uma rota salva entrar ou sair da lista). */
function refreshTrip() { const t = useTrip.getState(); if (t.mode === 'trip' && !t.ride) { t.set({ routes: [] }); t.refresh() } }
