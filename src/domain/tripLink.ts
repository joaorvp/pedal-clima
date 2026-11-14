import type { LatLon } from './types'

/**
 * Link de um trajeto para abrir em outro aparelho (planejar no computador, pedalar com o celular).
 * O trajeto vai inteiro no próprio link: nada é guardado em servidor. A saída "sua localização" não entra no
 * link (o celular usa a posição dele); lugares fixos vão com coordenadas (5 casas, ~1 m) e nome.
 */
export interface LinkPoint { ll: LatLon; name: string }
export interface TripLink { dest: LinkPoint; origin?: LinkPoint; via?: LatLon }

const fmt = (ll: LatLon) => `${ll[0].toFixed(5)},${ll[1].toFixed(5)}`
function parseLL(v: string | null): LatLon | null {
  const m = v?.match(/^\s*(-?\d{1,2}(?:\.\d+)?),\s*(-?\d{1,3}(?:\.\d+)?)\s*$/); if (!m) return null
  const lat = +m[1], lon = +m[2]
  return Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? [lat, lon] : null
}
const cleanName = (v: string | null, fallback: string) => (v ?? '').replace(/\p{Cc}/gu, '').trim().slice(0, 60) || fallback

export function tripLinkQuery(t: TripLink): string {
  const q = new URLSearchParams({ trajeto: '1', para: fmt(t.dest.ll), pn: t.dest.name.slice(0, 60) })
  if (t.origin) { q.set('de', fmt(t.origin.ll)); q.set('dn', t.origin.name.slice(0, 60)) }
  if (t.via) q.set('por', fmt(t.via))
  return q.toString().replace(/%2C/gi, ',') // vírgula é válida no link e deixa o QR menor
}

export function parseTripLink(q: URLSearchParams): TripLink | null {
  if (!q.has('trajeto')) return null
  const dest = parseLL(q.get('para')); if (!dest) return null
  const o = parseLL(q.get('de')), via = parseLL(q.get('por'))
  return {
    dest: { ll: dest, name: cleanName(q.get('pn'), 'Destino') },
    ...(o ? { origin: { ll: o, name: cleanName(q.get('dn'), 'Saída') } } : {}),
    ...(via ? { via } : {}),
  }
}
