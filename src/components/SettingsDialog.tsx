import { Crosshair, X } from 'lucide-react'
import { useState } from 'react'
import { accuracyText } from '../domain/calibration'
import { useSettings, type PointKey } from '../store/settings'
import { useTrip } from '../store/trip'
import { setPointFromMap } from '../store/actions'
import { AddressCombo } from './AddressCombo'
import { Dialog } from './Dialog'

const PLACE_DEF: { k: PointKey; label: string; caption: string; ph: string; color: string; letter: string }[] = [
  { k: 'home', label: 'Casa', caption: 'Casa', ph: 'Endereço de casa', color: '#1b2b4b', letter: 'C' },
  { k: 'via', label: 'Passar por', caption: 'Passar por (opcional)', ph: 'Nenhum (rota direta)', color: '#6b7a93', letter: 'P' },
  { k: 'work', label: 'Trabalho', caption: 'Trabalho', ph: 'Endereço do trabalho', color: '#e2662a', letter: 'T' },
]
export function SettingsDialog({ open, onClose, focus }: { open: boolean; onClose: () => void; focus?: string }) {
  const s = useSettings()
  const [plName, setPlName] = useState('')
  const [gpsMsg, setGpsMsg] = useState('')
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
                  onPick={(pt, name) => { if (name) s.setPoint(p.k, pt, name); else setPointFromMap(p.k, pt) }}
                  onClear={p.k === 'via' ? () => s.clearVia() : undefined} />
                <button className="mapbtn" type="button" aria-label={`Marcar ${p.label.toLowerCase()} no mapa`} title="Marcar no mapa" onClick={() => pick(p.k)}><Crosshair /></button>
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
            {s.places.map(p => (
              <div className="prow" key={p.id}><div><b>{p.name}</b><small>{p.addr || 'Ponto marcado'}</small></div>
                <button className="btn" type="button" aria-label={'Remover ' + p.name} onClick={() => s.removePlace(p.id)}>Remover</button></div>
            ))}
          </div>
          <div className="padd">
            <input id="pl-name" type="text" placeholder="Nome (ex.: Academia)" aria-label="Nome do lugar" maxLength={30} value={plName} onChange={e => setPlName(e.target.value)} autoFocus={focus === 'places'} />
            <AddressCombo id="pl-addr" label="Endereço do lugar" placeholder="Endereço do lugar" value=""
              onPick={(pt, label) => { s.addPlace((plName.trim() || (label || 'Lugar').split(',')[0]).slice(0, 30), label, pt); setPlName('') }} />
          </div>
          <p className="note">Os lugares aparecem como destino no card do trajeto. A ida é sempre a partir de casa.</p>
        </div>

        <div className="sec">
          <h3>Rotina</h3>
          <div className="grid2">
            <label className="fld" htmlFor="t-ida">Saída de casa<input type="time" id="t-ida" value={s.tIda} onChange={e => s.patch({ tIda: e.target.value })} /></label>
            <label className="fld" htmlFor="t-volta">Saída do trabalho<input type="time" id="t-volta" value={s.tVolta} onChange={e => s.patch({ tVolta: e.target.value })} /></label>
            <label className="fld" htmlFor="speed">Média (km/h)<input type="number" id="speed" min={8} max={45} step={1} defaultValue={s.speed} onBlur={e => s.patch({ speed: Math.min(45, Math.max(8, +e.target.value || 22)) })} /></label>
          </div>
          <div className="grid2" style={{ marginTop: 10 }}>
            <label className="fld" htmlFor="batt">Bateria (Wh)<input type="number" id="batt" min={150} max={2000} step={10} defaultValue={s.batt} onBlur={e => s.patch({ batt: Math.min(2000, Math.max(150, +e.target.value || 500)) })} /></label>
            <label className="fld" htmlFor="whkm">Consumo (Wh/km)<input type="number" id="whkm" min={3} max={30} step={0.5} defaultValue={s.whkm} onBlur={e => s.patch({ whkm: Math.min(30, Math.max(3, +e.target.value || 10)) })} /></label>
          </div>
          <div className="fld" style={{ marginTop: 12 }}>Tipo de rota
            <div className="dirs" role="group" aria-label="Tipo de rota" style={{ margin: '2px 0 0' }}>
              <button type="button" id="prof-bike" aria-pressed={s.profile !== 'main'} onClick={() => s.setProfile('bike')}>Bike: ruas calmas</button>
              <button type="button" id="prof-main" aria-pressed={s.profile === 'main'} onClick={() => s.setProfile('main')}>Vias principais</button>
            </div>
          </div>
          <p className="note">Com os horários preenchidos, o app abre no sentido certo e já mostra a previsão para a sua próxima saída.</p>
        </div>

        <div className="sec">
          <h3>Precisão da previsão</h3>
          <p className="note" id="acc-txt" style={{ margin: '0 0 8px' }}>{accuracyText(s.log, s.probTh)}</p>
          {s.log.length > 0 && <button className="btn" type="button" id="acc-reset" onClick={() => s.resetFeedback()}>Zerar avaliações</button>}
        </div>

      </div>
    </Dialog>
  )
}
