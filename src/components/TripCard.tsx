import { useMemo } from 'react'
import { placeName, timelineGroups } from '../domain/advice'
import { fmt1, hhmm } from '../domain/format'
import { CATS, cat, evaluate, hourlyAt } from '../domain/weather'
import { useLabels, useTripView } from '../hooks/useTripView'
import { curPlace, destPt, useSettings } from '../store/settings'
import { useTrip } from '../store/trip'

const color = (c: number) => `var(${CATS[c].color})`

export function TripCard({ onEdit, onAddPlace }: { onEdit: () => void; onAddPlace: () => void }) {
  const view = useTripView()
  const labels = useLabels()
  const ride = useTrip(s => s.ride)
  const s = useSettings()
  const place = curPlace(s)
  const nameOf = (k: 'home' | 'work') => k === 'work' && place ? place.name : s.names[k] || (k === 'home' ? 'Casa' : 'Trabalho')
  const dir = useTrip(st => st.dir)
  const from = dir === 'ida' ? nameOf('home') : nameOf('work'), to = dir === 'ida' ? nameOf('work') : nameOf('home')

  const a = dir === 'ida' ? s.home : destPt(s), b = dir === 'ida' ? destPt(s) : s.home, f = (p: [number, number]) => p[0] + ',' + p[1]
  const g = new URLSearchParams({ api: '1', origin: f(a), destination: f(b), travelmode: 'bicycling' })
  if (s.via) g.set('waypoints', f(s.via))

  return (
    <section className="card">
      <h2>Seu trajeto, minuto a minuto <span className="aside num" id="tl-dist">{view ? fmt1(view.route.total) + ' km' : ''}</span></h2>
      <button className="trip" type="button" id="trip" onClick={onEdit}>
        <span className="lb">DE</span><span className="nm" id="trip-a">{from}</span>
        <span className="lb">PARA</span><span className="nm" id="trip-b">{to}</span>
        <span className="ed">Editar</span>
      </button>
      <div className="dests" id="dests" role="radiogroup" aria-label="Destino">
        <button type="button" role="radio" aria-checked={!s.destId} data-id="" onClick={() => s.patch({ destId: null })}>Trabalho</button>
        {s.places.map(p => <button key={p.id} type="button" role="radio" aria-checked={s.destId === p.id} data-id={p.id} onClick={() => s.patch({ destId: p.id })}>{p.name}</button>)}
        <button type="button" className="add" id="dest-add" onClick={onAddPlace}>+ Lugar</button>
      </div>
      <div className="open-in">
        <a className="btn" id="open-gmaps" href={'https://www.google.com/maps/dir/?' + g} target="_blank" rel="noopener">Abrir no Google Maps</a>
        <a className="btn" id="open-waze" href={`https://waze.com/ul?ll=${f(b)}&navigate=yes`} target="_blank" rel="noopener">Abrir no Waze</a>
      </div>
      <Routes />
      {view && <>
        <div className="routebar" id="routebar" aria-hidden="true">
          {view.ev.segs.map((sg, i) => <i key={i} style={{ width: (sg.to - sg.from) / view.route.total * 100 + '%', background: color(cat(sg.rate)) }} />)}
        </div>
        <div className="routebar-lbl"><span id="rb-a">{labels.from}</span><span id="rb-b">{labels.to}</span></div>
      </>}
      <div className="legend inline" aria-label="Legenda">
        {['seco', 'garoa', 'moderada', 'forte', 'muito forte'].map((l, i) => <span key={l}><i style={{ background: color(i) }} />{l}</span>)}
      </div>
      {view && <Timeline />}
      {view?.prof && <Elevation />}
      {!view && ride == null && <p className="note">A linha do tempo aparece quando a previsão carregar.</p>}
    </section>
  )
}

function Routes() {
  const routes = useTrip(s => s.routes), sel = useTrip(s => s.sel), dir = useTrip(s => s.dir)
  const dep = useTrip(s => s.dep), now = useTrip(s => s.now), ride = useTrip(s => s.ride)
  const speed = useSettings(s => s.speed), lastT = ride?.last?.t
  const evs = useMemo(() => routes.map(r => r.wx ? evaluate(r, dir, lastT ?? dep ?? now, speed) : null), [routes, dir, dep, now, lastT, speed])
  if (routes.length < 2 || evs.some(e => !e)) return null
  const ex = evs.map(e => e!.exposure), du = evs.map(e => e!.dur)
  const dryI = ex.indexOf(Math.min(...ex)), fastI = du.indexOf(Math.min(...du))
  const dry = Math.max(...ex) - ex[dryI] >= 0.1 && ex.filter(x => x - ex[dryI] < 0.05).length === 1 ? dryI : -1
  const fast = [...du].sort((a, b) => a - b)[1] - du[fastI] >= 120e3 ? fastI : -1
  return (
    <div className="routes" id="routes" role="radiogroup" aria-label="Rotas">
      {routes.map((r, i) => { const e = evs[i]!; return (
        <button key={i} className="rt" type="button" role="radio" aria-checked={i === sel} data-i={i} onClick={() => useTrip.getState().selectRoute(i)}>
          <span className="rd" />
          <span className="nm">{r.name}{(i === dry || i === fast) && <span className="badges">{i === dry && <span className="badge">mais seca</span>}{i === fast && <span className="badge fast">mais rápida</span>}</span>}</span>
          <span className="rain">{e.exposure < 0.05 ? '0 mm' : fmt1(e.exposure) + ' mm'}<small>chuva</small></span>
          <span className="dt">{Math.round(e.dur / 60000)} min · {fmt1(r.total)} km{r.profile === 'main' ? ' · vias principais' : ''}</span>
        </button>
      ) })}
    </div>
  )
}

