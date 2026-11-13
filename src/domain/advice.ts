import { fmt1, hhmm, lowerFirst, upperFirst } from './format'
import { CATS, cat, clearTime, darkness, hourlyAt, isRainy, pastRain } from './weather'
import type { Dir, Evaluation, Level, Route, SunTimes } from './types'
import { comfortAlerts } from './air'

export interface TripCtx {
  route: Route
  dir: Dir
  speed: number
  probTh: number
  /** "Saída de casa", "Chegada no trabalho"… */
  depLabel: string
  arrLabel: string
  now: number
}

export function placeName(d: number, c: TripCtx): string {
  const T = c.route.total, vk = c.route.viaKm != null ? (c.dir === 'ida' ? c.route.viaKm : T - c.route.viaKm) : null
  if (d < 1) return c.depLabel
  if (d > T - 1) return c.arrLabel
  if (vk != null && Math.abs(d - vk) < 1.5) return 'Ponto P'
  return 'Km ' + Math.round(d)
}
export const lowerPlace = (d: number, c: TripCtx) => lowerFirst(placeName(d, c))

/** Onde choveu mais nas últimas 3 h (pista molhada). */
export function wetInfo(c: TripCtx): { v: number; where: string } | null {
  const wx = c.route.wx; if (!wx) return null
  let best: { v: number; km: number } | null = null
  c.route.samples.forEach((s, i) => { const v = wx[i] ? pastRain(wx[i], c.now) : 0; if (!best || v > best.v) best = { v, km: s.km } })
  const b = best as { v: number; km: number } | null
  if (!b || b.v < 0.5) return null
  return { v: b.v, where: placeName(c.dir === 'ida' ? b.km : c.route.total - b.km, c) }
}

export type IconName = 'sun' | 'partly' | 'cloud' | 'rain' | 'storm' | 'road' | 'check'
export interface Verdict { level: Level; icon: IconName; title: string; sub: string }

function clearText(ev: Evaluation, c: TripCtx) {
  const t = clearTime(c.route, c.dir, ev.depMs + 60e3, c.speed)
  return t ? ` A chuva no trajeto deve passar por volta de ${hhmm(t)}.` : ' Não há janela seca nas próximas 6 h.'
}

export function verdict(ev: Evaluation, c: TripCtx): Verdict {
  const wet = wetInfo(c), first = ev.segs.find(s => s.rate >= 0.2), w0 = c.route.wx?.[0]
  const code = w0 ? hourlyAt(w0, ev.depMs, 'weather_code') ?? 0 : 0, day = w0 ? hourlyAt(w0, ev.depMs, 'is_day') ?? 1 : 1
  if (ev.storm) return { level: 'bad', icon: 'storm', title: 'Trovoada no caminho. Melhor esperar.', sub: 'Há previsão de raios em algum trecho.' + clearText(ev, c) }
  if (ev.maxRate >= 4) return { level: 'bad', icon: 'rain', title: 'Chuva forte no trajeto',
    sub: `Até ${fmt1(ev.maxRate)} mm/h${first ? ' a partir de ' + lowerPlace(first.from, c) + ', por volta de ' + hhmm(first.t) : ''}. Se puder, adie a saída.` + clearText(ev, c) }
  if (isRainy(ev, c.probTh)) return { level: 'warn', icon: 'rain', title: 'Leve a capa',
    sub: first ? `${upperFirst(CATS[cat(first.rate)].label)} a partir de ${lowerPlace(first.from, c)}, por volta de ${hhmm(first.t)}.`
      : `Até ${ev.maxProb}% de chance de chuva em algum trecho. Proteja a bateria antes de sair.` }
  if (wet) return { level: 'warn', icon: 'road', title: 'Seco agora, mas a pista está molhada',
    sub: `Choveu ${fmt1(wet.v)} mm nas últimas 3 h perto de ${lowerFirst(wet.where)}. Cuidado nas frenagens.` }
  return { level: 'ok', icon: code >= 3 ? 'cloud' : code >= 1 ? (day ? 'partly' : 'cloud') : (day ? 'sun' : 'cloud'), title: 'Pode ir tranquilo',
    sub: `Sem chuva prevista em nenhum trecho até ${hhmm(ev.arr)}.` }
}

