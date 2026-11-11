import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'
import { useTrip, type SheetState } from '../store/trip'

const mq = typeof window !== 'undefined' ? window.matchMedia('(max-width: 999px)') : null
const ORDER: SheetState[] = ['full', 'half', 'peek']

/** Gaveta do celular: o mapa fica por trás em tela cheia e o painel desliza por cima. No desktop vira a coluna da direita. */
export function Sheet({ children, contentKey }: { children: ReactNode; contentKey: unknown }) {
  const ref = useRef<HTMLDivElement>(null)
  const state = useTrip(s => s.sheet)
  const y = useRef(0)

  function stops() {
    const el = ref.current!, H = el.offsetHeight, hero = el.querySelector<HTMLElement>('#hero')
    const peekVis = Math.min(H * 0.58, hero ? hero.offsetTop + hero.offsetHeight + 14 : H * 0.4)
    const peek = Math.max(0, Math.round(H - peekVis))
    return { full: 0, half: Math.max(0, Math.min(Math.round(H * 0.3), peek - 90)), peek }
  }
  function apply(v: number, anim = true) {
    const el = ref.current; if (!el) return
    y.current = v
    el.classList.toggle('dragging', !anim)
    el.style.transform = `translateY(${v}px)`
    const vis = Math.max(0, el.offsetHeight - v)
    document.documentElement.style.setProperty('--sheet', vis + 'px')
    useTrip.getState().set({ sheetVisible: vis })
  }
  function place(s: SheetState) {
    const el = ref.current; if (!el) return
    if (!mq?.matches) { el.style.transform = ''; el.classList.remove('full'); document.documentElement.style.setProperty('--sheet', '0px'); useTrip.getState().set({ sheetVisible: 0 }); return }
    el.classList.toggle('full', s === 'full'); if (s !== 'full') el.scrollTop = 0
    apply(stops()[s])
  }

  useLayoutEffect(() => { place(state) }, [state, contentKey]) // eslint-disable-line react-hooks/exhaustive-deps
  // no desktop o painel rola sozinho: ao abrir ou fechar um trajeto, volta para o topo
  const mode = useTrip(s => s.mode)
  useEffect(() => { if (!mq?.matches && ref.current) ref.current.scrollTop = 0 }, [mode])
  useEffect(() => {
    const onChange = () => place(useTrip.getState().sheet)
    mq?.addEventListener('change', onChange); window.addEventListener('resize', onChange)
    return () => { mq?.removeEventListener('change', onChange); window.removeEventListener('resize', onChange) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // gestos de arrastar (touch, para poder impedir a rolagem quando a gaveta é que deve mover)
  useEffect(() => {
    const el = ref.current; if (!el) return
    let d: { x0: number; y0: number; base: number; active: boolean; lastY: number; lastT: number; v: number } | null = null
    const cur = () => useTrip.getState().sheet
    const start = (e: TouchEvent) => { if (!mq?.matches || e.touches.length !== 1) return; const t = e.touches[0]; d = { x0: t.clientX, y0: t.clientY, base: y.current, active: false, lastY: t.clientY, lastT: performance.now(), v: 0 } }
    const move = (e: TouchEvent) => {
      if (!d) return
      const t = e.touches[0], dy = t.clientY - d.y0, dx = t.clientX - d.x0
      if (!d.active) {
        if (Math.abs(dy) < 7) return
        if (Math.abs(dx) > Math.abs(dy) || (cur() === 'full' && (el.scrollTop > 0 || dy < 0))) { d = null; return }
        d.active = true; d.y0 = t.clientY; d.base = y.current
      }
      e.preventDefault()
      const now = performance.now()
      apply(Math.max(0, Math.min(stops().peek + 40, d.base + (t.clientY - d.y0))), false)
      d.v = (t.clientY - d.lastY) / Math.max(1, now - d.lastT); d.lastY = t.clientY; d.lastT = now
    }
    const end = () => {
      if (!d?.active) { d = null; return }
      const st = stops(), near = ORDER.reduce((b, k) => Math.abs(st[k] - y.current) < Math.abs(st[b] - y.current) ? k : b, 'peek' as SheetState)
      let target = near
      if (Math.abs(d.v) > 0.45) {
        const i = ORDER.indexOf(cur())
        target = d.v > 0 ? ORDER[Math.min(2, i + 1)] : ORDER[Math.max(0, i - 1)]
        if (d.v > 0 && y.current > st[target]) target = ORDER[Math.min(2, ORDER.indexOf(target) + 1)]
      }
      d = null
      if (target === cur()) place(target); else useTrip.getState().set({ sheet: target })
    }
    el.addEventListener('touchstart', start, { passive: true })
    el.addEventListener('touchmove', move, { passive: false })
    el.addEventListener('touchend', end)
    return () => { el.removeEventListener('touchstart', start); el.removeEventListener('touchmove', move); el.removeEventListener('touchend', end) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const cycle = () => useTrip.getState().set({ sheet: state === 'peek' ? 'half' : state === 'half' ? 'full' : 'peek' })
  return (
    <div className="side" id="sheet" ref={ref}>
      <button className="grab" id="grab" type="button" aria-label="Expandir ou recolher o painel" onClick={cycle} />
      {children}
    </div>
  )
}
