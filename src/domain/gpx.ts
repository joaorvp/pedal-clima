import type { LatLon } from './types'
import { cumulative } from './geo'

/**
 * Arquivo GPX de um pedal, para importar no Strava, Garmin Connect, Komoot etc.
 * O app guarda o caminho simplificado e a duração, não a hora de cada ponto: os horários são distribuídos
 * pela distância ao longo da duração do pedal (o Strava exige horários para aceitar como atividade).
 */
export function rideGpx(r: { track: LatLon[]; at: number; mins: number; dest: string }): string {
  const end = r.at, start = end - r.mins * 60e3
  const cum = cumulative(r.track), total = cum[cum.length - 1] || 1
  const esc = (t: string) => t.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
  const pts = r.track.map((p, i) => `      <trkpt lat="${p[0].toFixed(6)}" lon="${p[1].toFixed(6)}"><time>${new Date(start + (end - start) * cum[i] / total).toISOString()}</time></trkpt>`).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Pedágua" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata><name>${esc('Pedal até ' + r.dest)}</name><time>${new Date(start).toISOString()}</time></metadata>
  <trk>
    <name>${esc('Pedal até ' + r.dest)}</name>
    <type>cycling</type>
    <trkseg>
${pts}
    </trkseg>
  </trk>
</gpx>
`
}

export function gpxFileName(at: number, dest: string) {
  const d = new Date(at), p = (n: number) => String(n).padStart(2, '0')
  const slug = dest.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'pedal'
  return `pedagua-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}-${slug}.gpx`
}
