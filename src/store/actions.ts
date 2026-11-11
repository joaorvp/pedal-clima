import type { LatLon } from '../domain/types'
import { reverseName } from '../services/places'
import { curPlace, useSettings, type PointKey } from './settings'

/** Muda um ponto pelo mapa e busca um nome de rua para ele. */
export async function setPointFromMap(k: PointKey, ll: LatLon) {
  const s = useSettings.getState()
  if (k === 'work' && curPlace(s)) { s.movePlace(s.destId!, ll); return }
  s.setPoint(k, ll)
  const name = await reverseName(ll)
  if (name && !useSettings.getState().names[k]) useSettings.getState().setName(k, name)
}

