import { hhmm, fmt1 } from './format'
import { CATS, cat, hourlyAt, rateAt } from './weather'
import type { Level, PointWeather } from './types'
import type { IconName } from './advice'

export interface LocalSummary { level: Level; icon: IconName; title: string; sub: string; temp: number | null; wind: number | null }

/** Clima onde você está, olhando a chuva a cada 15 min nas próximas 3 h. */
export function localSummary(w: PointWeather, now: number): LocalSummary {
  const step = 15 * 60e3, horizon = 12
  const rates = Array.from({ length: horizon + 1 }, (_, k) => rateAt(w, now + k * step))
  const temp = hourlyAt(w, now, 'temperature_2m'), wind = hourlyAt(w, now, 'wind_speed_10m')
  const code = hourlyAt(w, now, 'weather_code') ?? 0, day = hourlyAt(w, now, 'is_day') ?? 1
  const storm = code >= 95
  const base = { temp, wind }
  if (rates[0] >= 0.2) {
    const stop = rates.findIndex(r => r < 0.2)
    const what = CATS[cat(rates[0])].label
    return { ...base, level: rates[0] >= 4 || storm ? 'bad' : 'warn', icon: storm ? 'storm' : 'rain',
      title: storm ? 'Trovoada aqui agora' : `${what[0].toUpperCase() + what.slice(1)} aqui agora`,
      sub: stop > 0 ? `Deve parar por volta de ${hhmm(now + stop * step)}.` : 'Sem trégua nas próximas 3 h.' }
  }
  const next = rates.findIndex(r => r >= 0.2)
  if (next > 0) {
    const mins = next * 15, peak = Math.max(...rates.slice(next))
    return { ...base, level: 'warn', icon: 'rain', title: mins <= 60 ? `Chuva chegando em ~${mins} min` : `Chuva por volta de ${hhmm(now + next * step)}`,
      sub: `Seco agora. Deve vir ${CATS[cat(peak)].label}${peak >= 1 ? ` (até ${fmt1(peak)} mm/h)` : ''}.` }
  }
  return { ...base, level: 'ok', icon: code >= 3 ? 'cloud' : code >= 1 ? (day ? 'partly' : 'cloud') : (day ? 'sun' : 'cloud'),
    title: 'Seco por aqui', sub: 'Sem chuva prevista nas próximas 3 h.' }
}
