/** Leitura de endereços (Photon) e coordenadas coladas. */
export interface PhotonFeature {
  geometry: { coordinates: [number, number] }
  properties: { name?: string; street?: string; housenumber?: string; district?: string; locality?: string; city?: string; state?: string; osm_key?: string }
}

export function featLabel(f: PhotonFeature) {
  const p = f.properties || {}
  const street = [p.street, p.housenumber].filter(Boolean).join(', ')
  const main = p.name || street || p.district || p.city || 'Local sem nome'
  const rest = [p.name && street ? street : '', p.district || p.locality, p.city, p.state].filter((x): x is string => !!x && x !== main)
  return { main, sub: [...new Set(rest)].join(' · ') }
}
export function shortName(f: PhotonFeature) { const l = featLabel(f); return l.sub ? l.main + ', ' + l.sub.split(' · ')[0] : l.main }
/** Nome automático: rua e bairro, nunca o comércio ou rio mais próximo. */
export function areaName(f: PhotonFeature) {
  const p = f.properties || {}
  const street = p.street || (p.osm_key === 'highway' ? p.name : '')
  const area = p.district || p.locality || p.city || ''
  const parts = [street, area].filter((x): x is string => !!x)
  return parts.length ? [...new Set(parts)].join(', ') : (p.city || 'Ponto marcado no mapa')
}
/** Aceita link do Google Maps (…/@lat,lon,…, ?q=lat,lon) ou "lat, lon". */
export function parseCoords(q: string): [number, number] | null {
  const m = q.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) || q.match(/[?&](?:q|ll|query)=(-?\d+\.\d+)(?:,|%2C)\s*(-?\d+\.\d+)/) || q.match(/^\s*(-?\d{1,2}\.\d+)\s*[,; ]\s*(-?\d{1,3}\.\d+)\s*$/)
  if (!m) return null
  const lat = +m[1], lon = +m[2]
  return Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? [lat, lon] : null
}
