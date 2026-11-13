import { hav } from './geo'
import type { LatLon } from './types'

/** Lugares úteis para o ciclista perto do destino (OpenStreetMap): onde prender a bike, beber água, consertar. */
export type SpotKind = 'parking' | 'repair' | 'water' | 'shop'
export interface BikeSpot { id: string; ll: LatLon; kind: SpotKind; name: string; detail: string; dist: number }

export function spotsQuery(ll: LatLon, radius: number) {
  const a = `(around:${radius},${ll[0].toFixed(5)},${ll[1].toFixed(5)})`
  return `[out:json][timeout:15];(nwr["amenity"="bicycle_parking"]${a};nwr["amenity"="bicycle_repair_station"]${a};nwr["amenity"="drinking_water"]${a};nwr["shop"="bicycle"]${a};);out center 60;`
}

interface El { id: number; type: string; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }
const LABEL: Record<SpotKind, string> = { parking: 'Bicicletário', repair: 'Ponto de conserto', water: 'Bebedouro', shop: 'Loja de bike' }

export function rankSpots(json: { elements?: El[] }, ref: LatLon, perKind = 4): BikeSpot[] {
  const out: BikeSpot[] = []
  for (const e of json.elements ?? []) {
    const t = e.tags ?? {}, lat = e.lat ?? e.center?.lat, lon = e.lon ?? e.center?.lon
    if (lat == null || lon == null) continue
    const kind: SpotKind | null = t.amenity === 'bicycle_parking' ? 'parking' : t.amenity === 'bicycle_repair_station' ? 'repair' : t.amenity === 'drinking_water' ? 'water' : t.shop === 'bicycle' ? 'shop' : null
    if (!kind) continue
    const bits: string[] = []
    if (kind === 'parking') {
      if (t.capacity) bits.push(`${t.capacity} vagas`)
      if (t.covered === 'yes') bits.push('coberto')
      if (t.access === 'private' || t.access === 'customers') bits.push(t.access === 'customers' ? 'para clientes' : 'privado')
      if (t.bicycle_parking === 'stands') bits.push('paraciclo')
    }
    if (kind === 'repair') { if (t['service:bicycle:pump'] === 'yes') bits.push('bomba de ar'); if (t['service:bicycle:tools'] === 'yes') bits.push('ferramentas') }
    if (kind === 'shop' && t.opening_hours) bits.push(t.opening_hours)
    out.push({ id: e.type + e.id, ll: [lat, lon], kind, name: t.name || LABEL[kind], detail: bits.join(' · '), dist: hav(ref, [lat, lon]) })
  }
  // os mais perto de cada tipo, com bicicletários primeiro
  const order: SpotKind[] = ['parking', 'repair', 'water', 'shop']
  return order.flatMap(k => out.filter(s => s.kind === k).sort((a, b) => a.dist - b.dist).slice(0, perKind))
}
export const spotLabel = (k: SpotKind) => LABEL[k]
