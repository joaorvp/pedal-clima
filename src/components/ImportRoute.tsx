import { ImagePlus, RotateCcw } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { lineKm } from '../domain/savedRoutes'
import { evenly, georeference, pickColor, traceRoute, type Px } from '../domain/screenshotRoute'
import { fmt1 } from '../domain/format'
import type { LatLon } from '../domain/types'
import { snapToRoads } from '../services/routing'
import { saveAsRoute } from '../store/actions'
import { useSettings } from '../store/settings'
import { Dialog } from './Dialog'
import { NameForm } from './SaveRoute'

const MAX = 900 // lado maior da imagem processada (px)
type Step = 'setup' | 'tap' | 'review'

/**
 * Importar uma rota de um print de outro app: escolha de onde e para onde, envie o print e toque no começo
 * e no fim da linha da rota. O app segue a linha, encaixa no mapa pelos dois lugares e ajusta às ruas.
 * A imagem é processada só no aparelho.
 */
export function ImportRoute({ open, onClose }: { open: boolean; onClose: (msg?: string) => void }) {
  const s = useSettings()
  const places = useMemo(() => {
    const out: { id: string; name: string; ll: LatLon }[] = []
    if (s.homeSet) out.push({ id: 'home', name: 'Casa', ll: s.home })
    if (s.workSet) out.push({ id: 'work', name: 'Trabalho', ll: s.work })
    s.places.forEach(p => out.push({ id: p.id, name: p.name, ll: [p.lat, p.lon] }))
    return out
  }, [s.homeSet, s.workSet, s.home, s.work, s.places])
  const [from, setFrom] = useState(''), [to, setTo] = useState('')
  const [img, setImg] = useState<HTMLImageElement | null>(null), [url, setUrl] = useState('')
  const [step, setStep] = useState<Step>('setup')
  const [taps, setTaps] = useState<Px[]>([]) // em pixels da imagem processada
  const [px, setPx] = useState<Px[] | null>(null), [line, setLine] = useState<LatLon[] | null>(null)
  const [msg, setMsg] = useState(''), [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const A = places.find(p => p.id === (from || places[0]?.id)), B = places.find(p => p.id === (to || places[1]?.id))

  useEffect(() => () => { if (url) URL.revokeObjectURL(url) }, [url])
  function reset() { setStep('setup'); setTaps([]); setPx(null); setLine(null); setMsg(''); setImg(null); setUrl('') }
  function close(m?: string) { reset(); onClose(m) }

  const scale = img ? Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight)) : 1
  const W = img ? Math.round(img.naturalWidth * scale) : 0, H = img ? Math.round(img.naturalHeight * scale) : 0

  async function process(start: Px, end: Px) {
    if (!img || !A || !B) return
    setBusy(true); setMsg('')
    try {
      const c = document.createElement('canvas'); c.width = W; c.height = H
      const ctx = c.getContext('2d', { willReadFrequently: true })!; ctx.drawImage(img, 0, 0, W, H)
      const data = ctx.getImageData(0, 0, W, H)
      const color = pickColor(data, start[0], start[1])
      if (!color) { setMsg('Não achei a linha da rota nesse ponto. Toque bem em cima da linha colorida, no começo dela.'); setTaps([]); return }
      const path = traceRoute(data, color, start, end)
      if (!path) { setMsg('Não consegui seguir a linha até o fim. Confira se a rota inteira aparece no print, sem partes cobertas, e toque de novo.'); setTaps([]); return }
      const geo = georeference(path, start, end, A.ll, B.ll)
      setPx(path); setStep('review')
      // encaixa nas ruas; se o resultado fugir muito do traçado, fica com o traçado do print
      const snapped = await snapToRoads(evenly(geo, 12))
      const ok = snapped && lineKm(snapped) < lineKm(geo) * 1.5 && lineKm(snapped) > lineKm(geo) * 0.7
      setLine(ok ? snapped : geo)
      if (!ok) setMsg('Não deu para ajustar às ruas agora; a rota vai do jeito que está no print.')
    } finally { setBusy(false) }
  }

  function onTap(e: React.PointerEvent<HTMLDivElement>) {
    if (step !== 'tap' || busy) return
    const r = e.currentTarget.getBoundingClientRect(), p: Px = [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]
    const next = [...taps, p]; setTaps(next)
    if (next.length === 2) process(next[0], next[1])
  }

  return (
    <Dialog open={open} onClose={() => close()} className="import-dlg" labelledBy="import-title">
      <div className="dlg-head"><h2 id="import-title">Importar rota de um print</h2></div>
      <div className="dlg-body">
        {places.length < 2 ? (
          <p className="note" style={{ margin: 0 }}>Para importar, cadastre pelo menos dois lugares (por exemplo, Casa e Trabalho) em Ajustes: eles servem para encaixar o print no mapa.</p>
        ) : step === 'setup' ? <>
          <p className="note" style={{ margin: 0 }}>Funciona com prints do Google Maps, Waze, Strava e outros, mostrando a rota inteira. A imagem é lida só no seu aparelho e não é enviada a ninguém.</p>
          <div className="imp-ends">
            <label>De<select id="imp-from" value={A?.id} onChange={e => setFrom(e.target.value)}>{places.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
            <label>Para<select id="imp-to" value={B?.id} onChange={e => setTo(e.target.value)}>{places.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
          </div>
          {A?.id === B?.id && <p className="note err-text" style={{ margin: 0 }}>Escolha lugares diferentes para o começo e o fim.</p>}
          <button className="btn primary imp-pick" type="button" id="imp-file-btn" disabled={A?.id === B?.id} onClick={() => fileRef.current?.click()}><ImagePlus className="i" />Escolher o print</button>
          <input ref={fileRef} type="file" accept="image/*" hidden id="imp-file" onChange={e => {
            const f = e.target.files?.[0]; e.target.value = ''; if (!f) return
            const u = URL.createObjectURL(f), im = new Image()
            im.onload = () => { setUrl(u); setImg(im); setStep('tap'); setTaps([]) }
            im.onerror = () => { URL.revokeObjectURL(u); setMsg('Não consegui abrir essa imagem.') }
            im.src = u
          }} />
        </> : <>
          <p className="imp-hint" id="imp-hint">{step === 'tap'
            ? (taps.length === 0 ? <>1. Toque no <b>começo</b> da linha da rota, perto de <b>{A?.name}</b>.</> : <>2. Agora toque no <b>fim</b> da linha, perto de <b>{B?.name}</b>.</>)
            : busy ? 'Ajustando o caminho às ruas…' : line ? <>Rota encontrada: <b>{fmt1(lineKm(line))} km</b> de {A?.name} a {B?.name}.</> : 'Lendo o print…'}</p>
          <div className={'imp-img' + (step === 'tap' ? ' tapping' : '')} onPointerUp={onTap} style={{ aspectRatio: `${W} / ${H}`, width: `min(100%, calc(60dvh * ${(W / Math.max(1, H)).toFixed(4)}))` }}>
            <img src={url} alt="Print da rota" draggable={false} />
            <svg viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
              {px && <polyline points={px.map(p => p.join(',')).join(' ')} fill="none" stroke="#ffc43d" strokeWidth={Math.max(4, W / 120)} strokeLinecap="round" strokeLinejoin="round" opacity=".9" />}
              {taps.map((t, i) => <circle key={i} cx={t[0]} cy={t[1]} r={Math.max(7, W / 70)} fill={i ? '#e2662a' : '#fff'} stroke={i ? '#fff' : '#1b2b4b'} strokeWidth={Math.max(3, W / 200)} />)}
            </svg>
          </div>
          {msg && <p className="note" id="imp-msg" style={{ margin: 0 }}>{msg}</p>}
          {step === 'review' && line && !busy && (
            <NameForm initial={`Meu caminho ${A?.name} → ${B?.name}`} label="Nome da rota" onCancel={() => { setStep('tap'); setTaps([]); setPx(null); setLine(null); setMsg('') }}
              onSave={name => { saveAsRoute(name, line); close(`Rota "${name.trim() || 'Minha rota'}" importada. Ela aparece primeiro quando você fizer esse trajeto.`) }} />
          )}
          <div className="row imp-actions">
            <button className="btn" type="button" onClick={() => { setStep('tap'); setTaps([]); setPx(null); setLine(null); setMsg('') }}><RotateCcw className="i" />Tocar de novo</button>
            <button className="btn" type="button" onClick={reset}>Trocar o print</button>
          </div>
        </>}
      </div>
      <div className="dlg-foot"><button className="btn" type="button" onClick={() => close()}>Fechar</button></div>
    </Dialog>
  )
}
