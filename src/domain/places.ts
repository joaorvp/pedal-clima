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

// ---------------------------------------------------------------------------
// Busca combinada: seus lugares + Photon + Nominatim (+ CEP), juntos e sem repetição.

/** Um resultado de busca já pronto para mostrar e escolher. */
export interface PlaceHit { ll: [number, number]; main: string; sub: string; kind: 'home' | 'work' | 'saved' | 'recent' | 'search' | 'cep'; score?: number }

/** Minúsculas, sem acentos e sem pontuação (para comparar "São Sebastião" com "sao sebastiao"). */
export const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

/** CEP digitado (00000-000 ou 00000000). */
export function parseCep(q: string): string | null {
  const m = q.trim().match(/^(\d{5})-?(\d{3})$/)
  return m ? m[1] + m[2] : null
}

const toRad = (d: number) => d * Math.PI / 180
const km = (a: [number, number], b: [number, number]) => {
  const dLa = toRad(b[0] - a[0]), dLo = toRad(b[1] - a[1])
  return 12742 * Math.asin(Math.sqrt(Math.sin(dLa / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLo / 2) ** 2))
}

/** Seus lugares que combinam com o texto (todas as palavras digitadas aparecem no nome). */
export function matchLocal(q: string, local: PlaceHit[]): PlaceHit[] {
  const words = norm(q).split(' ').filter(Boolean)
  if (!words.length) return []
  return local.filter(h => { const n = norm(h.main + ' ' + h.sub); return words.every(w => n.includes(w)) })
}

/** Resultado do Nominatim (OpenStreetMap). */
export interface NominatimItem { lat: string; lon: string; name?: string; display_name?: string; class?: string; type?: string; address?: Record<string, string> }
export function nominatimHit(it: NominatimItem): PlaceHit {
  const a = it.address ?? {}
  const street = [a.road || a.pedestrian || a.footway || a.cycleway, a.house_number].filter(Boolean).join(', ')
  const area = a.suburb || a.neighbourhood || a.city_district || a.quarter
  const city = a.city || a.town || a.village || a.municipality
  const main = it.name || street || area || city || (it.display_name ?? '').split(',')[0] || 'Local sem nome'
  const sub = [...new Set([it.name && street ? street : '', area, city, a.state].filter((x): x is string => !!x && x !== main))].join(' · ')
  return { ll: [+it.lat, +it.lon], main, sub, kind: 'search' }
}
export function photonHit(f: PhotonFeature): PlaceHit {
  const l = featLabel(f), c = f.geometry.coordinates
  return { ll: [c[1], c[0]], main: l.main, sub: l.sub, kind: 'search' }
}

/**
 * Junta os resultados: tira repetidos (mesmo nome a menos de 150 m, ou qualquer um a menos de 25 m) e ordena
 * por quanto o nome combina com o texto e pela distância de você.
 */
export function mergeHits(q: string, lists: PlaceHit[][], near: [number, number] | null, limit = 8): PlaceHit[] {
  const words = norm(q).split(' ').filter(Boolean), out: PlaceHit[] = []
  const nameScore = (h: PlaceHit) => {
    const n = norm(h.main), all = norm(h.main + ' ' + h.sub)
    let s = 0
    if (n === words.join(' ')) s += 3
    else if (n.startsWith(words.join(' '))) s += 2
    s += words.filter(w => all.includes(w)).length / Math.max(1, words.length) * 2
    return s
  }
  for (const list of lists) for (const h of list) {
    const dup = out.find(o => km(o.ll, h.ll) < 0.025 || (km(o.ll, h.ll) < 0.15 && norm(o.main) === norm(h.main)))
    if (dup) { if (!dup.sub && h.sub) dup.sub = h.sub; continue }
    const d = near ? km(near, h.ll) : 0
    out.push({ ...h, score: nameScore(h) - Math.min(3, Math.log10(1 + d) * 1.2) })
  }
  return out.sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, limit)
}

/** "350 m", "2,4 km", "48 km". */
export function distLabel(from: [number, number] | null, to: [number, number]): string {
  if (!from) return ''
  const d = km(from, to)
  return d < 1 ? Math.max(50, Math.round(d * 20) * 50) + ' m' : d < 20 ? String(Math.round(d * 10) / 10).replace('.', ',') + ' km' : Math.round(d) + ' km'
}

// ---- busca de comércios pelo nome, perto de você (Overpass, dados do OpenStreetMap) ----
const GENERIC = new Set(['supermercado', 'mercado', 'academia', 'farmacia', 'drogaria', 'padaria', 'restaurante', 'lanchonete', 'loja', 'posto', 'bar',
  'cafe', 'cafeteria', 'pizzaria', 'hospital', 'clinica', 'escola', 'colegio', 'faculdade', 'parque', 'praca', 'shopping', 'igreja', 'banco', 'hotel',
  'de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o', 'em', 'no', 'na'])
/** Palavras que identificam o lugar (sem as genéricas: "supermercado Kaique" procura "kaique"). Sem nenhuma, usa todas. */
export function nameWords(q: string): string[] {
  const all = norm(q).split(' ').filter(w => w.length > 1 && !/^\d+$/.test(w))
  const key = all.filter(w => !GENERIC.has(w))
  return (key.length ? key : all).slice(0, 3)
}
/** Expressão para comparar com o nome sem ligar para acentos ("cafe" acha "Café"). */
export function accentRegex(w: string): string {
  const map: Record<string, string> = { a: '[aáàâã]', e: '[eéê]', i: '[ií]', o: '[oóôõ]', u: '[uúü]', c: '[cç]' }
  return w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').split('').map(ch => map[ch] ?? ch).join('')
}
const CATEGORY: Record<string, string> = { supermarket: 'Supermercado', convenience: 'Mercado', fitness_centre: 'Academia', sports_centre: 'Centro esportivo', pharmacy: 'Farmácia',
  restaurant: 'Restaurante', fast_food: 'Lanchonete', cafe: 'Café', bakery: 'Padaria', fuel: 'Posto', bar: 'Bar', pub: 'Bar', hospital: 'Hospital', clinic: 'Clínica',
  school: 'Escola', university: 'Universidade', college: 'Faculdade', bank: 'Banco', mall: 'Shopping', park: 'Parque', place_of_worship: 'Igreja', marketplace: 'Feira' }
export interface OverpassEl { lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }
export function overpassHit(el: OverpassEl): PlaceHit | null {
  const t = el.tags ?? {}, lat = el.lat ?? el.center?.lat, lon = el.lon ?? el.center?.lon
  if (lat == null || lon == null || !t.name) return null
  const cat = CATEGORY[t.shop ?? ''] ?? CATEGORY[t.amenity ?? ''] ?? CATEGORY[t.leisure ?? ''] ?? ''
  const street = [t['addr:street'], t['addr:housenumber']].filter(Boolean).join(', ')
  const sub = [...new Set([cat, street, t['addr:suburb'], t['addr:city']].filter((x): x is string => !!x))].join(' · ')
  return { ll: [lat, lon], main: t.name, sub, kind: 'search' }
}
