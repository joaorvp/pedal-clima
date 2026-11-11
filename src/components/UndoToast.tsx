import { RotateCcw } from 'lucide-react'
import { useUndo } from '../store/undo'

export function UndoToast() {
  const { msg, action, id } = useUndo()
  if (!msg || !action) return null
  return (
    <div className="undo" role="status" key={id}>
      <span>{msg}</span>
      <button type="button" id="undo" onClick={() => { action(); useUndo.getState().clear() }}><RotateCcw className="i" />Desfazer</button>
    </div>
  )
}
