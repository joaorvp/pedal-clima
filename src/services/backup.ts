import { CURRENT_APP_VERSION } from '../domain/changelog'
import { parseSettings, settingsSchema, type Settings } from '../store/settings'

/** Backup dos seus dados (lugares, rotina, ajustes, histórico) num arquivo JSON que você guarda onde quiser. */
export interface Backup { app: 'pedagua'; version: string; exportedAt: number; settings: Settings }

export function makeBackup(s: Settings, now = Date.now()): { name: string; text: string } {
  const data: Backup = { app: 'pedagua', version: CURRENT_APP_VERSION, exportedAt: now, settings: settingsSchema.parse(s) }
  const d = new Date(now), ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return { name: `pedagua-backup-${ymd}.json`, text: JSON.stringify(data, null, 1) }
}

/** Lê um arquivo de backup; devolve os dados ou uma mensagem de erro em português. */
export function readBackup(text: string): { ok: true; settings: Settings; exportedAt: number } | { ok: false; error: string } {
  let raw: unknown
  try { raw = JSON.parse(text) } catch { return { ok: false, error: 'Este arquivo não é um backup do Pedágua.' } }
  const b = raw as Partial<Backup> | null
  if (!b || b.app !== 'pedagua' || typeof b.settings !== 'object' || b.settings === null) return { ok: false, error: 'Este arquivo não é um backup do Pedágua.' }
  try { return { ok: true, settings: parseSettings(b.settings), exportedAt: typeof b.exportedAt === 'number' ? b.exportedAt : 0 } }
  catch { return { ok: false, error: 'O backup está danificado e não pôde ser lido.' } }
}

export function downloadText(name: string, text: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
