import { create } from 'zustand'

/** Aviso curto com "Desfazer" (lugar removido, trajeto fechado...). */
interface UndoState { msg: string; action: (() => void) | null; id: number; show: (msg: string, action: () => void) => void; clear: () => void }
let timer: ReturnType<typeof setTimeout> | null = null
export const useUndo = create<UndoState>()(set => ({
  msg: '', action: null, id: 0,
  show: (msg, action) => {
    if (timer) clearTimeout(timer)
    set(s => ({ msg, action, id: s.id + 1 }))
    timer = setTimeout(() => set({ msg: '', action: null }), 6000)
  },
  clear: () => { if (timer) clearTimeout(timer); set({ msg: '', action: null }) },
}))