/** Veredito do modo pedal: só o trecho que falta a partir de `d` km. */
export function rideVerdict(ev: Evaluation, c: TripCtx, d: number, off: number, speed: number): Verdict {
  const ahead = ev.segs.filter(sg => sg.to > d)
  const storm = ahead.find(sg => sg.code >= 95), rain = ahead.find(sg => sg.rate >= 0.2)
  const dist = (sg: { from: number }) => Math.max(0, sg.from - d), mins = (sg: { from: number }) => Math.round(dist(sg) / speed * 60)
  let v: Verdict = { level: 'ok', icon: 'check', title: 'Seco até a chegada', sub: 'Nenhuma chuva prevista no trecho que falta.' }
  if (storm) v = { level: 'bad', icon: 'storm', title: dist(storm) < 0.2 ? 'Trovoada no seu trecho' : `Trovoada em ${fmt1(dist(storm))} km`, sub: 'Procure abrigo seguro se começar a relampejar.' }
  else if (rain) {
    const where = lowerPlace(rain.from, c).replace(/^km/, 'no km').replace(/^ponto/, 'no ponto')
    v = { level: rain.rate >= 4 ? 'bad' : 'warn', icon: 'rain', title: dist(rain) < 0.2 ? 'Chuva no seu trecho agora' : `Chuva em ${fmt1(dist(rain))} km`,
      sub: `${upperFirst(CATS[cat(rain.rate)].label)}${dist(rain) >= 0.2 ? ` daqui a ~${mins(rain)} min, ${where}` : ''}.` }
  }
  if (off > 0.2) v.sub += ` Você está a ${Math.round(off * 1000)} m da rota.`
  return v
}

export type CheckIcon = 'bolt' | 'battery' | 'bag' | 'light' | 'check' | 'road' | 'wind' | 'uv' | 'thermo' | 'drop' | 'water' | 'shirt'
export interface CheckItem { level: Level; icon: CheckIcon; title: string; detail?: string }

export function checklist(ev: Evaluation, c: TripCtx, sun: SunTimes | null, battPct: number | null, aqi: number | null = null): CheckItem[] {
  const out: CheckItem[] = [], add = (level: Level, icon: CheckIcon, title: string, detail?: string) => out.push({ level, icon, title, detail })
  const wet = wetInfo(c), rainy = ev.exposure >= 0.15 || ev.maxRate >= 0.5 || ev.maxProb >= c.probTh - 10
  if (ev.storm) add('bad', 'bolt', 'Espere a trovoada passar', 'Na bike você é o ponto mais alto da via. Células assim costumam passar em 30 a 60 min.')
  if (rainy) {
    add('warn', 'battery', 'Capa na bateria', 'Cubra o conector e a porta de carga. Evite poças acima do eixo.')
    add('warn', 'bag', 'Capa na mochila e capa de chuva', `Até ${ev.maxProb}% de chance, ~${fmt1(ev.exposure)} mm no trajeto.`)
    add('warn', 'light', 'Luz traseira piscando', 'A visibilidade cai muito na chuva, mesmo de dia.')
  } else add('ok', 'check', 'Sem capa hoje', `Chance máxima de chuva de ${ev.maxProb}% no trajeto.`)
  if (wet) add('warn', 'road', 'Pista molhada perto de ' + lowerFirst(wet.where), 'Freie antes das curvas. Faixas pintadas e tampas de bueiro escorregam.')
  if (ev.gustMax >= 40) add('warn', 'wind', `Rajadas de até ${ev.gustMax.toFixed(0)} km/h`, 'Atenção em trechos abertos e ao lado de caminhões.')
  if (ev.head >= 12) add('warn', 'wind', `Vento contra de ~${ev.head.toFixed(0)} km/h`, 'Mais consumo de bateria e alguns minutos a mais.')
  const w0 = c.route.wx?.[0]
  const uv = w0 ? hourlyAt(w0, ev.depMs, 'uv_index') ?? 0 : 0
  const temp = w0 ? hourlyAt(w0, ev.depMs, 'apparent_temperature') ?? hourlyAt(w0, ev.depMs, 'temperature_2m') : null
  if (uv >= 8) add('warn', 'uv', `UV ${uv.toFixed(0)}, muito alto`, 'Protetor solar e manga longa.')
  const humidity = w0 ? hourlyAt(w0, ev.depMs, 'relative_humidity_2m') : null
  for (const a of comfortAlerts({ feels: temp, humidity, aqi })) add(a.level, a.icon, a.title, a.detail)
  const dk = darkness(sun, ev)
  if (dk?.kind === 'set') add('warn', 'light', dk.full ? `Já escureceu (pôr do sol às ${hhmm(dk.t)})` : `Escurece às ${hhmm(dk.t)}, você chega às ${hhmm(ev.arr)}`, 'Farol dianteiro e luz traseira ligados. Roupa clara ou refletiva ajuda.')
  if (dk?.kind === 'rise') add('warn', 'light', dk.full ? `Ainda escuro: amanhece às ${hhmm(dk.t)}` : `Amanhece às ${hhmm(dk.t)}, você sai às ${hhmm(ev.depMs)}`, 'Farol dianteiro e luz traseira ligados.')
  // água: ~500 ml por hora de pedal, mais no calor (sensação térmica acima de 25 °C)
  const water = waterMl(ev.dur, temp)
  if (water) add('ok', 'water', water.title, water.detail)
  // roupa: o vento do próprio pedal esfria; abaixo de ~16 °C de sensação, um corta-vento faz diferença
  const cloth = clothing(temp, ev.head, rainy)
  if (cloth) add('ok', 'shirt', cloth.title, cloth.detail)
  if (battPct != null && battPct >= 70) add(battPct >= 95 ? 'bad' : 'warn', 'battery', `Trajeto deve usar ~${battPct}% da bateria`, battPct >= 95 ? 'Pode não dar. Carregue antes ou use assistência mais baixa.' : 'Saia com a bateria bem carregada.')
  return out
}

