/** Alertas oficiais do INMET para o DF (código IBGE 5300108). */
export const DF_GEOCODE = '5300108'
export interface InmetAlert { title: string; sev: string; level: 1 | 2 | 3; start: number; end: number }

export function parseBrDate(v: unknown): number {
  if (!v) return NaN
  if (typeof v === 'number') return v < 1e12 ? v * 1000 : v
  const s = String(v).trim().replace(' ', 'T')
  return Date.parse(/[zZ]|[+-]\d\d:?\d\d$/.test(s) ? s : s + '-03:00')
}
type Raw = Record<string, unknown>
export function filterAlerts(json: unknown, now: number, horizonMs = 12 * 3600e3): InmetAlert[] {
  const j = json as Raw | Raw[]
  const list: Raw[] = Array.isArray(j) ? j : [...((j?.hoje as Raw[]) || []), ...((j?.futuro as Raw[]) || [])]
  return list.filter(a => {
    const geo = String(a.geocodes ?? a.geocode ?? ''), mun = String(a.municipios ?? ''), uf = String(a.estados ?? a.uf ?? '')
    const here = geo.includes(DF_GEOCODE) || /bras[ií]lia/i.test(mun) || /distrito federal|\bDF\b/i.test(uf)
    const end = parseBrDate(a.fim ?? a.data_fim), start = parseBrDate(a.inicio ?? a.data_inicio)
    return here && (isNaN(end) || end > now) && (isNaN(start) || start < now + horizonMs)
  }).map(a => {
    const sev = String(a.severidade ?? '')
    const level = (/grande/i.test(sev) ? 3 : /perigo$/i.test(sev) && !/potencial/i.test(sev) ? 2 : 1) as 1 | 2 | 3
    return { title: String(a.descricao ?? a.evento ?? a.titulo ?? 'Alerta meteorológico'), sev, level, start: parseBrDate(a.inicio ?? a.data_inicio), end: parseBrDate(a.fim ?? a.data_fim) }
  })
}
