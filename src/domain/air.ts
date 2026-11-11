import type { Level } from './types'

/** Qualidade do ar pelo índice americano (US AQI), em palavras. */
export function airLabel(aqi: number): { word: string; level: Level } {
  if (aqi <= 50) return { word: 'bom', level: 'ok' }
  if (aqi <= 100) return { word: 'moderado', level: 'ok' }
  if (aqi <= 150) return { word: 'ruim para sensíveis', level: 'warn' }
  if (aqi <= 200) return { word: 'ruim', level: 'bad' }
  return { word: 'muito ruim', level: 'bad' }
}
/** Avisos de calor, ar e umidade para quem vai pedalar. */
export function comfortAlerts(o: { feels: number | null; humidity: number | null; aqi: number | null }) {
  const out: { level: Level; title: string; detail: string; icon: 'thermo' | 'drop' | 'wind' }[] = []
  if (o.feels != null && o.feels >= 32) out.push({ level: o.feels >= 36 ? 'bad' : 'warn', icon: 'thermo', title: `Calor forte: sensação de ${Math.round(o.feels)} °C`, detail: 'Leve água e diminua o ritmo nas subidas.' })
  if (o.humidity != null && o.humidity <= 30) out.push({ level: o.humidity <= 20 ? 'bad' : 'warn', icon: 'drop', title: `Umidade em ${Math.round(o.humidity)}%`, detail: 'Ar muito seco: leve água e protetor labial.' })
  if (o.aqi != null && o.aqi > 100) out.push({ level: o.aqi > 150 ? 'bad' : 'warn', icon: 'wind', title: `Ar ${airLabel(o.aqi).word} (índice ${Math.round(o.aqi)})`, detail: o.aqi > 150 ? 'Se puder, evite esforço forte hoje.' : 'Quem tem asma ou rinite pode sentir.' })
  return out
}
