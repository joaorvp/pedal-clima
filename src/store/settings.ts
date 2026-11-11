import { z } from 'zod'
import { create } from 'zustand'
import { persist, type PersistStorage } from 'zustand/middleware'
import { calibrate, type FeedbackEntry } from '../domain/calibration'
import { useUndo } from './undo'
import { learnedSpeed } from '../domain/speed'
import type { LatLon, Profile } from '../domain/types'

/** Mesma chave do app antigo (index.html único): os dados de quem já usa continuam valendo. */
export const STORE_KEY = 'pedalclima.v1'

const latLon = z.tuple([z.number(), z.number()])
const place = z.object({ id: z.string(), name: z.string(), addr: z.string().optional(), lat: z.number(), lon: z.number() })
const feedback = z.object({ t: z.number(), dir: z.string(), rainy: z.boolean(), prob: z.number(), exp: z.number(), rained: z.boolean() })
const names = z.object({ home: z.string().catch(''), via: z.string().catch(''), work: z.string().catch('') })

export const settingsSchema = z.object({
  home: latLon.catch([-15.876, -48.093]),
  // Quem nunca configurou não tem ponto P (antes vinha um de exemplo)
  via: latLon.nullable().catch(null),
  work: latLon.catch([-15.803, -47.956]),
  speed: z.number().min(8).max(45).catch(22),
  /** usar a média real dos seus pedais em vez do valor fixo */
  speedAuto: z.boolean().catch(true),
  batt: z.number().min(150).max(2000).catch(500),
  whkm: z.number().min(3).max(30).catch(10),
  profile: z.enum(['bike', 'main']).catch('bike'),
  customized: z.boolean().catch(false),
  /** casa e trabalho definidos pela pessoa (os valores de fábrica são só de exemplo e não aparecem) */
  homeSet: z.boolean().optional().catch(undefined),
  workSet: z.boolean().optional().catch(undefined),
  onboarded: z.boolean().catch(false),
  tIda: z.string().catch(''),
  tVolta: z.string().catch(''),
  names: names.catch({ home: '', via: '', work: '' }),
  nameVer: z.number().catch(0),
  places: z.array(place).catch([]),
  destId: z.string().nullable().catch(null),
  probTh: z.number().catch(50),
  log: z.array(feedback).catch([]),
  routePick: z.string().optional().catch(undefined),
  seenVersion: z.string().optional().catch(undefined),
  installDismissed: z.boolean().catch(false),
  /** a pessoa já tocou em "Permitir localização" no card de explicação */
  locAllowed: z.boolean().catch(false),
  /** pedais concluídos (resumo de cada um), do mais recente para o mais antigo */
  history: z.array(z.object({ km: z.number(), mins: z.number(), avg: z.number(), rain: z.number(), wh: z.number().nullable(), dest: z.string(), at: z.number() })).catch([]),
  /** mapa de ciclovias (CyclOSM) no lugar do mapa comum */
  cycleMap: z.boolean().catch(false),
  /** avisos falados durante o pedal */
  voice: z.boolean().catch(true),
  /** últimos destinos buscados ou marcados no mapa (fora os lugares salvos) */
  recent: z.array(z.object({ name: z.string(), lat: z.number(), lon: z.number(), t: z.number() })).catch([]),
})
export type Settings = z.infer<typeof settingsSchema>
export type Place = z.infer<typeof place>
export type PointKey = 'home' | 'via' | 'work'

export function parseSettings(raw: unknown): Settings {
  const s = settingsSchema.parse(raw ?? {})
  // Versões antigas davam nome ao comércio mais próximo; refaz com rua e bairro.
  if (s.nameVer !== 2) { s.names = { home: '', via: '', work: '' }; s.nameVer = 2 }
  // Quem já tinha ajustado os pontos antes desses campos existirem: casa e trabalho contam como definidos.
  if (s.homeSet === undefined) s.homeSet = s.customized
  if (s.workSet === undefined) s.workSet = s.customized
  return s
}

/** Grava o objeto puro (sem o envelope {state, version} do zustand), como o app antigo. */
const rawStorage: PersistStorage<Settings> = {
  getItem: name => { try { const v = localStorage.getItem(name); return { state: parseSettings(v ? JSON.parse(v) : {}), version: 0 } } catch { return { state: parseSettings({}), version: 0 } } },
  setItem: (name, value) => { try { localStorage.setItem(name, JSON.stringify(value.state)) } catch { /* cota cheia ou modo privado */ } },
  removeItem: name => { try { localStorage.removeItem(name) } catch { /* ignora */ } },
}

