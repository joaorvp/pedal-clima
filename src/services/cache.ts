/**
 * localStorage com falha silenciosa (modo privado, cota cheia) e limpeza das cópias temporárias.
 *
 * O navegador dá poucos MB por site. Rotas e altitudes calculadas são guardadas como cópias temporárias
 * (para abrir rápido e funcionar sem sinal), mas sem limite elas acabavam enchendo o espaço e os dados do
 * usuário deixavam de ser salvos. Agora: só as cópias usadas mais recentemente ficam, e, se o espaço
 * acabar, as cópias são apagadas antes de desistir de salvar.
 */
const CACHE_RE = /^(routes\d*|elev\d*):/
const IDX_KEY = 'pedalclima.cache'
const MAX_ENTRIES = 40

export function readJson<T>(key: string): T | null {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) as T : null } catch { return null }
}
export function removeKey(key: string) { try { localStorage.removeItem(key) } catch { /* ignora */ } }

// ---- aviso de espaço cheio (o app mostra um banner) ----
let full = false
const listeners = new Set<() => void>()
const setFull = (v: boolean) => { if (full !== v) { full = v; listeners.forEach(f => f()) } }
export const storageFull = () => full
export function onStorageFull(f: () => void) { listeners.add(f); return () => { listeners.delete(f) } }

const isQuota = (e: unknown) => e instanceof DOMException && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e.code === 22)

/** Apaga todas as cópias temporárias (rotas e altitudes). Nunca toca nos dados do usuário. */
export function clearCaches(): number {
  let n = 0
  try {
    for (const k of Object.keys(localStorage)) if (CACHE_RE.test(k)) { localStorage.removeItem(k); n++ }
    localStorage.removeItem(IDX_KEY)
  } catch { /* ignora */ }
  return n
}

/**
 * Grava texto; se o espaço acabou, apaga as cópias temporárias e tenta de novo.
 * Se ainda assim não couber, liga o aviso de espaço cheio e devolve false.
 */
export function storageWrite(key: string, text: string): boolean {
  try { localStorage.setItem(key, text); if (!CACHE_RE.test(key)) setFull(false); return true }
  catch (e) {
    if (!isQuota(e) || CACHE_RE.test(key)) return false
    clearCaches()
    try { localStorage.setItem(key, text); setFull(false); return true } catch { setFull(true); return false }
  }
}
export function writeJson(key: string, value: unknown): boolean {
  return storageWrite(key, JSON.stringify(value))
}

// ---- cópias temporárias com limite (as menos usadas saem primeiro) ----
let lastStamp = 0
/** carimbo sempre crescente (várias gravações no mesmo milissegundo continuam em ordem) */
const stamp = () => (lastStamp = Math.max(Date.now(), lastStamp + 1))
function readIdx(): Record<string, number> { return readJson<Record<string, number>>(IDX_KEY) ?? {} }
function writeIdx(idx: Record<string, number>) { try { localStorage.setItem(IDX_KEY, JSON.stringify(idx)) } catch { /* ignora */ } }

/** Lê uma cópia temporária e marca como usada agora. */
export function readCache<T>(key: string): T | null {
  const v = readJson<T>(key)
  if (v != null) { const idx = readIdx(); idx[key] = stamp(); writeIdx(idx) }
  return v
}
/** Guarda uma cópia temporária, mantendo só as `MAX_ENTRIES` usadas mais recentemente. Se não couber, não guarda. */
export function writeCache(key: string, value: unknown): void {
  const idx = readIdx(); idx[key] = stamp()
  const text = JSON.stringify(value)
  try { localStorage.setItem(key, text) }
  catch {
    // abre espaço tirando as mais antigas e tenta uma vez
    for (const k of Object.keys(idx).sort((a, b) => idx[a] - idx[b]).slice(0, Math.ceil(Object.keys(idx).length / 2))) { removeKey(k); delete idx[k] }
    try { localStorage.setItem(key, text) } catch { delete idx[key]; writeIdx(idx); return }
  }
  writeIdx(prune(idx))
}
function prune(idx: Record<string, number>): Record<string, number> {
  const keys = Object.keys(idx).sort((a, b) => idx[b] - idx[a])
  for (const k of keys.slice(MAX_ENTRIES)) { removeKey(k); delete idx[k] }
  return idx
}

/** Ao abrir o app: apaga cópias antigas sem registro (de versões anteriores) e aplica o limite. */
export function pruneCaches() {
  try {
    const idx = readIdx()
    for (const k of Object.keys(localStorage)) if (CACHE_RE.test(k) && !(k in idx)) localStorage.removeItem(k)
    for (const k of Object.keys(idx)) if (localStorage.getItem(k) == null) delete idx[k]
    writeIdx(prune(idx))
  } catch { /* ignora */ }
}
