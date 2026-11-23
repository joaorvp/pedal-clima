import { Lightbulb } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSettings } from '../store/settings'
import { useTrip } from '../store/trip'

/**
 * Dicas de uso, uma de cada vez e uma vez só: gestos que não dá para adivinhar olhando a tela
 * (puxar a gaveta, segurar no mapa, tocar e arrastar a rota). Nunca durante o pedal.
 */
interface Hint { id: string; mode: 'explore' | 'trip'; mobileOnly?: boolean; text: (touch: boolean) => string }
const HINTS: Hint[] = [
  { id: 'sheet', mode: 'explore', mobileOnly: true, text: () => 'Puxe a gaveta para cima para ver o clima de onde você está, os avisos e mais opções.' },
  { id: 'map-hold', mode: 'explore', text: t => `${t ? 'Segure o dedo' : 'Clique com o botão direito'} no mapa para ir até um ponto, salvar um lugar ou dizer onde você está (quando a localização erra).` },
  { id: 'route-drag', mode: 'trip', text: t => `${t ? 'Toque' : 'Clique'} numa rota cinza no mapa para escolhê-la. Para ir por outro caminho, ${t ? 'toque' : 'clique'} na rota escolhida e arraste o ponto.` },
]

const mq = (q: string) => typeof window !== 'undefined' && !!window.matchMedia?.(q).matches

export function Hints({ blocked }: { blocked: boolean }) {
  const seen = useSettings(s => s.hintsSeen), onboarded = useSettings(s => s.onboarded)
  const mode = useTrip(s => s.mode), ride = useTrip(s => s.ride), landing = useTrip(s => s.landing), pick = useTrip(s => s.pickMode)
  const places = useTrip(s => s.placesOpen), history = useTrip(s => s.historyOpen), routes = useTrip(s => s.routes.length), sheet = useTrip(s => s.sheet)
  const mobile = mq('(max-width: 999px)'), touch = mq('(pointer: coarse)')
  const next = HINTS.find(h => h.mode === mode && !seen.includes(h.id) && (!h.mobileOnly || mobile) && (h.mode !== 'trip' || routes > 1))
  // no celular, só com a gaveta baixa (as dicas falam do mapa e ficam logo acima da gaveta)
  const free = onboarded && !landing && !ride && !pick && !places && !history && !blocked && (!mobile || sheet === 'peek')
  // espera a tela assentar antes de mostrar (sem piscar enquanto carrega)
  const [ready, setReady] = useState<string | null>(null)
  const key = free && next ? next.id : null
  useEffect(() => { if (!key) return; const t = setTimeout(() => setReady(key), 1500); return () => clearTimeout(t) }, [key])
  if (!key || ready !== key || !next) return null
  const done = () => useSettings.getState().patch({ hintsSeen: [...useSettings.getState().hintsSeen, next.id] })
  return (
    <div className="hint" role="status" id="hint" data-hint={next.id}>
      <Lightbulb className="i" aria-hidden="true" /><p>{next.text(touch)}</p>
      <button className="btn" type="button" id="hint-ok" onClick={done}>Entendi</button>
    </div>
  )
}