interface Actions {
  patch: (p: Partial<Settings>) => void
  setPoint: (k: PointKey, ll: LatLon, name?: string) => void
  setName: (k: PointKey, name: string) => void
  clearVia: () => void
  addPlace: (name: string, addr: string, ll: LatLon) => void
  removePlace: (id: string) => void
  renamePlace: (id: string, name: string) => void
  shiftPlace: (id: string, by: -1 | 1) => void
  addRecent: (name: string, ll: LatLon) => void
  addHistory: (h: Settings['history'][number]) => void
  movePlace: (id: string, ll: LatLon) => void
  addFeedback: (e: FeedbackEntry) => void
  resetFeedback: () => void
  setProfile: (p: Profile) => void
}

const round = (ll: LatLon): LatLon => [+ll[0].toFixed(5), +ll[1].toFixed(5)]

export const useSettings = create<Settings & Actions>()(persist((set, get) => ({
  ...parseSettings({}),
  patch: p => set(p),
  setPoint: (k, ll, name) => set(s => ({ [k]: round(ll), customized: k === 'via' ? s.customized : true, ...(k === 'home' ? { homeSet: true } : k === 'work' ? { workSet: true } : {}), names: { ...s.names, [k]: name ?? '' } })),
  setName: (k, name) => set(s => ({ names: { ...s.names, [k]: name } })),
  clearVia: () => set(s => ({ via: null, names: { ...s.names, via: '' } })),
  addPlace: (name, addr, ll) => { const id = 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); const [lat, lon] = round(ll); set(s => ({ places: [...s.places, { id, name, addr, lat, lon }], destId: id })) },
  removePlace: id => {
    const s = get(), i = s.places.findIndex(p => p.id === id), place = s.places[i]
    if (!place) return
    set({ places: s.places.filter(p => p.id !== id), destId: s.destId === id ? null : s.destId })
    useUndo.getState().show(`${place.name} removido`, () => set(st => { const places = st.places.slice(); places.splice(Math.min(i, places.length), 0, place); return { places } }))
  },
  renamePlace: (id, name) => set(s => ({ places: s.places.map(p => p.id === id ? { ...p, name: name.trim().slice(0, 30) || p.name } : p) })),
  shiftPlace: (id, by) => set(s => {
    const i = s.places.findIndex(p => p.id === id), j = i + by
    if (i < 0 || j < 0 || j >= s.places.length) return {}
    const places = s.places.slice(); [places[i], places[j]] = [places[j], places[i]]
    return { places }
  }),
  addHistory: h => set(s => ({ history: [h, ...s.history].slice(0, 300) })),
  addRecent: (name, ll) => set(s => {
    const [lat, lon] = round(ll)
    const near = (a: { lat: number; lon: number }) => Math.abs(a.lat - lat) + Math.abs(a.lon - lon) < 0.002
    if (near({ lat: s.home[0], lon: s.home[1] }) || near({ lat: s.work[0], lon: s.work[1] }) || s.places.some(near)) return {}
    return { recent: [{ name, lat, lon, t: Date.now() }, ...s.recent.filter(r => !near(r))].slice(0, 5) }
  }),
  movePlace: (id, ll) => { const [lat, lon] = round(ll); set(s => ({ places: s.places.map(p => p.id === id ? { ...p, lat, lon } : p) })) },
  addFeedback: e => { const log = [...get().log, e].slice(-40); set({ log, probTh: calibrate(log) }) },
  resetFeedback: () => set({ log: [], probTh: 50 }),
  setProfile: profile => set({ profile }),
}), {
  name: STORE_KEY,
  storage: rawStorage,
  partialize: s => settingsSchema.parse(s),
}))

/* Destino atual: o trabalho ou um lugar salvo */
export const curPlace = (s: Settings) => s.destId ? s.places.find(p => p.id === s.destId) ?? null : null
export const destPt = (s: Settings): LatLon => { const p = curPlace(s); return p ? [p.lat, p.lon] : s.work }
export const destName = (s: Settings) => curPlace(s)?.name ?? 'Trabalho'

/** Desconto típico de semáforos, cruzamentos e paradas no trânsito urbano (cruzeiro → porta a porta). */
export const STOP_FACTOR = 0.82
/**
 * Velocidade base das estimativas (porta a porta):
 * aprendizado ligado → a média real dos seus pedais (2+) ou, até lá, a velocidade de cruzeiro com o desconto das paradas;
 * desligado → o valor fixo, exatamente como você digitou.
 */
export const baseSpeed = (s: Settings) => s.speedAuto ? learnedSpeed(s.history)?.kmh ?? Math.round(s.speed * STOP_FACTOR * 10) / 10 : s.speed
