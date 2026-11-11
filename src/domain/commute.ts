import type { Dir } from './types'

export function minutesOf(t: string | undefined): number | null {
  if (!t) return null
  const [h, m] = t.split(':').map(Number)
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null
}
/** Próxima saída da rotina (até 20 min atrasada ainda conta como "agora"). */
export function nextCommute(tIda: string, tVolta: string, now = new Date()): { d: Dir; diff: number } | null {
  const nm = now.getHours() * 60 + now.getMinutes(), opts: { d: Dir; diff: number }[] = []
  for (const [d, m] of [['ida', minutesOf(tIda)], ['volta', minutesOf(tVolta)]] as const) {
    if (m == null) continue
    let diff = m - nm; if (diff < -20) diff += 1440
    opts.push({ d, diff })
  }
  opts.sort((a, b) => a.diff - b.diff)
  return opts[0] ?? null
}
