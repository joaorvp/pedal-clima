import { PictureInPicture2, Volume2, VolumeX } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { rideVerdict } from '../domain/advice'
import { fmt1, hhmm } from '../domain/format'
import { cat } from '../domain/weather'
import { armPip, disarmPip, openPip, pipSupported, setPipPainter } from '../hooks/pip'
import { rideSpeed, useTripView } from '../hooks/useTripView'
import { canSpeak, say, spokenDistance } from '../hooks/voice'
import { baseSpeed, useSettings } from '../store/settings'
import { endpointName, useTrip } from '../store/trip'

// cores fixas (a janela flutuante não segue o tema do app)
const RAIN = ['#f0ad1c', '#79c2e6', '#2e84d4', '#7c5cf0', '#e24aa6']
const LEVEL = { ok: '#5cc47c', warn: '#f0a43a', bad: '#ef6b60' }

/** Durante o pedal: botão de encerrar, janela flutuante com o painel ao vivo e avisos falados. */
export function RideTools({ endButton }: { endButton: ReactNode }) {
  const view = useTripView()
  const ride = useTrip(s => s.ride), dest = useTrip(s => s.dest), arrived = useTrip(s => s.arrived)
  const speed = useSettings(baseSpeed), voice = useSettings(s => s.voice)
  const [pipMsg, setPipMsg] = useState('')
  const spoken = useRef<Set<string>>(new Set())
  const riding = !!ride?.pos && !!view

  const sp = rideSpeed(ride, speed)
  const v = riding ? rideVerdict(view!.ev, view!.ctx, ride!.d, ride!.off, sp) : null
  const left = riding ? Math.max(0, view!.route.total - ride!.d) : 0
  const eta = riding ? (ride!.last?.t ?? 0) + left / sp * 3600e3 : 0
  const ahead = riding ? view!.ev.segs.find(sg => sg.to > ride!.d && sg.rate >= 0.2) : undefined
  const distRain = ahead ? Math.max(0, ahead.from - ride!.d) : null
  const storm = riding ? view!.ev.segs.some(sg => sg.to > ride!.d && sg.code >= 95) : false
  let aheadMm = 0, aheadProb = 0
  if (riding) for (const sg of view!.ev.segs) { if (sg.to <= ride!.d) continue; aheadMm += sg.rate * (sg.to - Math.max(sg.from, ride!.d)) / sp; aheadProb = Math.max(aheadProb, sg.prob) }

  // painel da janela flutuante, redesenhado a cada leitura do GPS
  useEffect(() => {
    if (!riding || !v) return
    const route = view!.route, segs = view!.ev.segs, d = ride!.d
    const painter = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      ctx.fillStyle = '#16233f'; ctx.fillRect(0, 0, w, h)
      // mapa esquemático: a rota colorida pela chuva e a bike
      const box = { x: 18, y: 18, w: 230, h: h - 36 }
      const lats = route.line.map(p => p[0]), lons = route.line.map(p => p[1])
      const minLa = Math.min(...lats), maxLa = Math.max(...lats), minLo = Math.min(...lons), maxLo = Math.max(...lons)
      const k = Math.min(box.w / Math.max(1e-6, (maxLo - minLo) * Math.cos(minLa * Math.PI / 180)), box.h / Math.max(1e-6, maxLa - minLa))
      const ox = box.x + (box.w - (maxLo - minLo) * Math.cos(minLa * Math.PI / 180) * k) / 2, oy = box.y + (box.h - (maxLa - minLa) * k) / 2
      const P = (la: number, lo: number): [number, number] => [ox + (lo - minLo) * Math.cos(minLa * Math.PI / 180) * k, oy + (maxLa - la) * k]
      ctx.fillStyle = '#1f2f52'; ctx.beginPath(); ctx.roundRect(box.x - 8, box.y - 8, box.w + 16, box.h + 16, 18); ctx.fill()
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'
      for (const sg of segs) {
        const i0 = Math.min(sg.a.ri, sg.b.ri), i1 = Math.max(sg.a.ri, sg.b.ri) + 1
        const pts = [[sg.a.lat, sg.a.lon], ...route.line.slice(i0 + 1, i1), [sg.b.lat, sg.b.lon]]
        ctx.strokeStyle = sg.to <= d ? '#56627d' : RAIN[cat(sg.rate)]; ctx.lineWidth = 9
        ctx.beginPath(); pts.forEach((p, i) => { const [x, y] = P(p[0], p[1]); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y) }); ctx.stroke()
      }
      const end = route.line[route.line.length - 1], [ex, ey] = P(end[0], end[1])
      ctx.fillStyle = '#e2662a'; ctx.beginPath(); ctx.arc(ex, ey, 9, 0, Math.PI * 2); ctx.fill()
      if (ride!.pos) {
        const [bx, by] = P(ride!.pos[0], ride!.pos[1])
        if (ride!.heading != null) {
          ctx.save(); ctx.translate(bx, by); ctx.rotate(ride!.heading * Math.PI / 180)
          ctx.fillStyle = '#82bcff'; ctx.beginPath(); ctx.moveTo(0, -26); ctx.lineTo(11, -12); ctx.lineTo(-11, -12); ctx.closePath(); ctx.fill(); ctx.restore()
        }
        ctx.fillStyle = '#ffc43d'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 4
        ctx.beginPath(); ctx.arc(bx, by, 14, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
      }
      // textos grandes
      const tx = 272, tw = w - tx - 20
      ctx.fillStyle = LEVEL[v.level]; ctx.beginPath(); ctx.roundRect(tx, 26, 8, 104, 4); ctx.fill()
      ctx.fillStyle = '#fff'; ctx.font = '800 46px "Barlow Condensed", system-ui, sans-serif'
      wrap(ctx, v.title, tx + 22, 66, tw - 22, 44, 2)
      ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.font = '500 22px Barlow, system-ui, sans-serif'
      wrap(ctx, 'até ' + (endpointName(dest) || 'o destino'), tx + 22, 160, tw - 22, 26, 1)
      ctx.fillStyle = '#82bcff'; ctx.font = '600 22px Barlow, system-ui, sans-serif'
      ctx.fillText(`chuva à frente: ${aheadMm < 0.05 ? 'seco' : fmt1(aheadMm) + ' mm'} · ${aheadProb}%`, tx + 22, 196)
      ctx.fillStyle = '#fff'; ctx.font = '700 36px "Barlow Condensed", system-ui, sans-serif'
      ctx.fillText(hhmm(eta), tx, h - 50); ctx.fillText(fmt1(left) + ' km', tx + 118, h - 50)
      ctx.fillStyle = '#ffc43d'; ctx.fillText(String(ride!.ema > 2 ? Math.round(ride!.ema) : 0), tx + 246, h - 50)
      ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.font = '500 18px Barlow, system-ui, sans-serif'
      ctx.fillText('chegada', tx, h - 22); ctx.fillText('faltam', tx + 118, h - 22); ctx.fillText('km/h', tx + 246, h - 22)
    }
    setPipPainter(painter)
    armPip(painter)
  }) // redesenha a cada render do modo pedal

  useEffect(() => { if (!ride) { disarmPip(); spoken.current.clear() } }, [ride])
  useEffect(() => () => disarmPip(), [])

  // avisos falados: uma vez cada, na hora certa
  useEffect(() => {
    if (!voice || !riding) return
    const once = (key: string, text: string) => { if (spoken.current.has(key)) return; spoken.current.add(key); say(text) }
    once('start', `Pedal iniciado. Chegada prevista às ${hhmm(eta)}.`)
    if (storm) once('storm', 'Atenção: previsão de trovoada no caminho.')
    if (distRain != null) {
      if (distRain < 0.05) once('in-rain', 'Chovendo neste trecho. Cuidado com a frenagem.')
      else if (distRain <= 0.4) once('rain-300', `Chuva em ${spokenDistance(distRain)}.`)
      else if (distRain <= 1.1) once('rain-1k', `Chuva em ${spokenDistance(distRain)}.`)
    }
  }, [voice, riding, eta, storm, distRain, ride?.offSince, ride?.last?.t]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (arrived && voice) say('Você chegou. Bom trabalho!') }, [arrived, voice])

  if (!ride) return null
  return (
    <>
      <div className="ride-tools">
        {endButton}
        {canSpeak() && <button className="btn tool" type="button" id="voice" aria-pressed={voice} aria-label={voice ? 'Desligar avisos por voz' : 'Ligar avisos por voz'}
          onClick={() => { const on = !voice; useSettings.getState().patch({ voice: on }); if (on) say('Avisos por voz ligados.') }}>
          {voice ? <Volume2 className="i" /> : <VolumeX className="i" />}<span>{voice ? 'Voz' : 'Mudo'}</span></button>}
        {pipSupported() && <button className="btn tool" type="button" id="pip" aria-label="Janela flutuante: o painel continua visível quando você sai do app"
          onClick={async () => { setPipMsg(await openPip() ? '' : 'Não deu para abrir a janela neste navegador.') }}>
          <PictureInPicture2 className="i" /><span>Janela</span></button>}
      </div>
      {pipMsg && <p className="note" style={{ margin: '6px 0 0' }}>{pipMsg}</p>}
    </>
  )
}

function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number, maxLines: number) {
  const words = text.split(' '); let line = '', n = 0
  for (let i = 0; i < words.length; i++) {
    const test = line ? line + ' ' + words[i] : words[i]
    if (ctx.measureText(test).width > maxW && line) {
      if (n === maxLines - 1) { ctx.fillText(line + '…', x, y + n * lh); return }
      ctx.fillText(line, x, y + n * lh); n++; line = words[i]
    } else line = test
  }
  ctx.fillText(line, x, y + n * lh)
}
