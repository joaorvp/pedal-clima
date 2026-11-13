import { CupSoda, ParkingSquare, ShoppingBag, Wrench } from 'lucide-react'
import { spotLabel, type SpotKind } from '../domain/bikeSpots'
import { endpointLL, endpointName, useTrip } from '../store/trip'
import { fetchBikeSpots } from '../services/bikeSpots'

const ICON: Record<SpotKind, typeof ParkingSquare> = { parking: ParkingSquare, repair: Wrench, water: CupSoda, shop: ShoppingBag }
const dist = (km: number) => km < 1 ? `${Math.max(10, Math.round(km * 1000 / 10) * 10)} m` : `${km.toFixed(1).replace('.', ',')} km`

async function find() {
  const t = useTrip.getState(), ll = endpointLL(t.dest, t.me); if (!ll) return
  t.set({ spots: { state: 'loading', list: [] } })
  try { const list = await fetchBikeSpots(ll); useTrip.getState().set({ spots: { state: list.length ? 'ok' : 'empty', list } }) }
  catch { useTrip.getState().set({ spots: { state: 'error', list: [] } }) }
}

/** Perto do destino: onde prender a bike, beber água, encher o pneu ou consertar. */
export function BikeSpotsCard() {
  const dest = useTrip(s => s.dest), spots = useTrip(s => s.spots), routes = useTrip(s => s.routes)
  if (!dest || !routes.length) return null
  const to = endpointName(dest) || 'o destino'
  return (
    <section className="card spots" aria-live="polite">
      <h2><ParkingSquare className="i" />Onde deixar a bike</h2>
      {!spots && <>
        <p className="note" style={{ margin: '0 0 10px' }}>Bicicletários, bebedouros, pontos de conserto e lojas de bike perto de {to}.</p>
        <button className="btn" type="button" id="spots-find" onClick={find}><ParkingSquare className="i" />Procurar perto de {to}</button>
      </>}
      {spots?.state === 'loading' && <p className="note">Procurando perto de {to}…</p>}
      {spots?.state === 'error' && <p className="note">Não consegui buscar agora. <button className="linkbtn" type="button" onClick={find}>Tentar de novo</button></p>}
      {spots?.state === 'empty' && <p className="note">Nada mapeado por perto. Postes e grades firmes servem, sempre com cadeado em U passando pelo quadro.</p>}
      {spots?.state === 'ok' && <ul className="shelters spot-list">
        {spots.list.map(s => { const I = ICON[s.kind]; return (
          <li key={s.id} data-kind={s.kind}>
            <span className="ic"><I className="i" /></span>
            <span className="txt"><b>{s.name}</b><small>{[s.name === spotLabel(s.kind) ? '' : spotLabel(s.kind), s.detail, 'a ' + dist(s.dist) + ' do destino'].filter(Boolean).join(' · ')}</small></span>
          </li>) })}
      </ul>}
      {spots?.state === 'ok' && <p className="note" style={{ margin: '8px 0 0' }}>Também aparecem no mapa. Dados do OpenStreetMap: confira no local.</p>}
    </section>
  )
}
