import { hav, project } from '../domain/geo'
import { evaluate, isRainy } from '../domain/weather'
import type { LatLon } from '../domain/types'
import { destPt, useSettings } from '../store/settings'
import { useTrip } from '../store/trip'
import { rideSpeed } from './useTripView'

let watchId: number | null = null
let wakeLock: WakeLockSentinel | null = null

async function keepAwake() {
  try { if (useTrip.getState().ride && 'wakeLock' in navigator && !document.hidden) wakeLock = await navigator.wakeLock.request('screen') } catch { /* sem suporte */ }
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) keepAwake() })

export function startRide(): string | null {
  if (!navigator.geolocation) return 'Este navegador não fornece localização.'
  const T = useTrip.getState()
  T.set({ ride: { pos: null, acc: 0, d: 0, off: 0, ema: 0, follow: true, weakSignal: false, last: null, pred: null }, arrived: false, feedbackPred: null, sheet: 'peek' })
  let autoDir = true
  watchId = navigator.geolocation.watchPosition(p => {
    const t = useTrip.getState(), r = t.ride, route = t.routes[t.sel]
    if (!r || !route) return
    const s = useSettings.getState()
    const pos: LatLon = [p.coords.latitude, p.coords.longitude], now = p.timestamp || Date.now()
    let ema = r.ema
    if (r.last) {
      const dt = (now - r.last.t) / 3600e3, dist = hav(r.last.pos, pos)
      const v = p.coords.speed != null && p.coords.speed >= 0 ? p.coords.speed * 3.6 : dt > 0 ? dist / dt : 0
      if (v < 70) ema = ema ? ema * 0.7 + v * 0.3 : v
    }
    let dir = t.dir
    if (autoDir) { autoDir = false; dir = hav(pos, destPt(s)) < hav(pos, s.home) ? 'volta' : 'ida' }
    const pr = project(pos, route.line, route.cum), d = dir === 'ida' ? pr.d : route.total - pr.d
    let pred = r.pred
    if (!pred) { const sp = rideSpeed(ema, s.speed), e0 = evaluate(route, dir, Date.now() - d / sp * 3600e3, sp); pred = { t: Date.now(), dir, rainy: isRainy(e0, s.probTh), prob: e0.maxProb, exp: +e0.exposure.toFixed(2) } }
    const dest = dir === 'ida' ? destPt(s) : s.home
    if ((route.total - d < 0.12 && pr.off < 0.15) || hav(pos, dest) < 0.15) { stopRide(true); return }
    t.set({ dir, ride: { ...r, pos, acc: p.coords.accuracy || 0, d, off: pr.off, ema, last: { pos, t: now }, pred, weakSignal: false } })
  }, err => {
    const t = useTrip.getState()
    if (err.code === 1) { stopRide(); t.set({ error: 'Permita o acesso à localização no navegador para usar o modo pedal.' }); return }
    if (t.ride) t.set({ ride: { ...t.ride, weakSignal: true } })
  }, { enableHighAccuracy: true, maximumAge: 2000, timeout: 30000 })
  keepAwake()
  return null
}

export function stopRide(arrived = false) {
  if (watchId != null) navigator.geolocation.clearWatch(watchId)
  watchId = null
  wakeLock?.release().catch(() => {}); wakeLock = null
  const t = useTrip.getState()
  t.set({ ride: null, dep: null, arrived, feedbackPred: arrived ? t.ride?.pred ?? null : null })
}
