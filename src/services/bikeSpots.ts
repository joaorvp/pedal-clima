import { rankSpots, spotsQuery, type BikeSpot } from '../domain/bikeSpots'
import type { LatLon } from '../domain/types'

/** Bicicletários, bebedouros, pontos de conserto e lojas perto de um ponto (Overpass). Amplia o raio se não achar. */
export async function fetchBikeSpots(ll: LatLon): Promise<BikeSpot[]> {
  for (const radius of [400, 1000]) {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 15000)
    try {
      const r = await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', body: new URLSearchParams({ data: spotsQuery(ll, radius) }), signal: ctl.signal })
      if (!r.ok) throw new Error('HTTP ' + r.status)
      const list = rankSpots(await r.json(), ll)
      if (list.some(s => s.kind === 'parking') || radius === 1000) return list
    } finally { clearTimeout(t) }
  }
  return []
}