function Timeline() {
  const view = useTripView()!, ride = useTrip(s => s.ride), speed = useSettings(s => s.speed)
  const { ev, ctx, route } = view
  const groups = timelineGroups(ev), w0 = route.wx?.[0]
  const temp0 = w0 ? hourlyAt(w0, ev.depMs, 'temperature_2m') : null
  const rd = ride?.pos ? ride.d : null
  return (
    <ol className="tl" id="timeline">
      {groups.map((g, k) => {
        const len = g.to - g.from, mins = Math.round(len / (speed || 22) * 60)
        let desc = g.c === 0 ? (g.prob >= 30 ? `seco · ${g.prob}% de chance de chuva` : 'seco') : `${CATS[g.c].label} · até ${fmt1(g.max)} mm/h`
        if (k === 0 && temp0 != null) desc += ` · ${Math.round(temp0)} °C`
        const cls = rd == null ? '' : g.to <= rd ? 'past' : g.from <= rd ? 'here' : ''
        return (
          <li key={k} className={cls} style={{ ['--seg' as string]: color(g.c) }}>
            <span className="t">{hhmm(g.t)}</span><span className="rail"><span className="dot" /></span>
            <div className="what"><b>{k === 0 ? placeName(0, ctx) : placeName(g.from, ctx)}</b><small>{desc} · {fmt1(len)} km, ~{mins} min</small></div>
          </li>
        )
      })}
      <li className="end"><span className="t">{hhmm(ev.arr)}</span><span className="rail"><span className="dot" /></span>
        <div className="what"><b>{placeName(route.total, ctx)}</b><small>{fmt1(route.total)} km no total</small></div></li>
    </ol>
  )
}

function Elevation() {
  const view = useTripView()!, ride = useTrip(s => s.ride)
  const prof = view.prof!, bt = view.battery, total = view.route.total
  const W = 600, H = 110, L0 = 66, R0 = 8, T0 = 8, B0 = 20
  const zs = prof.map(p => p.z), zmin = Math.floor(Math.min(...zs) / 10) * 10, zmax = Math.max(zmin + 40, Math.ceil(Math.max(...zs) / 10) * 10)
  const x = (d: number) => L0 + d / total * (W - L0 - R0), y = (z: number) => T0 + (H - T0 - B0) * (1 - (z - zmin) / (zmax - zmin))
  const line = prof.map(p => `${x(p.km).toFixed(1)},${y(p.z).toFixed(1)}`).join(' ')
  const step = total > 20 ? 5 : 2, ticks: number[] = []
  for (let d = 0; d <= total; d += step) ticks.push(d)
  const here = ride?.pos ? prof.reduce((b, p) => Math.abs(p.km - ride.d) < Math.abs(b.km - ride.d) ? p : b, prof[0]) : null
  const pct = Math.min(100, bt.pct)
  return (
    <div className="elev" id="elev">
      <div className="elev-head"><b>Relevo e bateria</b><span className="num" id="elev-sum">↗ {Math.round(bt.up)} m · ↘ {Math.round(bt.down)} m</span></div>
      <svg id="elev-svg" viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Perfil de altitude do trajeto">
        {[zmin, zmax].map((z, i) => <g key={z}><line x1={L0} x2={W - R0} y1={y(z)} y2={y(z)} stroke="var(--line)" strokeDasharray="2 4" /><text x={L0 - 6} y={y(z) + (i ? 9 : -2)} textAnchor="end">{z} m</text></g>)}
        {ticks.map(d => <text key={d} x={x(d)} y={H - 5} textAnchor="middle">{d}</text>)}
        <polygon points={`${x(0)},${y(zmin)} ${line} ${x(total)},${y(zmin)}`} fill="var(--link)" fillOpacity=".12" />
        <polyline points={line} fill="none" stroke="var(--link)" strokeWidth={2} strokeLinejoin="round" />
        {here && ride && <circle cx={x(ride.d)} cy={y(here.z)} r={5} fill="#2b7fff" stroke="#fff" strokeWidth={2} />}
      </svg>
      <div className="batt"><div className="batt-bar"><i id="batt-fill" className={bt.pct >= 95 ? 'bad' : bt.pct >= 70 ? 'warn' : ''} style={{ width: pct + '%' }} /></div><span className="num" id="batt-txt">~{bt.pct}% da bateria · {Math.round(bt.wh)} Wh</span></div>
      <p className="note" style={{ marginTop: 6 }}>Estimativa a partir da distância, das subidas e do vento. Ajuste a bateria e o consumo em Ajustes.</p>
    </div>
  )
}
