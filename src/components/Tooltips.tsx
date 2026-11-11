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
 * Dicas ao passar o mouse (ou ao focar pelo teclado) nos botões: explicam o que cada ícone faz.
 * No toque não aparecem; ali os botões já têm rótulo para leitores de tela e o ícone é o mesmo.
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
    const over = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      const el = target(e); if (el === current.current) return
      hide(); if (el) show(el, 350)
    }
    const focus = (e: FocusEvent) => { const el = target(e); if (el?.matches(':focus-visible')) show(el, 0) }
    document.addEventListener('pointerover', over)
    document.addEventListener('pointerdown', hide, true)
    document.addEventListener('focusin', focus)
    document.addEventListener('focusout', hide)
    document.addEventListener('scroll', hide, true)
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') hide() }
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('pointerover', over)
      document.removeEventListener('pointerdown', hide, true)
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
