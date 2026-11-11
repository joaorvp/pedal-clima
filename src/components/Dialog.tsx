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
      onClose={onClose} onClick={e => { if (e.target === ref.current) onClose() }}>
      {open && children}
    </dialog>
  )
}
