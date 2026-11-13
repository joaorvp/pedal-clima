import type { RideRecord } from './history'

/** CO₂ de um carro médio a gasolina por km (aprox. 130 g/km) e gasto aproximado de energia pedalando. */
export const CO2_KG_PER_KM = 0.13
export const KCAL_PER_MIN = 6 // moderado, ~16–18 km/h; com assistência elétrica é menos

export function impact(list: RideRecord[], from = 0) {
  const r = list.filter(x => x.at >= from)
  const km = r.reduce((s, x) => s + x.km, 0), mins = r.reduce((s, x) => s + x.mins, 0)
  return { rides: r.length, km, co2: km * CO2_KG_PER_KM, kcal: mins * KCAL_PER_MIN }
}

const dayKey = (t: number) => { const d = new Date(t); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate() }

/**
 * Sequência de dias pedalando, contando para trás a partir de hoje (ou de ontem, se ainda não pedalou hoje).
 * Sábado e domingo sem pedal não quebram a sequência (quem pedala para o trabalho folga no fim de semana).
 */
export function streak(list: RideRecord[], now = Date.now()): number {
  const days = new Set(list.map(x => dayKey(x.at)))
  const d = new Date(now); d.setHours(12, 0, 0, 0)
  if (!days.has(dayKey(d.getTime()))) d.setDate(d.getDate() - 1)
  let n = 0
  for (let guard = 0; guard < 800; guard++) {
    const k = dayKey(d.getTime()), wd = d.getDay()
    if (days.has(k)) n++
    else if (wd !== 0 && wd !== 6) break
    d.setDate(d.getDate() - 1)
  }
  return n
}

export interface Badge { id: string; title: string; detail: string }
const KM = [50, 100, 250, 500, 1000, 2500, 5000]
const RIDES = [10, 50, 100, 250, 500]
/** Conquistas já alcançadas (as maiores de cada tipo primeiro). */
export function badges(list: RideRecord[], now = Date.now()): Badge[] {
  const out: Badge[] = []
  const km = list.reduce((s, x) => s + x.km, 0), n = list.length
  const k = [...KM].reverse().find(v => km >= v); if (k) out.push({ id: 'km' + k, title: `${k.toLocaleString('pt-BR')} km`, detail: 'pedalados com o Pedágua' })
  const r = [...RIDES].reverse().find(v => n >= v); if (r) out.push({ id: 'r' + r, title: `${r} pedais`, detail: 'concluídos até o destino' })
  const wet = list.filter(x => x.rain >= 0.5).length; if (wet >= 5) out.push({ id: 'wet', title: 'Encara a chuva', detail: `${wet} pedais com chuva no caminho` })
  const dry = list.filter(x => x.rain < 0.1).length; if (dry >= 20) out.push({ id: 'dry', title: 'Mestre da janela seca', detail: `${dry} pedais sem pegar chuva` })
  const s = streak(list, now); if (s >= 5) out.push({ id: 's' + s, title: `${s} dias seguidos`, detail: 'de pedal (fim de semana não quebra)' })
  const early = list.filter(x => new Date(x.at - x.mins * 60e3).getHours() < 7).length; if (early >= 5) out.push({ id: 'early', title: 'Madrugador', detail: `${early} pedais saindo antes das 7h` })
  return out
}
