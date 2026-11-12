import { areaName, mergeHits, nominatimHit, parseCep, photonHit, type NominatimItem, type PhotonFeature, type PlaceHit } from '../domain/places'
import type { LatLon } from '../domain/types'

// região metropolitana (DF e arredores): a busca prefere esta região, mas não se limita a ela
const DF_CENTER: LatLon = [-15.82, -48.0]
const REGION = { w: -48.9, s: -16.6, e: -46.8, n: -15.0 }

async function photon(q: string, near: LatLon, bbox: boolean): Promise<PlaceHit[]> {
  // a região de quem busca vai arredondada (~1 km): basta para priorizar o que fica perto
  const p = new URLSearchParams({ q, limit: '8', lat: near[0].toFixed(2), lon: near[1].toFixed(2), lang: 'default' })
  if (bbox) p.set('bbox', [REGION.w, REGION.s, REGION.e, REGION.n].join(','))
  const r = await fetch('https://photon.komoot.io/api/?' + p)
  if (!r.ok) throw new Error('HTTP ' + r.status)
  return (((await r.json()) as { features?: PhotonFeature[] }).features ?? []).map(photonHit)
}

/** Nominatim (OpenStreetMap): melhor com ruas, números e bairros. Uso leve, uma busca por pausa na digitação. */
async function nominatim(q: string): Promise<PlaceHit[]> {
  const p = new URLSearchParams({ q, format: 'jsonv2', addressdetails: '1', limit: '8', countrycodes: 'br', 'accept-language': 'pt-BR',
    viewbox: [REGION.w, REGION.n, REGION.e, REGION.s].join(','), bounded: '0' })
  const r = await fetch('https://nominatim.openstreetmap.org/search?' + p)
  if (!r.ok) throw new Error('HTTP ' + r.status)
  return ((await r.json()) as NominatimItem[]).map(nominatimHit)
}

/** CEP → rua, bairro e cidade (ViaCEP), depois a rua no mapa. */
async function byCep(cep: string, near: LatLon): Promise<PlaceHit[]> {
  const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
  if (!r.ok) return []
  const c = await r.json() as { logradouro?: string; bairro?: string; localidade?: string; uf?: string; erro?: boolean | string }
  if (c.erro || !c.localidade) return []
  const street = [c.logradouro, c.localidade, c.uf].filter(Boolean).join(', ')
  const found = await Promise.allSettled([nominatim(street), photon(street, near, false)])
  const hits = found.flatMap(f => f.status === 'fulfilled' ? f.value : [])
  const label = { main: c.logradouro || c.bairro || c.localidade, sub: [c.bairro, c.localidade, c.uf, 'CEP ' + cep.slice(0, 5) + '-' + cep.slice(5)].filter(Boolean).join(' · ') }
  return hits.slice(0, 1).map(h => ({ ...h, ...label, kind: 'cep' as const }))
}

/**
 * Busca combinada. Photon e Nominatim em paralelo, com preferência pela região de quem usa; se nada aparecer
 * na região, procura no Brasil todo. Falha de uma fonte não derruba a outra.
 */
export async function searchPlaces(q: string, near: LatLon | null): Promise<PlaceHit[]> {
  const at = near ?? DF_CENTER, cep = parseCep(q)
  if (cep) return byCep(cep, at)
  const res = await Promise.allSettled([photon(q, at, true), nominatim(q)])
  if (res.every(r => r.status === 'rejected')) throw new Error('busca indisponível')
  let lists = res.map(r => r.status === 'fulfilled' ? r.value : [])
  if (!lists.some(l => l.length)) lists = [await photon(q, at, false).catch(() => [])]
  return mergeHits(q, lists, at)
}

export async function reverseName(p: LatLon): Promise<string | null> {
  try {
    const r = await fetch(`https://photon.komoot.io/reverse?lat=${p[0]}&lon=${p[1]}&limit=1`)
    const f = ((await r.json()) as { features?: PhotonFeature[] }).features?.[0]
    return f ? areaName(f) : null
  } catch { return null }
}
