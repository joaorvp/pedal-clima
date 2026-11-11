import { bearing, hav, project } from '../domain/geo'
import { evaluate, isRainy } from '../domain/weather'
import type { LatLon } from '../domain/types'
import { readJson, writeJson } from '../services/cache'
import { useSettings } from '../store/settings'
import { endpointLL, useTrip, type Me } from '../store/trip'
import { rideSpeed } from './useTripView'

const VIEW_KEY = 'pedalclima.view'

/** Vibração curta nos celulares que permitem (Android). */
export const buzz = (p: number | number[]) => { try { navigator.vibrate?.(p) } catch { /* sem suporte */ } }
let watchId: number | null = null
let wakeLock: WakeLockSentinel | null = null

/** Última região vista no mapa (para abrir no lugar certo quando a localização não estiver disponível). */
export const lastView = () => readJson<{ c: LatLon; z: number }>(VIEW_KEY)
export const saveView = (c: LatLon, z: number) => writeJson(VIEW_KEY, { c, z })

/** Acompanha a sua posição: ponto azul no mapa e, durante o pedal, a bike andando pela rota. */
export function startLocation() {
  if (watchId != null) return
  if (!navigator.geolocation) { useTrip.getState().set({ locStatus: 'unavailable' }); return }
  useTrip.getState().set({ locStatus: 'asking' })
  watchId = navigator.geolocation.watchPosition(p => {
    const t = useTrip.getState(), first = !t.me
    const pos: LatLon = [p.coords.latitude, p.coords.longitude]
    let heading = p.coords.heading != null && !Number.isNaN(p.coords.heading) ? p.coords.heading : t.me?.heading ?? null
    if (t.me && hav(t.me.pos, pos) > 0.008) heading = bearing(t.me.pos, pos)
    const me: Me = { pos, acc: p.coords.accuracy || 0, heading, t: p.timestamp || Date.now() }
    t.set({ me, locStatus: 'ok', ...(first ? { centerNonce: t.centerNonce + 1 } : {}) })
    if (first) {
      if (t.mode === 'explore') t.refreshLocal()
      else if (t.origin.kind === 'me' && !t.routes.length) t.refresh()
    }
    if (t.ride) rideStep(me, p.coords.speed)
  }, err => {
    const t = useTrip.getState()
    if (err.code === 1) { t.set({ locStatus: 'denied' }); if (t.ride) stopRide(); return }
    if (!t.me) t.set({ locStatus: 'unavailable' })
    if (t.ride) t.set({ ride: { ...t.ride, weakSignal: true } })
  }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 30000 })
}

async function keepAwake() {
  try { if (useTrip.getState().ride && 'wakeLock' in navigator && !document.hidden) wakeLock = await navigator.wakeLock.request('screen') } catch { /* sem suporte */ }
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) keepAwake() })

export function startRide(): string | null {
  const t = useTrip.getState()
  if (t.locStatus === 'denied') return 'Permita o acesso à localização no navegador para usar o modo pedal.'
  if (!navigator.geolocation) return 'Este navegador não fornece localização.'
  t.set({ ride: { pos: null, acc: 0, d: 0, off: 0, ema: 0, heading: null, follow: true, weakSignal: false, last: null, pred: null }, arrived: false, feedbackPred: null, sheet: 'peek' })
  startLocation()
  if (t.me) rideStep(t.me, null)
  keepAwake(); buzz(30)
  return null
}

function rideStep(me: Me, speedMs: number | null) {
  const t = useTrip.getState(), r = t.ride, route = t.routes[t.sel]
  if (!r || !route) return
  const s = useSettings.getState(), pos = me.pos, now = me.t
  let ema = r.ema
  if (r.last) {
    const dt = (now - r.last.t) / 3600e3, dist = hav(r.last.pos, pos)
    const v = speedMs != null && speedMs >= 0 ? speedMs * 3.6 : dt > 0 ? dist / dt : 0
    if (v < 70) ema = ema ? ema * 0.7 + v * 0.3 : v
  }
  const pr = project(pos, route.line, route.cum), d = pr.d
  // sentido: o do GPS quando andando; parado, o da rota naquele ponto
  let heading = me.heading
  if (heading == null || ema < 3) { const i = route.cum.findIndex(c => c >= d); const a = route.line[Math.max(0, i - 1)], b = route.line[Math.min(route.line.length - 1, Math.max(1, i))]; if (a && b) heading = bearing(a, b) }
  let pred = r.pred
  if (!pred) { const sp = rideSpeed(ema, s.speed), e0 = evaluate(route, 'ida', now - d / sp * 3600e3, sp); pred = { t: now, dir: 'ida', rainy: isRainy(e0, s.probTh), prob: e0.maxProb, exp: +e0.exposure.toFixed(2) } }
  const dest = endpointLL(t.dest, t.me)
  if ((route.total - d < 0.12 && pr.off < 0.15) || (dest && hav(pos, dest) < 0.15)) { stopRide(true); return }
  t.set({ ride: { ...r, pos, acc: me.acc, d, off: pr.off, ema, heading, last: { pos, t: now }, pred, weakSignal: false } })
}

export function stopRide(arrived = false) {
  if (arrived) buzz([40, 60, 40])
  wakeLock?.release().catch(() => {}); wakeLock = null
  const t = useTrip.getState()
  t.set({ ride: null, dep: null, arrived, feedbackPred: arrived ? t.ride?.pred ?? null : null })
}
