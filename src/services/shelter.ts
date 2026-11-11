import { overpassQuery, rankShelters, type Shelter } from '../domain/shelter'
import type { LatLon } from '../domain/types'

/** Abrigos cobertos perto de um ponto (OpenStreetMap via Overpass, gratuito). Amplia o raio se não achar nada. */
export async function fetchShelters(ll: LatLon): Promise<Shelter[]> {
  for (const radius of [600, 1500]) {
    const r = await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', body: new URLSearchParams({ data: overpassQuery(ll, radius) }) })
    if (!r.ok) throw new Error('HTTP ' + r.status)
    const list = rankShelters(await r.json(), ll)
    if (list.length) return list
  }
  return []
}
