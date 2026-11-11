import { filterAlerts, type InmetAlert } from '../domain/alerts'

export interface RadarFrame { time: number; path: string }
export async function fetchRadar(): Promise<{ host: string; frames: RadarFrame[] } | null> {
  try {
    const r = await fetch('https://api.rainviewer.com/public/weather-maps.json'); if (!r.ok) return null
    const j = await r.json() as { host: string; radar?: { past?: RadarFrame[] } }
    return { host: j.host, frames: j.radar?.past ?? [] }
  } catch { return null }
}
/** null = não deu para consultar (ex.: o site bloqueia chamadas do navegador). */
export async function fetchAlerts(): Promise<InmetAlert[] | null> {
  try {
    const r = await fetch('https://apiprevmet3.inmet.gov.br/avisos/ativos'); if (!r.ok) return null
    return filterAlerts(await r.json(), Date.now())
  } catch { return null }
}
