import { buildSamples, cumulative, hav } from './geo'
import type { LatLon, Route, RouteCandidate } from './types'

export function routeName(r: RouteCandidate): string {
  const roads = (r.roads || []).filter(x => !/^\d+$/.test(x)).slice(0, 2)
  if (roads.length) return roads.join(' e ')
  if (r.viaP) return 'Passando pelo ponto P'
  if (r.cycle != null) return r.cycle >= 0.4 ? 'Pelas ciclovias' : 'Por ruas calmas'
  return r.profile === 'main' ? 'Pelas vias principais' : 'Por ruas calmas'
}
export function prepRoute(c: RouteCandidate, via: LatLon | null): Route {
  const b = buildSamples(c.line), cum = cumulative(c.line)
  let best = 0, bd = Infinity
  if (via) b.samples.forEach(s => { const d = hav([s.lat, s.lon], via); if (d < bd) { bd = d; best = s.km } })
  return { ...c, name: routeName(c), cum, samples: b.samples, total: b.total, viaKm: bd < 3 ? best : null, wx: null }
}
