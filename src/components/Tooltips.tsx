import { useEffect, useLayoutEffect, useRef, useState } from 'react'

type Tip = { text: string; x: number; y: number; side: 'above' | 'below' | 'left' }

/** Texto da dica: data-tip, ou o aria-label de botões só com ícone (ou texto curto), ou o title (que deixa de virar a dica nativa). */
function tipFor(el: HTMLElement): string | null {
  if (el.title) { el.dataset.tip = el.title; el.removeAttribute('title') }
  if (el.dataset.tip) return el.dataset.tip
  const label = el.getAttribute('aria-label')
  if (label && (el.innerText ?? '').trim().length <= 6) return label
  return null
}

/**
 * Dicas que explicam o que cada botão de ícone faz: ao passar o mouse, ao focar pelo teclado
 * ou, no celular, ao segurar o dedo no botão (nesse caso o toque não aciona o botão).
 */
export function Tooltips() {
  const [tip, setTip] = useState<Tip | null>(null)
  const timer = useRef(0), current = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const target = (e: Event) => (e.target as Element | null)?.closest?.<HTMLElement>('button, a, [data-tip]') ?? null
    const show = (el: HTMLElement, delay: number) => {
      const text = tipFor(el); if (!text) return
      current.current = el
      clearTimeout(timer.current)
      timer.current = window.setTimeout(() => {
        if (current.current !== el || !el.isConnected) return
        const r = el.getBoundingClientRect()
        // botões do mapa (coluna na borda direita): a dica sai pela esquerda, sem cobrir o botão vizinho
        if (el.classList.contains('fab') && r.left > 200) setTip({ text, x: r.left - 10, y: r.top + r.height / 2, side: 'left' })
        else if (r.top < 64) setTip({ text, x: r.left + r.width / 2, y: r.bottom + 8, side: 'below' })
        else setTip({ text, x: r.left + r.width / 2, y: r.top - 8, side: 'above' })
      }, delay)
    }
    const hide = () => { clearTimeout(timer.current); current.current = null; setTip(null) }
    // segurar o dedo: depois de ~0,5 s mostra a dica e engole o clique que viria ao soltar
    let press: { x: number; y: number } | null = null, swallow = false, autoHide = 0
    const down = (e: PointerEvent) => {
      hide(); clearTimeout(autoHide); autoHide = 0; swallow = false; press = null
      if (e.pointerType !== 'touch') return
      const el = target(e); if (!el || !tipFor(el)) return
      press = { x: e.clientX, y: e.clientY }
      show(el, 500)
      const t = timer.current
      window.setTimeout(() => { if (timer.current === t && current.current === el && press) { swallow = true; navigator.vibrate?.(10); autoHide = window.setTimeout(hide, 2500) } }, 510)
    }
    const move = (e: PointerEvent) => { if (press && !swallow && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 10) { press = null; hide() } }
    const up = () => { press = null; if (!swallow) { clearTimeout(timer.current); if (!autoHide) setTip(null) } }
    const click = (e: MouseEvent) => { if (swallow) { e.preventDefault(); e.stopPropagation(); swallow = false } }
    const menu = (e: Event) => { if (current.current && target(e) === current.current) e.preventDefault() }
    const over = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      const el = target(e); if (el === current.current) return
      hide(); if (el) show(el, 350)
    }
    const focus = (e: FocusEvent) => { const el = target(e); if (el?.matches(':focus-visible')) show(el, 0) }
    document.addEventListener('pointerover', over)
    document.addEventListener('pointerdown', down, true)
    document.addEventListener('pointermove', move, true)
    document.addEventListener('pointerup', up, true)
    document.addEventListener('pointercancel', up, true)
    document.addEventListener('click', click, true)
    document.addEventListener('contextmenu', menu, true)
    document.addEventListener('focusin', focus)
    document.addEventListener('focusout', hide)
    document.addEventListener('scroll', hide, true)
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') hide() }
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('pointerover', over)
      document.removeEventListener('pointerdown', down, true)
      document.removeEventListener('pointermove', move, true)
      document.removeEventListener('pointerup', up, true)
      document.removeEventListener('pointercancel', up, true)
      document.removeEventListener('click', click, true)
      document.removeEventListener('contextmenu', menu, true)
      clearTimeout(autoHide)
      document.removeEventListener('focusin', focus)
      document.removeEventListener('focusout', hide)
      document.removeEventListener('scroll', hide, true)
      document.removeEventListener('keydown', esc)
    }
  }, [])

  // mantém a dica dentro da tela (os botões do mapa ficam colados na borda direita)
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = ref.current; if (!el || !tip) return
    if (tip.side === 'left') { el.style.translate = '-100% -50%'; return }
    const y = tip.side === 'below' ? '0' : '-100%'
    el.style.translate = `-50% ${y}`
    const r = el.getBoundingClientRect(), m = 8
    const dx = r.left < m ? m - r.left : r.right > innerWidth - m ? innerWidth - m - r.right : 0
    if (dx) el.style.translate = `calc(-50% + ${dx}px) ${y}`
  }, [tip])

  if (!tip) return null
  return (
    <div ref={ref} className="tip" role="tooltip"
      style={{ left: tip.x, top: tip.y }}>{tip.text}</div>
  )
}
