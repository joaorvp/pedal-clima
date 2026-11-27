import type { LatLon } from './types'

/**
 * Lê um arquivo GPX (Strava, Komoot, Google My Maps, Garmin...) e devolve o caminho e o nome.
 * Aceita trilhas (trkpt), rotas (rtept) e, sem elas, pontos soltos (wpt) na ordem do arquivo.
 * Feito com expressões simples (sem DOMParser) para funcionar igual no navegador e nos testes.
 */
export function parseGpx(text: string): { name: string; line: LatLon[] } | null {
  if (!/<gpx[\s>]/i.test(text)) return null
  const pick = (tag: string) => {
    const re = new RegExp(`<${tag}\\b([^>]*)>`, 'gi'), out: LatLon[] = []
    for (let m; (m = re.exec(text));) {
      const lat = /\blat\s*=\s*["']([-\d.]+)["']/i.exec(m[1]), lon = /\blon\s*=\s*["']([-\d.]+)["']/i.exec(m[1])
      if (!lat || !lon) continue
      const p: LatLon = [+lat[1], +lon[1]]
      if (Math.abs(p[0]) <= 90 && Math.abs(p[1]) <= 180 && !Number.isNaN(p[0] + p[1])) out.push(p)
    }
    return out
  }
  let line = pick('trkpt'); if (line.length < 2) line = pick('rtept'); if (line.length < 2) line = pick('wpt')
  if (line.length < 2) return null
  const nm = /<(?:trk|rte|metadata)\b[^>]*>[\s\S]*?<name>\s*(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?\s*<\/name>/i.exec(text)
  const name = (nm?.[1] ?? '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\p{Cc}/gu, '').trim().slice(0, 40)
  return { name, line }
}
