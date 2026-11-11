import { fmt1 } from './format'
import { bearing, hav, pointAt } from './geo'
import type { LatLon } from './types'

export type TurnKind = 'slight' | 'turn' | 'sharp' | 'uturn'
export interface Turn { km: number; at: LatLon; angle: number; dir: 'left' | 'right'; kind: TurnKind }

const WIN = 0.025    // olha 25 m antes e depois de cada vértice (ignora o zigue-zague do traçado)
const MIN = 30       // a partir de quantos graus um vértice vira candidato
const NET = 35       // ângulo mínimo da curva inteira para avisar
const MERGE = 0.045  // vértices a menos de 45 m fazem parte da mesma curva (esquina arredondada, rotatória pequena)

const delta = (a: number, b: number) => ((b - a + 540) % 360) - 180

/**
 * Curvas do trajeto a partir só do desenho da rota (funciona com qualquer roteador).
 * Para cada vértice compara a direção de chegada e de saída numa janela de 25 m; vértices próximos
 * viram uma curva só, e o ângulo final é medido de 40 m antes a 40 m depois do trecho.
 */
export function findTurns(line: LatLon[], cum: number[]): Turn[] {
  const total = cum[cum.length - 1] ?? 0
  if (line.length < 3 || total < 0.1) return []
  const at = (d: number) => pointAt(line, cum, Math.max(0, Math.min(total, d)))
  const cands: { i: number; km: number; d: number }[] = []
  for (let i = 1; i < line.length - 1; i++) {
    const km = cum[i]
    if (km < 0.03 || total - km < 0.03) continue
    const p = line[i], b1 = bearing(at(km - WIN), p), b2 = bearing(p, at(km + WIN))
    if (hav(at(km - WIN), p) < 0.005 || hav(p, at(km + WIN)) < 0.005) continue
    const d = delta(b1, b2)
    if (Math.abs(d) >= MIN) cands.push({ i, km, d })
  }
  // agrupa candidatos vizinhos e mede a curva inteira
  const turns: Turn[] = []
  for (let k = 0; k < cands.length;) {
    let j = k
    while (j + 1 < cands.length && cands[j + 1].km - cands[j].km <= MERGE) j++
    const from = cands[k].km, to = cands[j].km
    const peak = cands.slice(k, j + 1).reduce((a, b) => Math.abs(b.d) > Math.abs(a.d) ? b : a)
    const net = delta(bearing(at(from - 0.04), at(from)), bearing(at(to), at(to + 0.04)))
    const a = Math.abs(net)
    if (a >= NET) {
      turns.push({ km: peak.km, at: line[peak.i], angle: Math.round(a), dir: net > 0 ? 'right' : 'left', kind: a >= 165 ? 'uturn' : a >= 135 ? 'sharp' : a >= 60 ? 'turn' : 'slight' })
    }
    k = j + 1
  }
  return turns
}

/** Frase da manobra, para a voz e para o cartão. */
export function turnText(t: Turn): string {
  const side = t.dir === 'right' ? 'à direita' : 'à esquerda'
  if (t.kind === 'uturn') return 'faça o retorno'
  if (t.kind === 'sharp') return 'vire acentuadamente ' + side
  if (t.kind === 'slight') return 'mantenha-se ' + side
  return 'vire ' + side
}

/** Próxima curva à frente da posição (km já percorridos na rota). */
export function nextTurn(turns: Turn[], d: number): Turn | undefined {
  return turns.find(t => t.km > d + 0.008)
}

/** "200 m", "1,4 km" */
export function turnDistance(km: number) {
  if (km < 0.1) return Math.max(10, Math.round(km * 100) * 10) + ' m'
  if (km < 1) return Math.round(km * 20) * 50 + ' m'
  return fmt1(km) + ' km'
}
