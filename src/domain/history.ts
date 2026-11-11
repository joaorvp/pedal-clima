export interface RideRecord { km: number; mins: number; avg: number; rain: number; wh: number | null; dest: string; at: number }

/** Totais de um período: km, pedais, tempo e quantos foram secos. */
export function totals(list: RideRecord[], from: number) {
  const r = list.filter(x => x.at >= from)
  return { rides: r.length, km: r.reduce((s, x) => s + x.km, 0), mins: r.reduce((s, x) => s + x.mins, 0), dry: r.filter(x => x.rain < 0.1).length }
}
/** Início da semana (segunda, 0h) e do mês, no horário do aparelho. */
export function periodStarts(now = new Date()) {
  const d = new Date(now); d.setHours(0, 0, 0, 0)
  const week = new Date(d); week.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  const month = new Date(d.getFullYear(), d.getMonth(), 1)
  return { week: week.getTime(), month: month.getTime() }
}

const WEEK = 7 * 24 * 3600e3

/** Km e pedais de cada uma das últimas n semanas (segunda a domingo), da mais antiga para a atual. */
export function weekly(list: RideRecord[], now = new Date(), n = 8) {
  const cur = periodStarts(now).week
  return Array.from({ length: n }, (_, k) => {
    // semanas pelo calendário (horário de verão não desloca o início)
    const d = new Date(cur); d.setDate(d.getDate() - (n - 1 - k) * 7)
    const start = d.getTime(), e = new Date(d); e.setDate(d.getDate() + 7)
    const r = list.filter(x => x.at >= start && x.at < e.getTime())
    return { start, km: r.reduce((s, x) => s + x.km, 0), rides: r.length, wet: r.filter(x => x.rain >= 0.1).length }
  })
}

/** Média de porta a porta (km/h) dos pedais no intervalo; null sem pedais válidos. */
export function avgSpeed(list: RideRecord[], from: number, to = Infinity): number | null {
  const r = list.filter(x => x.at >= from && x.at < to && x.mins > 0 && x.km > 0 && x.km / (x.mins / 60) < 70)
  const km = r.reduce((s, x) => s + x.km, 0), h = r.reduce((s, x) => s + x.mins, 0) / 60
  return r.length && h > 0 ? km / h : null
}

/** Média desta semana comparada com as 4 anteriores (para "↑ 0,6 km/h"). */
export function speedTrend(list: RideRecord[], now = new Date()) {
  const wk = periodStarts(now).week
  const cur = avgSpeed(list, wk), before = avgSpeed(list, wk - 4 * WEEK, wk)
  return { cur, before, diff: cur != null && before != null ? cur - before : null }
}
