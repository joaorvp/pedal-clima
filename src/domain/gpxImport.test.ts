import { describe, expect, it } from 'vitest'
import { parseGpx } from './gpxImport'
import { rideGpx } from './gpx'

describe('importar GPX', () => {
  it('lê uma trilha com nome', () => {
    const g = `<?xml version="1.0"?><gpx version="1.1" creator="x"><trk><name>Ida pelo parque &amp; lago</name><trkseg>
      <trkpt lat="-15.80" lon="-48.10"><ele>1100</ele></trkpt><trkpt lat='-15.81' lon='-48.09'/><trkpt lon="-48.08" lat="-15.82"></trkpt></trkseg></trk></gpx>`
    expect(parseGpx(g)).toEqual({ name: 'Ida pelo parque & lago', line: [[-15.8, -48.1], [-15.81, -48.09], [-15.82, -48.08]] })
  })
  it('aceita rota (rtept) e recusa o que não é GPX', () => {
    expect(parseGpx('<gpx><rte><rtept lat="1" lon="2"/><rtept lat="1.1" lon="2.1"/></rte></gpx>')?.line.length).toBe(2)
    expect(parseGpx('<html>oi</html>')).toBeNull()
    expect(parseGpx('<gpx><trk><trkpt lat="1" lon="2"/></trk></gpx>')).toBeNull()
  })
  it('lê de volta o GPX que o próprio app exporta', () => {
    const text = rideGpx({ mins: 8, dest: 'Trabalho', at: Date.now(), track: [[-15.8, -48.1], [-15.81, -48.09], [-15.82, -48.08]] })
    expect(parseGpx(text)?.line.length).toBe(3)
  })
})
