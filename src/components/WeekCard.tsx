import { CalendarDays } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { hav } from '../domain/geo'
import { hhmm } from '../domain/format'
import { weekPlan, type HourlyRain, type WeekLeg } from '../domain/week'
import { fetchWeek } from '../services/openMeteo'
import { baseSpeed, useSettings } from '../store/settings'
import { useTrip } from '../store/trip'
import { Icon } from './icons'

const LEVEL = { dry: { icon: 'sun', word: 'seco' }, maybe: { icon: 'cloud', word: 'pode chover' }, rain: { icon: 'rain', word: 'chuva' }, heavy: { icon: 'storm', word: 'chuva forte' } } as const

/** Semana do pedal: ida e volta nos horários da rotina, nos próximos dias úteis (decidir com antecedência se vai de bike). */
export function WeekCard() {
  const homeSet = useSettings(s => s.homeSet), workSet = useSettings(s => s.workSet), home = useSettings(s => s.home), work = useSettings(s => s.work)
  const tIda = useSettings(s => s.tIda) || '07:00', tVolta = useSettings(s => s.tVolta) || '18:00', custom = useSettings(s => !!(s.tIda && s.tVolta))
  const probTh = useSettings(s => s.probTh), speed = useSettings(baseSpeed), now = useTrip(s => s.now)
  const [data, setData] = useState<[HourlyRain, HourlyRain] | null>(null), [err, setErr] = useState(false)
  const ready = homeSet && workSet && hav(home, work) > 0.3
  useEffect(() => {
    if (!ready) return
    let alive = true
    fetchWeek(home, work).then(d => { if (alive) { setData(d); setErr(false) } }, () => { if (alive) setErr(true) })
    return () => { alive = false }
  }, [ready, home, work, Math.floor(now / 3600e3)]) // eslint-disable-line react-hooks/exhaustive-deps
  const durMin = Math.round(hav(home, work) * 1.3 / Math.max(8, speed) * 60)
  const plan = useMemo(() => data ? weekPlan(data[0], data[1], now, tIda, tVolta, durMin, probTh) : [], [data, now, tIda, tVolta, durMin, probTh])
  if (!ready || (!plan.length && !err)) return null
  return (
    <section className="card week" id="week" aria-labelledby="week-title">
      <h2 id="week-title"><CalendarDays className="i" />Semana do pedal<span className="aside num">ida {tIda} · volta {tVolta}</span></h2>
      {err && !plan.length ? <p className="note" style={{ margin: 0 }}>Sem conexão para a previsão da semana agora.</p> : (
        <ul className="week-list">
          {plan.map(d => (
            <li key={d.day}><span className="wk-day">{d.label}</span><Leg l={d.ida} name="ida" /><Leg l={d.volta} name="volta" /></li>
          ))}
        </ul>
      )}
      <p className="note" style={{ margin: '8px 0 0' }}>{custom ? 'Pelos horários da sua rotina (Ajustes → Rotina e rota).' : 'Horários padrão (7h e 18h): ajuste em Ajustes → Rotina e rota.'} Mais de 2 dias à frente, a previsão é só tendência.</p>
    </section>
  )
}

function Leg({ l, name }: { l: WeekLeg | null; name: string }) {
  if (!l) return <span className="wk-leg none">{name} · –</span>
  const v = LEVEL[l.level]
  return (
    <span className={'wk-leg ' + l.level + (l.past ? ' past' : '')} title={`${name} às ${hhmm(l.t)}: ${v.word}, ${l.prob}% de chance${l.mm >= 0.2 ? `, até ${l.mm.toFixed(1).replace('.', ',')} mm/h` : ''}`}>
      <Icon name={v.icon} /><span><b>{name}</b> {l.level === 'maybe' ? `${l.prob}%` : l.level === 'heavy' ? 'forte' : v.word}</span>
    </span>
  )
}
