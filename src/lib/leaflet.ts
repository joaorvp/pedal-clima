/** Leaflet com a extensão de girar o mapa (modo bússola no pedal). Importe o Leaflet sempre daqui. */
import './leaflet-global'
import 'leaflet-rotate'
import L from 'leaflet'

declare module 'leaflet' {
  interface MapOptions { rotate?: boolean; bearing?: number; rotateControl?: boolean; touchRotate?: boolean; shiftKeyRotate?: boolean; compassBearing?: boolean }
  interface Map { setBearing(deg: number): this; getBearing(): number }
  interface MarkerOptions { rotation?: number; rotateWithView?: boolean }
}
export default L
