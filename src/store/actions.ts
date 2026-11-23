import type { LatLon } from '../domain/types'
import { reverseName } from '../services/places'
import { useSettings, type PointKey } from './settings'

/** Muda um ponto pelo mapa e busca um nome de rua para ele. */
export async function setPointFromMap(k: PointKey, ll: LatLon) {
  const s = useSettings.getState()
  s.setPoint(k, ll)
  const name = await reverseName(ll)
  if (name && !useSettings.getState().names[k]) useSettings.getState().setName(k, name)
}


const r5 = (ll: LatLon): LatLon => [+ll[0].toFixed(5), +ll[1].toFixed(5)]

/** Faz o trajeto passar por um ponto (arrastando a rota no mapa). Um ponto só, e vale só para este trajeto. */
export async function setTripVia(ll: LatLon) {
  const { useTrip } = await import('./trip')
  const t = useTrip.getState()
  t.set({ vias: [r5(ll)], viaName: '', routes: [] })
  t.refresh()
}

/** Salva um caminho como rota sua; ela passa a ser a primeira e escolhida nesse trajeto (com Desfazer). */
export async function saveAsRoute(name: string, line: LatLon[]) {
  const { useTrip } = await import('./trip')
  const { useUndo } = await import('./undo')
  const s = useSettings.getState(), id = s.saveRoute(name, line)
  s.patch({ routePick: useSettings.getState().savedRoutes.find(r => r.id === id)?.name })
  const again = () => { const t = useTrip.getState(); if (t.mode === 'trip' && !t.ride) { t.set({ routes: [], vias: [], viaName: '' }); t.refresh() } }
  again()
  useUndo.getState().show('Rota salva', () => { useSettings.getState().removeRoute(id); again() })
}
/** Move um ponto de passagem já existente. */
export async function moveTripVia(i: number, ll: LatLon) {
  const { useTrip } = await import('./trip')
  const t = useTrip.getState()
  t.set({ vias: t.vias.map((p, k) => k === i ? r5(ll) : p), viaName: '', routes: [] })
  t.refresh()
}
/** Remove um ponto de passagem (ou todos, sem índice). */
export async function removeTripVia(i?: number) {
  const { useTrip } = await import('./trip')
  const t = useTrip.getState()
  t.set({ vias: i == null ? [] : t.vias.filter((_, k) => k !== i), viaName: '', routes: [] })
  t.refresh()
}


/** Salvar na hora (estrela da busca), com desfazer. */
export async function quickSave(name: string, addr: string, ll: LatLon) {
  const { useUndo } = await import('./undo')
  const { kindOf } = await import('../domain/placeKinds')
  const { duplicateOf } = await import('../domain/placeDup')
  const dup = duplicateOf(name.slice(0, 30), ll, useSettings.getState())
  // repetido: não cria outro atalho; avisa e oferece abrir Meus lugares para salvar mesmo assim
  if (dup) { const { useTrip } = await import('./trip'); useUndo.getState().show(dup, () => useTrip.getState().set({ placesOpen: { ll, name } }), 'Ver'); return }
  const s = useSettings.getState(), id = s.addPlace(name.slice(0, 30), addr, ll)
  const k = kindOf(useSettings.getState().places.find(p => p.id === id)?.kind)
  useUndo.getState().show(`Salvo em Meus lugares · ${k.label}`, () => useSettings.getState().removePlace(id))
}

/**
 * Usar uma rota salva neste trajeto (também no meio do pedal): o pedaço dela que serve, ligado a onde você está
 * e ao destino. Ela entra como a primeira opção, já escolhida. Devolve um aviso quando não dá.
 */
export async function applySavedRoute(id: string): Promise<string | null> {
  const [{ useTrip, endpointLL, stitchSaved }, { planSaved }, { prepRoute }, { fetchWeather, fetchElevation }] =
    await Promise.all([import('./trip'), import('../domain/savedRoutes'), import('../domain/routes'), import('../services/openMeteo')])
  const t = useTrip.getState(), s = useSettings.getState(), r = s.savedRoutes.find(x => x.id === id)
  const o = t.ride?.pos ?? endpointLL(t.origin, t.me), d = endpointLL(t.dest, t.me)
  if (!r || !o || !d) return 'Não deu para usar essa rota agora.'
  const p = planSaved(r, o, d)
  if (!p) return `"${r.name}" não passa perto deste trajeto.`
  try {
    const line = await stitchSaved(o, p, d, s.profile)
    const route = prepRoute({ line, roads: [], profile: s.profile, viaP: false, saved: { id: r.id, name: r.name } }, null)
    const [{ perRoute }, elev] = await Promise.all([fetchWeather([route]), fetchElevation(route)])
    route.wx = perRoute[0]; route.elev = elev
    const st = useTrip.getState(); if (st.mode !== 'trip') return null
    st.set({ routes: [route, ...st.routes.filter(x => x.saved?.id !== r.id)].slice(0, 5), sel: 0 })
    useSettings.getState().patch({ routePick: route.name })
    return null
  } catch { return 'Sem conexão para montar essa rota agora. Tente de novo em instantes.' }
}
