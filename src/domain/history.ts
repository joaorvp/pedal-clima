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
