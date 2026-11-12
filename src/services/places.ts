import { accentRegex, areaName, mergeHits, nameWords, nominatimHit, overpassHit, parseCep, photonHit, type NominatimItem, type OverpassEl, type PhotonFeature, type PlaceHit } from '../domain/places'
import type { LatLon } from '../domain/types'

// região metropolitana (DF e arredores): a busca prefere esta região, mas não se limita a ela
const DF_CENTER: LatLon = [-15.82, -48.0]
const REGION = { w: -48.9, s: -16.6, e: -46.8, n: -15.0 }

/** fetch com tempo máximo: um serviço lento ou travado não pode deixar a busca "carregando para sempre". */
async function fetchT(url: string, ms = 6000): Promise<Response> {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), ms)
  try { return await fetch(url, { signal: ctl.signal }) } finally { clearTimeout(t) }
}

async function photon(q: string, near: LatLon, bbox: boolean): Promise<PlaceHit[]> {
  // a região de quem busca vai arredondada (~1 km): basta para priorizar o que fica perto
  const p = new URLSearchParams({ q, limit: '8', lat: near[0].toFixed(2), lon: near[1].toFixed(2) })
  if (bbox) p.set('bbox', [REGION.w, REGION.s, REGION.e, REGION.n].join(','))
  const r = await fetchT('https://photon.komoot.io/api/?' + p)
  if (!r.ok) throw new Error('HTTP ' + r.status)
  return (((await r.json()) as { features?: PhotonFeature[] }).features ?? []).map(photonHit)
}

/** Nominatim (OpenStreetMap): melhor com ruas, números e bairros. Uso leve, uma busca por pausa na digitação. */
async function nominatim(q: string): Promise<PlaceHit[]> {
  const p = new URLSearchParams({ q, format: 'jsonv2', addressdetails: '1', limit: '8', countrycodes: 'br', 'accept-language': 'pt-BR',
    viewbox: [REGION.w, REGION.n, REGION.e, REGION.s].join(','), bounded: '0' })
  const r = await fetchT('https://nominatim.openstreetmap.org/search?' + p)
  if (!r.ok) throw new Error('HTTP ' + r.status)
  return ((await r.json()) as NominatimItem[]).map(nominatimHit)
}

/**
 * Comércios e lugares pelo nome num raio de 15 km (Overpass, dados do OpenStreetMap). Acha o que os buscadores
 * de endereço às vezes deixam passar ("Smart Fit", "supermercado Kaique"). A região vai arredondada (~1 km).
 */
async function overpassNames(q: string, near: LatLon): Promise<PlaceHit[]> {
  const words = nameWords(q); if (!words.length) return []
  const filt = words.map(w => `["name"~"${accentRegex(w)}",i]`).join('')
  const ql = `[out:json][timeout:8];nwr${filt}(around:15000,${near[0].toFixed(2)},${near[1].toFixed(2)});out center 12;`
  const r = await fetchT('https://overpass-api.de/api/interpreter?data=' + encodeURIComponent(ql), 9000)
  if (!r.ok) throw new Error('HTTP ' + r.status)
  return (((await r.json()) as { elements?: OverpassEl[] }).elements ?? []).map(overpassHit).filter((h): h is PlaceHit => !!h)
}

/** CEP → rua, bairro e cidade (ViaCEP), depois a rua no mapa. */
async function byCep(cep: string, near: LatLon): Promise<PlaceHit[]> {
  const r = await fetchT(`https://viacep.com.br/ws/${cep}/json/`)
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
 * Busca combinada. Photon e Nominatim em paralelo, com preferência pela região de quem usa. O que chegar
 * primeiro já aparece (onUpdate) e o resto se junta depois; cada serviço tem tempo máximo de espera.
 * Se nada aparecer na região, procura no Brasil todo. Falha de uma fonte não derruba a outra.
 */
export async function searchPlaces(q: string, near: LatLon | null, onUpdate?: (hits: PlaceHit[]) => void): Promise<PlaceHit[]> {
  const at = near ?? DF_CENTER, cep = parseCep(q)
  if (cep) return byCep(cep, at)
  const lists: PlaceHit[][] = []
  let failed = 0
  const run = (p: Promise<PlaceHit[]>) => p.then(l => { lists.push(l); if (l.length) onUpdate?.(mergeHits(q, lists, at)) }, () => { failed++ })
  await Promise.all([run(photon(q, at, true)), run(nominatim(q)), run(overpassNames(q, at))])
  if (failed === 3) throw new Error('busca indisponível')
  if (!lists.some(l => l.length)) lists.push(await photon(q, at, false).catch(() => []))
  return mergeHits(q, lists, at)
}

export async function reverseName(p: LatLon): Promise<string | null> {
  try {
    const r = await fetchT(`https://photon.komoot.io/reverse?lat=${p[0]}&lon=${p[1]}&limit=1`)
    const f = ((await r.json()) as { features?: PhotonFeature[] }).features?.[0]
    return f ? areaName(f) : null
  } catch { return null }
}
