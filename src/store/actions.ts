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


/** Faz o trajeto atual passar por um ponto (arrastando a rota no mapa). Vale só para este trajeto. */
export async function setTripVia(ll: LatLon) {
  const { useTrip } = await import('./trip')
  const t = useTrip.getState()
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
