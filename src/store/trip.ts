import { create } from 'zustand'
import type { InmetAlert } from '../domain/alerts'
import { prepRoute } from '../domain/routes'
import { matchSaved } from '../domain/savedRoutes'
import type { SharedPlace } from '../domain/shareParse'
import type { LatLon, PointWeather, Route, SunTimes } from '../domain/types'
import { readJson, removeKey, writeJson } from '../services/cache'
import { fetchAlerts, fetchRadar, type RadarFrame } from '../services/external'
import { radarRainAt } from '../services/radarProbe'
import { fetchAir, fetchElevation, fetchLocalWeather, fetchWeather } from '../services/openMeteo'
import { fetchRoutes } from '../services/routing'
import { useSettings, type PointKey } from './settings'
import { useUndo } from './undo'

/** Um ponto do trajeto: a sua posição ao vivo ou um lugar fixo (salvo, buscado ou marcado no mapa). */
export type Endpoint =
  | { kind: 'me' }
  | { kind: 'place'; ll: LatLon; name: string; key?: string }

export interface Me { pos: LatLon; acc: number; heading: number | null; t: number }
export type LocStatus = 'idle' | 'asking' | 'ok' | 'denied' | 'unavailable'

export interface Ride {
  pos: LatLon | null; acc: number
  /** km percorridos desde a origem e distância até a rota */
  d: number; off: number
  /** velocidade média suavizada (km/h) */
  ema: number
  /** sentido do movimento (graus), para girar o marcador da bike */
  heading: number | null
  follow: boolean
  weakSignal: boolean
  last: { pos: LatLon; t: number } | null
  pred: { t: number; dir: string; rainy: boolean; prob: number; exp: number } | null
  /** desde quando está fora da rota (para oferecer recalcular) */
  offSince: number | null
  /** acumulados para o resumo: início, km rodados e chuva prevista nos trechos por onde passou */
  startedAt: number; dist: number; rain: number
  /** medidos pelo GPS: horas em movimento e ritmo em movimento (km/h, suavizado nos últimos minutos) */
  moving: number; pace: number
  /** último recálculo automático (fora da rota) */
  recalcAt: number | null
  /** caminho percorrido (um ponto a cada ~20 m), só no aparelho, para salvar como rota ao chegar */
  track: LatLon[]
}

/** Resumo mostrado ao chegar. */
export interface RideSummary { km: number; mins: number; avg: number; rain: number; wh: number | null; dest: string; at: number; track?: LatLon[] }
export type SheetState = 'peek' | 'half' | 'full'
export type Mode = 'explore' | 'trip'

interface TripState {
  mode: Mode
  origin: Endpoint
  dest: Endpoint | null
  /** pontos de passagem do trajeto atual, na ordem do caminho (arrastando a rota) */
  vias: LatLon[]
  dep: number | null
  me: Me | null
  locStatus: LocStatus
  local: { wx: PointWeather; at: number; ll: LatLon } | null
  routes: Route[]
  sel: number
  wxAt: number
  sun: SunTimes | null
  alerts: InmetAlert[] | null
  loading: boolean
  /** atualizando o clima de onde você está (tela inicial) */
  localLoading: boolean
  /** o radar mostra chuva onde você está agora (null: não deu para ler) */
  radarHere: boolean | null
  offline: boolean
  error: string
  routeNote: string
  radar: { host: string; frames: RadarFrame[]; idx: number; on: boolean; playing: boolean }
  ride: Ride | null
  feedbackPred: Ride['pred']
  arrived: boolean
  summary: RideSummary | null
  /** modo painel (guidão) aberto */
  /** avisar quando parar de chover onde você está */
  watchClear: boolean
  /** nome do ponto de passagem, quando tiver */
  viaName: string
  /** tela "Seus pedais" aberta */
  historyOpen: boolean
  /** tela "Meus lugares" aberta (com um ponto para salvar, quando vem do mapa) */
  placesOpen: null | { ll?: LatLon; name?: string; shared?: SharedPlace; notice?: string }
  /** página de apresentação (primeira visita pelo navegador ou link "Sobre") */
  landing: boolean
  /** qualidade do ar onde você está */
  air: { aqi: number; pm25: number } | null
  pickMode: PointKey | 'dest' | 'origin' | null
  sheet: SheetState
  sheetVisible: number
  fitNonce: number
  centerNonce: number
  now: number
  set: (p: Partial<TripState>) => void
  refresh: () => Promise<void>
  refreshLocal: () => Promise<void>
  loadSnapshot: () => boolean
  selectRoute: (i: number) => void
  startTrip: (dest: Endpoint, origin?: Endpoint) => void
  closeTrip: () => void
  swap: () => void
  /** troca a origem ou o destino do trajeto aberto (ou abre um trajeto, se ainda não houver) */
  setEnd: (which: 'origin' | 'dest', e: Endpoint) => void
}

