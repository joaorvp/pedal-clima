import type { LatLon } from '../domain/types'
import { reverseName } from '../services/places'
import { useSettings, type PointKey } from './settings'

/** Muda um ponto pelo mapa e busca um nome de rua para ele. */
export async function setPointFromMap(k: PointKey, ll: LatLon) {
  const s = useSettings.getState()
  s.setPoint(k, ll)
  const name = await reverseName(ll)
  if (name && !useSettings.getState().names[k]) useSettings.getState().setName(k, name)
}


/** Muda o ponto "passar por" do trajeto atual. No trajeto casa ⇄ trabalho, ele também fica salvo para as próximas vezes. */
export async function setTripVia(ll: LatLon) {
  const { useTrip, endpointLL } = await import('./trip')
  const t = useTrip.getState(), s = useSettings.getState()
  const o = endpointLL(t.origin, t.me), d = endpointLL(t.dest, t.me)
  const near = (a: LatLon | null, b: LatLon) => !!a && Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) < 0.015
  if ((near(o, s.home) && near(d, s.work)) || (near(o, s.work) && near(d, s.home))) s.setPoint('via', ll)
  t.set({ via: [+ll[0].toFixed(5), +ll[1].toFixed(5)], viaName: '', routes: [] })
  t.refresh()
}

/** Procura abrigos cobertos perto de um ponto. */
export async function findShelters(ref: LatLon) {
  const { useTrip } = await import('./trip')
  const { fetchShelters } = await import('../services/shelter')
  useTrip.getState().set({ shelters: { state: 'loading', list: [] } })
  try { const list = await fetchShelters(ref); useTrip.getState().set({ shelters: { state: list.length ? 'ok' : 'empty', list } }) }
  catch { useTrip.getState().set({ shelters: { state: 'error', list: [] } }) }
}
/** Refaz a rota passando pelo abrigo (no pedal, a partir de onde você está). */
export async function goViaShelter(ll: LatLon, name: string) {
  const { useTrip } = await import('./trip')
  const t = useTrip.getState()
  t.set({ via: ll, viaName: name, routes: [], shelters: null, ...(t.ride ? { origin: { kind: 'me' as const } } : {}) })
  t.refresh()
}
