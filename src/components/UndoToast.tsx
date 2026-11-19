import { ArrowRight, RotateCcw } from 'lucide-react'
import { useUndo } from '../store/undo'

export function UndoToast() {
  const { msg, action, id, label } = useUndo()
  if (!msg || !action) return null
  return (
    <div className="undo" role="status" key={id}>
      <span>{msg}</span>
      <button type="button" id="undo" onClick={() => { action(); useUndo.getState().clear() }}>{label === 'Desfazer' ? <RotateCcw className="i" /> : <ArrowRight className="i" />}{label}</button>
    </div>
  )
}
