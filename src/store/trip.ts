import { create } from 'zustand'
import type { InmetAlert } from '../domain/alerts'
import { nextCommute } from '../domain/commute'
import { prepRoute } from '../domain/routes'
import type { Dir, LatLon, Route, SunTimes } from '../domain/types'
import { readJson, removeKey, writeJson } from '../services/cache'
import { fetchAlerts, fetchRadar, type RadarFrame } from '../services/external'
import { fetchElevation, fetchWeather } from '../services/openMeteo'
import { fetchRoutes } from '../services/routing'
import { destPt, useSettings, type PointKey } from './settings'

export interface Ride {
  pos: LatLon | null; acc: number
  /** km percorridos no sentido atual e distância até a rota */
  d: number; off: number
  /** velocidade média suavizada (km/h) */
  ema: number
  follow: boolean
  weakSignal: boolean
  last: { pos: LatLon; t: number } | null
  pred: { t: number; dir: Dir; rainy: boolean; prob: number; exp: number } | null
}
export type SheetState = 'peek' | 'half' | 'full'

interface TripState {
  dir: Dir
  dep: number | null
  routes: Route[]
  sel: number
  wxAt: number
  sun: SunTimes | null
  alerts: InmetAlert[] | null
  loading: boolean
  offline: boolean
  error: string
  routeNote: string
  radar: { host: string; frames: RadarFrame[]; idx: number; on: boolean; playing: boolean }
  ride: Ride | null
  feedbackPred: Ride['pred']
  arrived: boolean
  pickMode: PointKey | null
  sheet: SheetState
  sheetVisible: number
  fitNonce: number
  now: number
  set: (p: Partial<TripState>) => void
  refresh: () => Promise<void>
  loadSnapshot: () => boolean
  selectRoute: (i: number) => void
}

const SNAP_KEY = 'pedalclima.last'
const snapSig = () => { const s = useSettings.getState(); return [s.home, s.via, destPt(s), s.profile].flat().join(',') }

function initialDir(): { dir: Dir; dep: number | null } {
  const s = useSettings.getState(), n = nextCommute(s.tIda, s.tVolta)
  if (n) return { dir: n.d, dep: n.diff > 5 && n.diff <= 180 ? Date.now() + n.diff * 60e3 - (Date.now() % 60e3) : null }
  return { dir: new Date().getHours() < 12 ? 'ida' : 'volta', dep: null }
}

export const useTrip = create<TripState>()((set, get) => ({
  ...initialDir(),
  routes: [], sel: 0, wxAt: 0, sun: null, alerts: null,
  loading: true, offline: false, error: '', routeNote: '',
  radar: { host: '', frames: [], idx: 0, on: true, playing: false },
  ride: null, feedbackPred: null, arrived: false, pickMode: null,
  sheet: 'peek', sheetVisible: 0, fitNonce: 0, now: Date.now(),
  set: p => set(p),

  selectRoute: i => { set({ sel: i }); useSettings.getState().patch({ routePick: get().routes[i]?.name }) },

  refresh: async () => {
    set({ loading: true })
    const s = useSettings.getState(), dest = destPt(s)
    const radarP = fetchRadar().then(r => { if (r) set(st => ({ radar: { ...st.radar, host: r.host, frames: r.frames, idx: Math.max(0, r.frames.length - 1) } })) })
    const alertsP = fetchAlerts().then(alerts => set({ alerts }))
    try {
      const { routes: cands, fallback } = await fetchRoutes(s.home, s.via, dest, s.profile)
      const routes = cands.map(c => prepRoute(c, s.via))
      const [{ perRoute, sun }, elevs] = await Promise.all([fetchWeather(routes), Promise.all(routes.map(fetchElevation))])
      routes.forEach((r, i) => { r.wx = perRoute[i]; r.elev = elevs[i] })
      const keep = routes.findIndex(r => r.name === useSettings.getState().routePick)
      const prevSig = get().routes.map(r => r.line.length).join()
      set({ routes, sel: keep >= 0 ? keep : 0, sun, wxAt: Date.now(), loading: false, offline: false, error: '',
        routeNote: fallback ? 'Não consegui calcular a rota agora; usando linha reta entre os pontos.' : '',
        fitNonce: prevSig === routes.map(r => r.line.length).join() ? get().fitNonce : get().fitNonce + 1 })
      if (!writeJson(SNAP_KEY, { sig: snapSig(), wxAt: Date.now(), sun, sel: get().sel, routes })) removeKey(SNAP_KEY)
    } catch (e) {
      if (get().routes.length && get().routes[0].wx) set({ loading: false, offline: true, error: '' })
      else set({ loading: false, error: 'Não consegui carregar a previsão: ' + ((e as Error).message || e) + '. Verifique a conexão e toque em atualizar.' })
    }
    await Promise.all([radarP, alertsP])
  },

  /** Última previsão salva: abre na hora e funciona sem sinal. */
  loadSnapshot: () => {
    const j = readJson<{ sig: string; wxAt: number; sun: SunTimes | null; sel: number; routes: Route[] }>(SNAP_KEY)
    if (!j || j.sig !== snapSig() || Date.now() - j.wxAt > 20 * 3600e3 || !j.routes?.length) return false
    set({ routes: j.routes, sun: j.sun, wxAt: j.wxAt, sel: Math.min(j.sel || 0, j.routes.length - 1), loading: false, fitNonce: get().fitNonce + 1 })
    return true
  },
}))
