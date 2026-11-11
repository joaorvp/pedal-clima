import { bearing, hav, project } from '../domain/geo'
import { evaluate, isRainy, rateAt } from '../domain/weather'
import type { LatLon } from '../domain/types'
import { readJson, writeJson } from '../services/cache'
import { say } from './voice'
import { baseSpeed, useSettings } from '../store/settings'
import { endpointLL, useTrip, type Endpoint, type Me, type Ride, type RideSummary } from '../store/trip'

const VIEW_KEY = 'pedalclima.view'
const RIDE_KEY = 'pedalclima.ride.v1'
const RESUME_WINDOW = 3 * 3600e3

/** Pedal em andamento salvo no aparelho: se o celular fechar o app no meio do caminho, dá para continuar de onde parou. */
export interface RideSnap {
  dest: Extract<Endpoint, { kind: 'place' }>; via: LatLon | null; viaName: string
  startedAt: number; dist: number; rain: number; moving: number; pace: number; pred: Ride['pred']; savedAt: number
}
let lastSave = 0
function saveRide(force = false) {
  const t = useTrip.getState(), r = t.ride
  if (!r || t.dest?.kind !== 'place' || (!force && Date.now() - lastSave < 10e3)) return
  lastSave = Date.now()
  const snap: RideSnap = { dest: t.dest, via: t.via, viaName: t.viaName, startedAt: r.startedAt, dist: r.dist, rain: r.rain, moving: r.moving, pace: r.pace, pred: r.pred, savedAt: lastSave }
  writeJson(RIDE_KEY, snap)
}
export function discardRide() { try { localStorage.removeItem(RIDE_KEY) } catch { /* sem armazenamento */ } }
/** Pedal interrompido há menos de 3 h (o mais antigo é descartado). */
export function pendingRide(): RideSnap | null {
  const s = readJson<RideSnap>(RIDE_KEY)
  const ok = s && s.dest?.kind === 'place' && Array.isArray(s.dest.ll) && typeof s.startedAt === 'number' && typeof s.savedAt === 'number'
  if (!ok || Date.now() - s.savedAt > RESUME_WINDOW) { if (s) discardRide(); return null }
  return s
}
/** Reabre o trajeto saindo de onde você está e retoma o pedal com o tempo, a distância e a chuva já acumulados. */
export function resumeRide(s: RideSnap): Promise<string | null> {
  const t = useTrip.getState()
  t.set({ mode: 'trip', origin: { kind: 'me' }, dest: s.dest, dep: null, routes: [], via: s.via, viaName: s.viaName, shelters: null, sheet: 'peek', error: '', arrived: false, summary: null })
  t.refresh()
  return new Promise(resolve => {
    const t0 = Date.now()
    const id = setInterval(() => {
      const st = useTrip.getState()
      if (st.routes[st.sel]) {
        clearInterval(id)
        const err = startRide(); if (err) { resolve(err); return }
        const r = useTrip.getState().ride!
        useTrip.getState().set({ ride: { ...r, startedAt: s.startedAt, dist: s.dist, rain: s.rain, moving: s.moving, pace: s.pace, pred: s.pred ?? r.pred } })
        saveRide(true); resolve(null)
      } else if (Date.now() - t0 > 25e3) { clearInterval(id); resolve('Não deu para recalcular a rota agora. Tente de novo em instantes.') }
    }, 300)
  })
}

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
  t.set({ ride: { pos: null, acc: 0, d: 0, off: 0, ema: 0, heading: null, follow: true, weakSignal: false, last: null, pred: null, offSince: null, startedAt: Date.now(), dist: 0, rain: 0, moving: 0, pace: 0, recalcAt: null }, arrived: false, feedbackPred: null, summary: null, sheet: 'peek' })
  startLocation()
  if (t.me) rideStep(t.me, null)
  keepAwake(); buzz(30); saveRide(true)
  return null
}

