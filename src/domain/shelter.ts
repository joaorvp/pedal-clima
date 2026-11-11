import { hav } from './geo'
import type { LatLon } from './types'

export interface Shelter { id: string; name: string; kind: string; ll: LatLon; dist: number }
interface OverpassEl { type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }

/** Tipo do abrigo em português, a partir das etiquetas do OpenStreetMap. */
export function shelterKind(t: Record<string, string>): string | null {
  if (t.railway === 'station' || t.public_transport === 'station') return t.station === 'subway' || t.subway === 'yes' ? 'Estação de metrô' : 'Estação'
  if (t.shop === 'mall') return 'Shopping'
  if (t.amenity === 'fuel') return 'Posto de combustível'
  if (t.amenity === 'bicycle_parking' && t.covered === 'yes') return 'Bicicletário coberto'
  if ((t.highway === 'bus_stop' || t.public_transport === 'platform') && t.shelter === 'yes') return 'Ponto de ônibus coberto'
  if (t.amenity === 'shelter') return t.shelter_type === 'public_transport' ? 'Ponto de ônibus coberto' : 'Abrigo'
  return null
}

/** Os abrigos mais próximos de `ref`, um por lugar (sem repetir pontos colados). */
export function rankShelters(json: unknown, ref: LatLon, max = 3): Shelter[] {
  const els = ((json as { elements?: OverpassEl[] })?.elements ?? [])
  const out: Shelter[] = []
  for (const e of els) {
    const lat = e.lat ?? e.center?.lat, lon = e.lon ?? e.center?.lon, kind = e.tags ? shelterKind(e.tags) : null
    if (lat == null || lon == null || !kind) continue
    const ll: LatLon = [lat, lon]
    out.push({ id: e.type + e.id, kind, name: e.tags?.name || e.tags?.brand || kind, ll, dist: hav(ref, ll) })
  }
  out.sort((a, b) => a.dist - b.dist)
  const picked: Shelter[] = []
  for (const s of out) { if (picked.every(p => hav(p.ll, s.ll) > 0.05)) picked.push(s); if (picked.length >= max) break }
  return picked
}

export function overpassQuery(ll: LatLon, radius: number) {
  const a = `(around:${radius},${ll[0].toFixed(5)},${ll[1].toFixed(5)})`
  return `[out:json][timeout:15];(node${a}[amenity=shelter];node${a}[highway=bus_stop][shelter=yes];node${a}[public_transport=platform][shelter=yes];nwr${a}[amenity=fuel];nwr${a}[railway=station];nwr${a}[shop=mall];nwr${a}[amenity=bicycle_parking][covered=yes];);out center 60;`
}
