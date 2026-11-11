import { removeSpurs, similar } from '../domain/geo'
import type { LatLon, Profile, RouteCandidate } from '../domain/types'
import { readJson, writeJson } from './cache'
import { parseBRouter } from '../domain/brouter'

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

/** BRouter, perfil "safety": roteador para bicicleta que prefere ciclovias e ruas calmas. */
async function brouter(pts: LatLon[], idx: number): Promise<RouteCandidate | null> {
  const lonlats = pts.map(p => p[1].toFixed(6) + ',' + p[0].toFixed(6)).join('|')
  try {
    const r = await fetch(`https://brouter.de/brouter?lonlats=${lonlats}&profile=safety&alternativeidx=${idx}&format=geojson`)
    if (!r.ok) return null
    return parseBRouter(await r.json())
  } catch { return null }
}

/** Encaixa um traçado nas ruas: o BRouter liga os pontos (em ordem) pelo caminho de bike mais próximo. */
export async function snapToRoads(pts: LatLon[]): Promise<LatLon[] | null> {
  const r = await brouter(pts, 0)
  return r?.line?.length ? r.line : null
}

/** Até 3 rotas diferentes. Bike: as do BRouter (por ciclovias), com o OSRM de reserva; e uma pelas vias principais para comparar. */
export async function fetchRoutes(home: LatLon, vias: LatLon[], dest: LatLon, profile: Profile): Promise<{ routes: RouteCandidate[]; fallback: boolean }> {
  const ends = [home, dest], pts = [home, ...vias, dest], via = vias.length > 0
  const key = 'routes5:' + profile + ':' + pts.flat().join(',')
  const cached = readJson<RouteCandidate[]>(key)
  if (cached?.length) return { routes: cached, fallback: false }
  const cands: RouteCandidate[] = []
  const add = (c: RouteCandidate | undefined | null) => {
    if (!c || cands.length >= 3) return
    if (cands.every(o => similar(c.line, o.line) < 0.8 && similar(o.line, c.line) < 0.8)) cands.push(c)
  }
  if (profile === 'bike') {
    const [b0, b1, b2, car] = await Promise.all([brouter(pts, 0), brouter(pts, 1), brouter(pts, 2), osrm('main', ends, 0)])
    const bikes = [b0, b1, b2].filter((x): x is RouteCandidate => !!x)
    if (bikes.length) {
      // a primeira é a melhor do perfil; depois, a que tem mais ciclovia
      add({ ...bikes[0], viaP: via })
      bikes.slice(1).sort((a, b) => (b.cycle ?? 0) - (a.cycle ?? 0)).forEach(add)
      add(car[0])
    } else {
      // BRouter fora do ar: volta para o OSRM de bicicleta
      const [prim, alts] = await Promise.all([osrm('bike', pts, 0), osrm('bike', ends, via ? 2 : 3)])
      if (prim[0]) add({ ...prim[0], viaP: via })
      alts.forEach(add); add(car[0])
    }
  } else {
    const [prim, alts, bike] = await Promise.all([osrm('main', pts, 0), osrm('main', ends, via ? 2 : 3), brouter(ends, 0)])
    if (prim[0]) add({ ...prim[0], viaP: via })
    add(alts[0]); add(bike); alts.slice(1).forEach(add)
  }
  if (!cands.length) return { routes: [{ line: pts, roads: [], profile, viaP: via }], fallback: true }
  writeJson(key, cands)
  return { routes: cands, fallback: false }
}