/** Agrupa trechos consecutivos da mesma categoria para a linha do tempo. */
export function timelineGroups(ev: Evaluation) {
  const groups: { c: number; from: number; to: number; t: number; max: number; prob: number }[] = []
  for (const s of ev.segs) {
    const c = cat(s.rate), g = groups[groups.length - 1]
    if (g && g.c === c) { g.to = s.to; g.max = Math.max(g.max, s.rate); g.prob = Math.max(g.prob, s.prob) }
    else groups.push({ c, from: s.from, to: s.to, t: s.tA, max: s.rate, prob: s.prob })
  }
  return groups
}

/** Quanta água levar: ~500 ml/h, +150 ml/h a cada 5 °C acima de 25 °C de sensação; arredonda para 250 ml. */
export function waterMl(durMs: number, feels: number | null): { ml: number; title: string; detail: string } | null {
  const h = durMs / 3600e3
  if (h < 0.25) return null
  const perH = 500 + Math.max(0, ((feels ?? 22) - 25) / 5) * 150
  const ml = Math.max(250, Math.round(perH * h / 250) * 250)
  const hot = (feels ?? 0) >= 28
  return { ml, title: `Leve ${ml >= 1000 ? String(ml / 1000).replace('.', ',') + ' L' : ml + ' ml'} de água`,
    detail: hot ? `Calor de ${Math.round(feels!)} °C de sensação: beba aos poucos desde o começo.` : `Para ${Math.round(h * 60)} min de pedal.` }
}

/** Roupa pela sensação térmica (e vento contra), além da capa de chuva. */
export function clothing(feels: number | null, head: number, rainy: boolean): { title: string; detail: string } | null {
  if (feels == null) return null
  const f = feels - (head >= 10 ? 2 : 0) // vento contra forte esfria mais
  if (f < 10) return { title: 'Casaco, luvas e algo no pescoço', detail: `Sensação de ${Math.round(feels)} °C${head >= 10 ? ' com vento contra' : ''}: no pedal parece ainda mais frio.` }
  if (f < 16) return { title: rainy ? 'Corta-vento por baixo da capa' : 'Corta-vento ou manga longa', detail: `Sensação de ${Math.round(feels)} °C: o vento do pedal esfria nos primeiros minutos.` }
  return null
}
