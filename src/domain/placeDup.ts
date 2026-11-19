import { hav } from './geo'
import { norm } from './places'
import type { LatLon } from './types'

/**
 * Lugar repetido antes de salvar: o mesmo ponto (ou nome) da Casa, do Trabalho ou de um lugar já salvo.
 * Devolve o aviso para mostrar, ou null. Evita atalhos duplicados (ex.: um "☆ Casa" ao lado da Casa).
 */
export interface DupCtx { home: LatLon; work: LatLon; homeSet?: boolean; workSet?: boolean; places: { name: string; lat: number; lon: number }[] }
const NEAR_HOME_KM = 0.1, NEAR_PLACE_KM = 0.05

export function duplicateOf(name: string, ll: LatLon, c: DupCtx): string | null {
  const n = norm(name)
  if (c.homeSet && (hav(ll, c.home) < NEAR_HOME_KM || n === 'casa')) return 'Esse ponto já é a sua Casa (fica em Ajustes e nos atalhos).'
  if (c.workSet && (hav(ll, c.work) < NEAR_HOME_KM || n === 'trabalho')) return 'Esse ponto já é o seu Trabalho (fica em Ajustes e nos atalhos).'
  const near = c.places.find(p => hav(ll, [p.lat, p.lon]) < NEAR_PLACE_KM)
  if (near) return `Você já salvou "${near.name}" neste ponto.`
  const same = n && c.places.find(p => norm(p.name) === n)
  if (same) return `Você já tem um lugar chamado "${same.name}".`
  return null
}
