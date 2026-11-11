import { Fuel, MapPin, Store, TrainFront, Umbrella } from 'lucide-react'
import { useTripView } from '../hooks/useTripView'
import { pointAt } from '../domain/geo'
import { findShelters, goViaShelter } from '../store/actions'
import { useTrip } from '../store/trip'

const kindIcon = (k: string) => k.startsWith('Posto') ? Fuel : k.startsWith('Estação') ? TrainFront : k === 'Shopping' ? Store : k.startsWith('Ponto') ? MapPin : Umbrella
const dist = (km: number) => km < 1 ? `${Math.round(km * 1000 / 10) * 10} m` : `${km.toFixed(1).replace('.', ',')} km`

/** Com chuva no caminho: os abrigos cobertos mais próximos, para esperar a chuva passar. */
export function ShelterCard() {
  const view = useTripView(), ride = useTrip(s => s.ride), me = useTrip(s => s.me), shelters = useTrip(s => s.shelters)
  if (!view) return null
  const d = ride?.pos ? ride.d : 0
  const rainSeg = view.ev.segs.find(sg => sg.to > d && sg.rate >= 0.2)
  if (!rainSeg) return null
  const rainKm = Math.max(0, rainSeg.from - d)
  if (ride?.pos && rainKm > 2) return null
  // no pedal: perto de você; antes de sair: perto de onde a chuva começa
  const ref = ride?.pos ?? (rainKm < 0.3 && me ? me.pos : pointAt(view.route.line, view.route.cum, rainSeg.from))
  const where = ride?.pos ? 'perto de você' : rainSeg.from < 0.3 ? 'perto da saída' : 'perto de onde a chuva começa'
  return (
    <section className="card shelter" aria-live="polite">
      <h2><Umbrella className="i" />Onde me abrigar</h2>
      {!shelters && <>
        <p className="note" style={{ margin: '0 0 10px' }}>Pontos de ônibus cobertos, postos, estações e shoppings {where}, para esperar a chuva passar.</p>
        <button className="btn primary" type="button" id="shelter-find" onClick={() => findShelters(ref)}><Umbrella className="i" />Procurar abrigos</button>
      </>}
      {shelters?.state === 'loading' && <p className="note">Procurando abrigos {where}…</p>}
      {shelters?.state === 'error' && <p className="note">Não consegui buscar agora. <button className="linkbtn" type="button" onClick={() => findShelters(ref)}>Tentar de novo</button></p>}
      {shelters?.state === 'empty' && <p className="note">Nenhum abrigo mapeado por perto. Marquises e comércios também servem.</p>}
      {shelters?.state === 'ok' && <p className="note" style={{ margin: '0 0 8px' }}>Os mais próximos {where}:</p>}
      {shelters?.state === 'ok' && <ul className="shelters">
        {shelters.list.map(s => { const I = kindIcon(s.kind); return (
          <li key={s.id}>
            <span className="ic"><I className="i" /></span>
            <span className="txt"><b>{s.name}</b><small>{s.kind === s.name ? '' : s.kind + ' · '}a {dist(s.dist)}</small></span>
            <button className="btn" type="button" onClick={() => goViaShelter(s.ll, s.name)}>Passar por aqui</button>
          </li>) })}
      </ul>}
    </section>
  )
}
