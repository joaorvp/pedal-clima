/** localStorage com falha silenciosa (modo privado, cota cheia). */
export function readJson<T>(key: string): T | null {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) as T : null } catch { return null }
}
export function writeJson(key: string, value: unknown): boolean {
  try { localStorage.setItem(key, JSON.stringify(value)); return true } catch { return false }
}
export function removeKey(key: string) { try { localStorage.removeItem(key) } catch { /* ignora */ } }