function rideStep(me: Me, speedMs: number | null) {
  const t = useTrip.getState(), r = t.ride, route = t.routes[t.sel]
  if (!r || !route) return
  const s = useSettings.getState(), pos = me.pos, now = me.t
  let ema = r.ema, moving = r.moving, pace = r.pace
  if (r.last) {
    const dt = (now - r.last.t) / 3600e3, dist = hav(r.last.pos, pos)
    const v = speedMs != null && speedMs >= 0 ? speedMs * 3.6 : dt > 0 ? dist / dt : 0
    if (v < 70) {
      ema = ema ? ema * 0.7 + v * 0.3 : v
      // ritmo em movimento: só conta quando está pedalando (acima de 4 km/h); suaviza em ~3 min
      if (v > 4 && dt > 0 && dt < 0.05) { moving += dt; const a = 1 - Math.exp(-dt / 0.05); pace = pace ? pace + (v - pace) * a : v }
    }
  }
  const pr = project(pos, route.line, route.cum), d = pr.d
  // sentido: o do GPS quando andando; parado, o da rota naquele ponto
  let heading = me.heading
  if (heading == null || ema < 3) { const i = route.cum.findIndex(c => c >= d); const a = route.line[Math.max(0, i - 1)], b = route.line[Math.min(route.line.length - 1, Math.max(1, i))]; if (a && b) heading = bearing(a, b) }
  let pred = r.pred
  if (!pred) { const sp = baseSpeed(s), e0 = evaluate(route, 'ida', now - d / sp * 3600e3, sp); pred = { t: now, dir: 'ida', rainy: isRainy(e0, s.probTh), prob: e0.maxProb, exp: +e0.exposure.toFixed(2) } }
  const dest = endpointLL(t.dest, t.me)
  if ((route.total - d < 0.12 && pr.off < 0.15) || (dest && hav(pos, dest) < 0.15)) { stopRide(true); return }
  // acumulados do resumo: km rodados (ignora saltos do GPS) e chuva prevista onde você está
  let dist = r.dist, rain = r.rain
  if (r.last) {
    const step = hav(r.last.pos, pos), dt = (now - r.last.t) / 3600e3
    if (dt > 0 && step / dt < 70) dist += step  // ignora saltos impossíveis do GPS
    const i = route.samples.findIndex(sm => sm.km >= d), w = route.wx?.[Math.max(0, i)]
    if (w && dt > 0 && dt < 0.05) rain += rateAt(w, now) * dt
  }
  const offSince = pr.off > 0.15 ? r.offSince ?? now : null
  // fora da rota por ~12 s: recalcula sozinho a partir de onde você está (no máximo a cada 45 s)
  let recalcAt = r.recalcAt
  if (offSince != null && now - offSince > 12e3 && (!recalcAt || now - recalcAt > 45e3)) {
    recalcAt = now
    if (s.voice) say('Recalculando a rota.')
    buzz(20)
    queueMicrotask(() => useTrip.getState().setEnd('origin', { kind: 'me' }))
  }
  t.set({ ride: { ...r, pos, acc: me.acc, d, off: pr.off, ema, heading, last: { pos, t: now }, pred, weakSignal: false, offSince, dist, rain, moving, pace, recalcAt } })
  saveRide()
}

export function stopRide(arrived = false) {
  discardRide()
  if (arrived) buzz([40, 60, 40])
  wakeLock?.release().catch(() => {}); wakeLock = null
  const t = useTrip.getState(), r = t.ride
  let summary: RideSummary | null = null
  if (arrived && r) {
    const mins = Math.max(1, Math.round((Date.now() - r.startedAt) / 60e3)), km = Math.max(r.dist, r.d)
    const s = useSettings.getState()
    summary = { km, mins, avg: km / (mins / 60), rain: r.rain, wh: km ? (s.whkm || 10) * km : null, dest: t.dest?.kind === 'place' ? t.dest.name : 'destino', at: Date.now() }
  }
  if (summary) useSettings.getState().addHistory(summary)
  t.set({ ride: null, dep: null, arrived, summary, feedbackPred: arrived ? r?.pred ?? null : null })
}
