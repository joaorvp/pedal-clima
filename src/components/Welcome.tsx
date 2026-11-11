import { useState } from 'react'
import { useSettings } from '../store/settings'
import { AddressCombo } from './AddressCombo'
import { Dialog } from './Dialog'
import { setPointFromMap } from '../store/actions'

/** Primeira abertura: casa, trabalho e rotina. */
export function Welcome() {
  const s = useSettings()
  const [open, setOpen] = useState(!s.onboarded && !s.customized)
  const [step, setStep] = useState(1)
  const [homeOk, setHomeOk] = useState(''), [workOk, setWorkOk] = useState('')
  const finish = () => { s.patch({ onboarded: true }); setOpen(false) }
  if (!open) { if (!s.onboarded) queueMicrotask(() => useSettings.getState().patch({ onboarded: true })); return null }
  return (
    <Dialog open onClose={finish} className="welcome" labelledBy="welcome-title">
      <div className="dlg-body">
        <div className="wl-steps" aria-hidden="true">{[1, 2, 3].map(i => <i key={i} className={i <= step ? 'on' : ''} />)}</div>
        {step === 1 && <div className="wl-step">
          <h2 id="welcome-title">Onde você mora?</h2>
          <p className="note">O ponto de partida das suas idas. Digite o endereço, cole um link do Google Maps ou use o GPS se estiver em casa.</p>
          <AddressCombo id="wl-home" label="Endereço de casa" placeholder="Endereço de casa" value={s.customized ? s.names.home : ''}
            onPick={(pt, n) => { if (n) s.setPoint('home', pt, n); else setPointFromMap('home', pt); setHomeOk('Casa definida') }} />
          <div className="row">
            <button className="btn" type="button" id="wl-gps" onClick={() => navigator.geolocation?.getCurrentPosition(
              p => { setPointFromMap('home', [p.coords.latitude, p.coords.longitude]); setHomeOk('Casa definida pelo GPS') }, () => setHomeOk('Não consegui sua localização.'))}>Estou em casa agora</button>
            <span className="note ok-text" id="wl-home-ok" style={{ margin: 0 }}>{homeOk}</span>
          </div>
        </div>}
        {step === 2 && <div className="wl-step">
          <h2 id="welcome-title">E o trabalho?</h2>
          <p className="note">O destino do dia a dia. Outros lugares você adiciona depois.</p>
          <AddressCombo id="wl-work" label="Endereço do trabalho" placeholder="Endereço do trabalho" value=""
            onPick={(pt, n) => { if (n) s.setPoint('work', pt, n); else setPointFromMap('work', pt); setWorkOk('Trabalho definido') }} />
          <span className="note ok-text" id="wl-work-ok">{workOk}</span>
        </div>}
        {step === 3 && <div className="wl-step">
          <h2 id="welcome-title">Sua rotina</h2>
          <p className="note">Com os horários, o app abre já no sentido certo e pode avisar antes de cada saída.</p>
          <div className="grid2">
            <label className="fld" htmlFor="wl-ida">Saída de casa<input type="time" id="wl-ida" value={s.tIda} onChange={e => s.patch({ tIda: e.target.value })} /></label>
            <label className="fld" htmlFor="wl-volta">Saída do trabalho<input type="time" id="wl-volta" value={s.tVolta} onChange={e => s.patch({ tVolta: e.target.value })} /></label>
            <label className="fld" htmlFor="wl-batt">Bateria (Wh)<input type="number" id="wl-batt" min={150} max={2000} step={10} defaultValue={s.batt} onBlur={e => s.patch({ batt: Math.min(2000, Math.max(150, +e.target.value || 500)) })} /></label>
          </div>
        </div>}
        <div className="row wl-nav">
          <button className="btn" type="button" id="wl-skip" onClick={finish}>Pular</button>
          <button className="btn primary" type="button" id="wl-next" style={{ marginLeft: 'auto' }} onClick={() => step < 3 ? setStep(step + 1) : finish()}>{step === 3 ? 'Começar' : 'Continuar'}</button>
        </div>
      </div>
    </Dialog>
  )
}
