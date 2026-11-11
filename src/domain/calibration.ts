export interface FeedbackEntry { t: number; dir: string; rainy: boolean; prob: number; exp: number; rained: boolean }

/** Ajusta a chance mínima para "leve a capa": alarmes falsos sobem, chuvas não avisadas descem. */
export function calibrate(log: FeedbackEntry[]): number {
  const last = log.slice(-12)
  if (last.length < 3) return 50
  const fa = last.filter(x => x.rainy && !x.rained).length, miss = last.filter(x => !x.rainy && x.rained).length
  return Math.max(35, Math.min(70, 50 + 5 * (fa - miss)))
}
export function accuracyText(log: FeedbackEntry[], probTh: number): string {
  if (!log.length) return 'Ao chegar de um pedal, conte se choveu: o app ajusta quando mandar levar a capa.'
  const ok = log.filter(x => x.rainy === x.rained).length
  return `${ok} de ${log.length} previsões certas. ` + (log.length < 3 ? 'Depois de 3 avaliações o app começa a ajustar quando mandar levar a capa.' : `O app manda levar a capa a partir de ${probTh}% de chance de chuva.`)
}
