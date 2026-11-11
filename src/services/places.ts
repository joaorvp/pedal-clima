import { areaName, type PhotonFeature } from '../domain/places'
import type { LatLon } from '../domain/types'

const BIAS = { lat: -15.82, lon: -48.0 }, BBOX = '-48.6,-16.3,-47.2,-15.3'

export async function searchPlaces(q: string): Promise<PhotonFeature[]> {
  const r = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=6&lat=${BIAS.lat}&lon=${BIAS.lon}&bbox=${BBOX}`)
  if (!r.ok) throw new Error('HTTP ' + r.status)
  return ((await r.json()) as { features?: PhotonFeature[] }).features ?? []
}
export async function reverseName(p: LatLon): Promise<string | null> {
  try {
    const r = await fetch(`https://photon.komoot.io/reverse?lat=${p[0]}&lon=${p[1]}&limit=1`)
    const f = ((await r.json()) as { features?: PhotonFeature[] }).features?.[0]
    return f ? areaName(f) : null
  } catch { return null }
}
