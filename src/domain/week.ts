/**
 * Semana do pedal: a ida e a volta nos horários da rotina, nos próximos dias úteis.
 * Usa a previsão por hora em dois pontos (casa e trabalho) e olha todas as horas que o trajeto cobre.
 */
export interface HourlyRain { time: number[]; precipitation_probability: number[]; precipitation: number[] }
export type WeekLevel = 'dry' | 'maybe' | 'rain' | 'heavy'
export interface WeekLeg { t: number; prob: number; mm: number; level: WeekLevel; past: boolean }
export interface WeekDay { day: number; label: string; ida: WeekLeg | null; volta: WeekLeg | null }

const WD = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

/** Uma perna (ida ou volta): pior chance e maior chuva por hora entre a saída e a chegada, nos dois pontos. */
export function legAt(ws: HourlyRain[], t: number, durMs: number, now: number, probTh = 50): WeekLeg | null {
  const t0 = t / 1000, t1 = (t + durMs) / 1000
  let prob = 0, mm = 0, n = 0
  for (const w of ws) {
    const i0 = w.time.findIndex(x => x + 3600 > t0)
    if (i0 < 0) return null // além da previsão
    for (let i = i0; i < w.time.length && w.time[i] <= t1; i++) { prob = Math.max(prob, w.precipitation_probability[i] ?? 0); mm = Math.max(mm, w.precipitation[i] ?? 0); n++ }
  }
  if (!n) return null
  const level: WeekLevel = mm >= 4 ? 'heavy' : mm >= 0.2 ? 'rain' : prob >= probTh ? 'maybe' : 'dry'
  return { t, prob, mm, level, past: t + durMs < now }
}

const at = (base: Date, hm: string) => { const [h, m] = hm.split(':').map(Number); const d = new Date(base); d.setHours(h || 0, m || 0, 0, 0); return d.getTime() }

/** Próximos `days` dias úteis (hoje entra se a volta ainda não passou). Para quando a previsão acaba. */
export function weekPlan(home: HourlyRain, work: HourlyRain, now: number, tIda: string, tVolta: string, durMin: number, probTh = 50, days = 5): WeekDay[] {
  const out: WeekDay[] = [], dur = Math.max(5, durMin) * 60e3, today = new Date(now)
  for (let k = 0; k < 10 && out.length < days; k++) {
    const d = new Date(today); d.setDate(d.getDate() + k); d.setHours(12, 0, 0, 0)
    if (d.getDay() === 0 || d.getDay() === 6) continue
    if (k === 0 && at(d, tVolta) + dur < now) continue // hoje já foi
    const ida = legAt([home, work], at(d, tIda), dur, now, probTh), volta = legAt([work, home], at(d, tVolta), dur, now, probTh)
    if (!ida && !volta) break
    out.push({ day: d.getTime(), label: k === 0 ? 'Hoje' : k === 1 ? 'Amanhã' : `${WD[d.getDay()]} ${d.getDate()}`, ida, volta })
  }
  return out
}
