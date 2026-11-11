import { removeSpurs } from './geo'
import type { LatLon, RouteCandidate } from './types'

/** Trecho em ciclovia ou ciclofaixa, pelas etiquetas do OpenStreetMap que o BRouter devolve. */
export function isCycleWay(tags: string): boolean {
  const t = ' ' + tags + ' '
  return / highway=cycleway /.test(t) || / bicycle=designated /.test(t) ||
    / cycleway(:left|:right|:both)?=(lane|track|separate|shared_lane|opposite_lane|opposite_track) /.test(t)
}

interface BRouterGeo { features?: { geometry: { coordinates: number[][] }; properties: { messages?: (string | number)[][]; 'track-length'?: string } }[] }

/** Converte a resposta do BRouter numa rota, com a fração do caminho em ciclovia (0–1). */
export function parseBRouter(json: unknown): RouteCandidate | null {
  const f = (json as BRouterGeo)?.features?.[0]
  if (!f?.geometry?.coordinates?.length) return null
  const line = removeSpurs(f.geometry.coordinates.map(c => [c[1], c[0]] as LatLon))
  const msgs = f.properties?.messages ?? []
  let cycle: number | null = null
  if (msgs.length > 1) {
    const head = msgs[0].map(String), di = head.indexOf('Distance'), ti = head.indexOf('WayTags')
    if (di >= 0 && ti >= 0) {
      let total = 0, cyc = 0
      for (const row of msgs.slice(1)) { const d = Number(row[di]) || 0; total += d; if (isCycleWay(String(row[ti] ?? ''))) cyc += d }
      cycle = total > 0 ? cyc / total : null
    }
  }
  return { line, roads: [], profile: 'bike', viaP: false, cycle }
}
