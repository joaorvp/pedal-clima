import { removeSpurs, similar } from '../domain/geo'
import type { LatLon, Profile, RouteCandidate } from '../domain/types'
import { readJson, writeJson } from './cache'

interface OsrmRoute { geometry: { coordinates: [number, number][] }; legs: { summary: string }[] }

async function osrm(profile: Profile, pts: LatLon[], alts: number): Promise<RouteCandidate[]> {
  const coords = pts.map(p => p[1] + ',' + p[0]).join(';')
  const q = `?overview=full&geometries=geojson&continue_straight=true${alts ? '&alternatives=' + alts : ''}`
  const urls = profile === 'main'
    ? [`https://routing.openstreetmap.de/routed-car/route/v1/driving/${coords}${q}`, `https://router.project-osrm.org/route/v1/driving/${coords}${q}`]
    : [`https://routing.openstreetmap.de/routed-bike/route/v1/driving/${coords}${q}`, `https://router.project-osrm.org/route/v1/bike/${coords}${q}`]
  for (const u of urls) {
    try {
      const r = await fetch(u); if (!r.ok) continue
      const j = await r.json() as { routes?: OsrmRoute[] }
      if (j.routes?.length) return j.routes.map(rt => ({
        line: removeSpurs(rt.geometry.coordinates.map(c => [c[1], c[0]] as LatLon)),
        roads: rt.legs.map(l => l.summary).join(', ').split(',').map(x => x.trim()).filter(Boolean),
        profile, viaP: false,
      }))
    } catch { /* tenta o próximo servidor */ }
  }
  return []
}

/** Até 3 rotas diferentes: a principal (pelo P, se houver) e alternativas nos dois perfis. */
export async function fetchRoutes(home: LatLon, via: LatLon | null, dest: LatLon, profile: Profile): Promise<{ routes: RouteCandidate[]; fallback: boolean }> {
  const other: Profile = profile === 'main' ? 'bike' : 'main'
  const ends = [home, dest], pts = [home, via, dest].filter((p): p is LatLon => !!p)
  const key = 'routes4:' + profile + ':' + pts.flat().join(',')
  const cached = readJson<RouteCandidate[]>(key)
  if (cached?.length) return { routes: cached, fallback: false }
  const [prim, alts, oth] = await Promise.all([osrm(profile, pts, 0), osrm(profile, ends, via ? 2 : 3), osrm(other, ends, 1)])
  const cands: RouteCandidate[] = []
  if (prim[0]) cands.push({ ...prim[0], viaP: !!via })
  for (const c of [alts[0], oth[0], ...alts.slice(1), ...oth.slice(1)].filter(Boolean)) {
    if (cands.length >= 3) break
    if (cands.every(o => similar(c.line, o.line) < 0.8 && similar(o.line, c.line) < 0.8)) cands.push(c)
  }
  if (!cands.length) return { routes: [{ line: pts, roads: [], profile, viaP: !!via }], fallback: true }
  writeJson(key, cands)
  return { routes: cands, fallback: false }
}