/** Coordenada de um ponto do trajeto (a posição atual, se for "Sua localização"). */
export function endpointLL(e: Endpoint | null, me: Me | null): LatLon | null {
  if (!e) return null
  return e.kind === 'me' ? me?.pos ?? null : e.ll
}
export function endpointName(e: Endpoint | null): string {
  if (!e) return ''
  return e.kind === 'me' ? 'Sua localização' : e.name
}

const SNAP_KEY = 'pedalclima.last'
const LOCAL_KEY = 'pedalclima.local'
const round3 = (ll: LatLon | null) => ll ? ll.map(v => v.toFixed(3)).join(',') : '-'

/** Mostra a apresentação na primeira visita pelo navegador (não no app instalado nem nos atalhos) ou com #sobre / #privacidade. */
function initialLanding() {
  if (typeof window === 'undefined') return false
  if (/^#(sobre|privacidade|termos|creditos)$/.test(location.hash)) return true
  const s = useSettings.getState()
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone
  const q = new URLSearchParams(location.search)
  return !s.onboarded && !s.customized && !standalone && !q.has('ir') && !q.has('text') && !q.has('url')
}

export const useTrip = create<TripState>()((set, get) => ({
  mode: 'explore', origin: { kind: 'me' }, dest: null, vias: [], dep: null,
  me: null, locStatus: 'idle', local: null,
  routes: [], sel: 0, wxAt: 0, sun: null, alerts: null,
  loading: false, localLoading: false, radarHere: null, offline: false, error: '', routeNote: '',
  radar: { host: '', frames: [], idx: 0, on: true, playing: false },
  ride: null, feedbackPred: null, arrived: false, summary: null, watchClear: false, viaName: '', historyOpen: false, placesOpen: null, landing: initialLanding(), air: null, pickMode: null,
  sheet: 'peek', sheetVisible: 0, fitNonce: 0, centerNonce: 0, now: Date.now(),
  set: p => set(p),

  selectRoute: i => { set({ sel: i }); useSettings.getState().patch({ routePick: get().routes[i]?.name }) },

  startTrip: (dest, origin) => {
    if (dest.kind === 'place' && !dest.key) useSettings.getState().addRecent(dest.name, dest.ll)
    const st = get(), o = origin ?? (st.me ? { kind: 'me' } as Endpoint : { kind: 'place', ll: useSettings.getState().home, name: 'Casa', key: 'home' } as Endpoint)
    set({ mode: 'trip', origin: o, dest, dep: null, routes: [], vias: [], viaName: '', sheet: 'peek', error: '', arrived: false })
    get().refresh()
  },
  closeTrip: () => {
    const prev = { origin: get().origin, dest: get().dest, vias: get().vias, routes: get().routes, sel: get().sel, dep: get().dep }
    set({ mode: 'explore', dest: null, routes: [], vias: [], dep: null, routeNote: '', error: '', arrived: false, summary: null, centerNonce: get().centerNonce + 1 })
    get().refreshLocal()
    if (prev.dest) useUndo.getState().show('Trajeto fechado', () => { set({ mode: 'trip', ...prev, fitNonce: get().fitNonce + 1 }); if (!prev.routes.length) get().refresh() })
  },
  setEnd: (which, e) => {
    if (which === 'dest' && e.kind === 'place' && !e.key) useSettings.getState().addRecent(e.name, e.ll)
    const st = get()
    if (st.mode !== 'trip' || !st.dest) { if (which === 'dest') get().startTrip(e); else get().startTrip(st.dest ?? e, e); return }
    const origin = which === 'origin' ? e : st.origin, dest = which === 'dest' ? e : st.dest
    // recálculo no pedal (nova origem = você) mantém o ponto de passagem escolhido
    const keepVia = which === 'origin' && !!st.ride
    set({ origin, dest, routes: [], vias: keepVia ? st.vias : [], viaName: keepVia ? st.viaName : '', error: '' })
    get().refresh()
  },
  swap: () => {
    const { origin, dest, me } = get(); if (!dest) return
    // "Sua localização" vira um ponto fixo ao ir para o destino: a volta parte de onde você estava.
    const o: Endpoint = origin.kind === 'me' ? { kind: 'place', ll: me?.pos ?? useSettings.getState().home, name: 'Onde você estava' } : origin
    set({ origin: dest, dest: o, routes: [] }); get().refresh()
  },

  refreshLocal: async () => {
    set({ localLoading: true })
    // no máximo 12 s girando: um serviço lento (radar, alertas) não pode deixar o "atualizando" para sempre
    try { await Promise.race([refreshLocalNow(), new Promise(r => setTimeout(r, 12e3))]) } finally { set({ localLoading: false }) }
    async function refreshLocalNow() {
    const st = get(), s0 = useSettings.getState()
    // sem localização: a casa (se cadastrada) ou a região do mapa, nunca o ponto de exemplo de fábrica
    const ll = st.me?.pos ?? (st.mode === 'trip' ? endpointLL(st.origin, st.me) : null) ?? (s0.homeSet ? s0.home : readJson<{ c: LatLon }>('pedalclima.view')?.c ?? s0.home)
    const radarP = fetchRadar().then(async r => {
      if (!r) return
      set(s => ({ radar: { ...s.radar, host: r.host, frames: r.frames, idx: Math.max(0, r.frames.length - 1) } }))
      // confere no radar se está chovendo exatamente aqui (a previsão perde pancadas localizadas)
      const last = r.frames[r.frames.length - 1]
      if (last) set({ radarHere: await radarRainAt(r.host, last.path, ll) })
    })
    const alertsP = fetchAlerts().then(alerts => set({ alerts }))
    const airP = fetchAir(ll).then(air => { if (air) set({ air }) })
    try { const wx = await fetchLocalWeather(ll); const local = { wx, at: Date.now(), ll }; set({ local, offline: false }); writeJson(LOCAL_KEY, local) }
    catch { const cached = get().local ?? readJson<TripState['local']>(LOCAL_KEY); if (cached) set({ local: cached, offline: true }) }
    await Promise.all([radarP, alertsP, airP])
    }
  },

  refresh: async () => {
    const st = get()
    if (st.mode !== 'trip' || !st.dest) { await get().refreshLocal(); return }
    const o = endpointLL(st.origin, st.me), d = endpointLL(st.dest, st.me)
    if (!o || !d) { set({ error: 'Aguardando sua localização para montar o trajeto.' }); return }
    set({ loading: true })
    const s = useSettings.getState(), vias = st.vias
    const localP = get().refreshLocal()
    try {
      const { routes: found, fallback } = await fetchRoutes(o, vias, d, s.profile)
      // rotas salvas que servem para este trajeto vêm primeiro (sem pontos de passagem novos, que pedem um caminho diferente)
      const mine = vias.length ? [] : matchSaved(s.savedRoutes, o, d).slice(0, 2).map(m => ({ line: m.line, roads: [], profile: s.profile, viaP: false, saved: { id: m.route.id, name: m.route.name } }))
      const cands = [...mine, ...found].slice(0, mine.length + 3)
      const routes = cands.map(c => prepRoute(c, vias[0] ?? null))
      // nomes únicos (a escolha da rota fica salva pelo nome)
      routes.forEach((r, i) => { const n = routes.slice(0, i).filter(o => o.name.startsWith(r.name)).length; if (n) r.name += n === 1 ? ' · alternativa' : ` · alternativa ${n}` })
      const [{ perRoute, sun }, elevs] = await Promise.all([fetchWeather(routes), Promise.all(routes.map(fetchElevation))])
      routes.forEach((r, i) => { r.wx = perRoute[i]; r.elev = elevs[i] })
      if (get().mode !== 'trip') return
      const keep = routes.findIndex(r => r.name === useSettings.getState().routePick)
      set({ routes, sel: keep >= 0 ? keep : 0, sun, wxAt: Date.now(), loading: false, offline: false, error: '',
        routeNote: fallback && !mine.length ? 'Não consegui calcular a rota agora; usando linha reta entre os pontos.' : '', fitNonce: get().fitNonce + 1 })
      if (!writeJson(SNAP_KEY, { sig: round3(o) + '|' + round3(d) + '|' + s.profile, wxAt: Date.now(), sun, sel: get().sel, routes, origin: st.origin, dest: st.dest, vias })) removeKey(SNAP_KEY)
    } catch (e) {
      if (get().routes[0]?.wx) set({ loading: false, offline: true, error: '' })
      else set({ loading: false, error: 'Não consegui carregar a previsão: ' + ((e as Error).message || e) + '. Verifique a conexão e toque em atualizar.' })
    }
    await localP
  },

  /** Último trajeto salvo: reabre na hora e funciona sem sinal. */
  loadSnapshot: () => {
    const j = readJson<{ wxAt: number; sun: SunTimes | null; sel: number; routes: Route[]; origin?: Endpoint; dest?: Endpoint; via?: LatLon | null; vias?: LatLon[] }>(SNAP_KEY)
    if (!j?.dest || !j.routes?.length || Date.now() - j.wxAt > 20 * 3600e3) return false
    set({ mode: 'trip', origin: j.origin ?? { kind: 'me' }, dest: j.dest, vias: j.vias ?? (j.via ? [j.via] : []), routes: j.routes, sun: j.sun, wxAt: j.wxAt,
      sel: Math.min(j.sel || 0, j.routes.length - 1), loading: false, fitNonce: get().fitNonce + 1 })
    return true
  },
}))
