/** Manutenção da bike pelos km rodados (odômetro do app) e pelo tempo. */
export interface MaintState { chain?: number; review?: number; tiresAt?: number }
export interface MaintItem { id: 'chain' | 'tires' | 'review'; title: string; due: boolean; progress: number; detail: string }

const CHAIN_KM = 300, REVIEW_KM = 1000, TIRES_DAYS = 7
const DAY = 864e5

export function maintenance(odo: number, m: MaintState, now = Date.now()): MaintItem[] {
  const sinceChain = odo - (m.chain ?? 0), sinceReview = odo - (m.review ?? 0)
  const days = m.tiresAt ? Math.max(0, (now - m.tiresAt) / DAY) : Infinity
  const km = (v: number) => Math.round(v).toLocaleString('pt-BR') + ' km'
  return [
    { id: 'chain', title: 'Lubrificar a corrente', due: sinceChain >= CHAIN_KM, progress: Math.min(1, sinceChain / CHAIN_KM),
      detail: sinceChain >= CHAIN_KM ? `${km(sinceChain)} desde a última vez (a cada ~${CHAIN_KM} km, ou depois de pedalar na chuva)` : `faltam ${km(CHAIN_KM - sinceChain)}` },
    { id: 'tires', title: 'Calibrar os pneus', due: Number.isFinite(days) && days >= TIRES_DAYS, progress: Number.isFinite(days) ? Math.min(1, days / TIRES_DAYS) : 0,
      detail: !Number.isFinite(days) ? 'toda semana (pneu murcho cansa e fura mais): toque em Feito ao calibrar' : days >= TIRES_DAYS ? `há ${Math.floor(days)} dias` : `daqui a ${Math.ceil(TIRES_DAYS - days)} ${Math.ceil(TIRES_DAYS - days) === 1 ? 'dia' : 'dias'}` },
    { id: 'review', title: 'Revisão (freios, câmbio, folgas)', due: sinceReview >= REVIEW_KM, progress: Math.min(1, sinceReview / REVIEW_KM),
      detail: sinceReview >= REVIEW_KM ? `${km(sinceReview)} desde a última` : `faltam ${km(REVIEW_KM - sinceReview)}` },
  ]
}
