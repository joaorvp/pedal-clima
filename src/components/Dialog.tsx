import { useEffect, useRef, type ReactNode } from 'react'

/** <dialog> nativo controlado pelo React (foco, Esc e fundo escurecido do próprio navegador). */
export function Dialog({ open, onClose, children, className, labelledBy }: { open: boolean; onClose: () => void; children: ReactNode; className?: string; labelledBy: string }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current; if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog ref={ref} className={className} aria-labelledby={labelledBy} id={labelledBy.replace('-title', '')}
      // o evento de fechar de um diálogo aberto dentro deste sobe pela árvore do React: só fecha se for deste
      onClose={e => { if (e.target === e.currentTarget) onClose() }} onClick={e => { if (e.target === ref.current) onClose() }}>
      {open && children}
    </dialog>
  )
}
