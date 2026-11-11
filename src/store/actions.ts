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


const r5 = (ll: LatLon): LatLon => [+ll[0].toFixed(5), +ll[1].toFixed(5)]

/** Faz o trajeto passar por um ponto (arrastando a rota no mapa). Um ponto só, e vale só para este trajeto. */
export async function setTripVia(ll: LatLon) {
  const { useTrip } = await import('./trip')
  const t = useTrip.getState()
  t.set({ vias: [r5(ll)], viaName: '', routes: [] })
  t.refresh()
}

/** Salva um caminho como rota sua; ela passa a ser a primeira e escolhida nesse trajeto (com Desfazer). */
export async function saveAsRoute(name: string, line: LatLon[]) {
  const { useTrip } = await import('./trip')
  const { useUndo } = await import('./undo')
  const s = useSettings.getState(), id = s.saveRoute(name, line)
  s.patch({ routePick: useSettings.getState().savedRoutes.find(r => r.id === id)?.name })
  const again = () => { const t = useTrip.getState(); if (t.mode === 'trip' && !t.ride) { t.set({ routes: [], vias: [], viaName: '' }); t.refresh() } }
  again()
  useUndo.getState().show('Rota salva', () => { useSettings.getState().removeRoute(id); again() })
}
/** Move um ponto de passagem já existente. */
export async function moveTripVia(i: number, ll: LatLon) {
  const { useTrip } = await import('./trip')
  const t = useTrip.getState()
  t.set({ vias: t.vias.map((p, k) => k === i ? r5(ll) : p), viaName: '', routes: [] })
  t.refresh()
}
/** Remove um ponto de passagem (ou todos, sem índice). */
export async function removeTripVia(i?: number) {
  const { useTrip } = await import('./trip')
  const t = useTrip.getState()
  t.set({ vias: i == null ? [] : t.vias.filter((_, k) => k !== i), viaName: '', routes: [] })
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
  t.set({ vias: [ll], viaName: name, routes: [], shelters: null, ...(t.ride ? { origin: { kind: 'me' as const } } : {}) })
  t.refresh()
}
