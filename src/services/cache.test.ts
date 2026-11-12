import { beforeEach, describe, expect, it } from 'vitest'

/** localStorage de mentira com limite de espaço (em caracteres). */
function fakeStorage(limit: number) {
  const m = new Map<string, string>()
  const used = () => [...m].reduce((s, [k, v]) => s + k.length + v.length, 0)
  const ls = {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => { const before = m.get(k); m.set(k, v); if (used() > limit) { if (before == null) m.delete(k); else m.set(k, before); throw new DOMException('cheio', 'QuotaExceededError') } },
    removeItem: (k: string) => { m.delete(k) },
    key: (i: number) => [...m.keys()][i] ?? null,
    get length() { return m.size },
  }
  return new Proxy(ls, { ownKeys: () => [...m.keys()], getOwnPropertyDescriptor: (_t, k) => m.has(String(k)) ? { enumerable: true, configurable: true, value: m.get(String(k)) } : undefined })
}

describe('espaço do navegador', () => {
  beforeEach(() => { (globalThis as { localStorage?: unknown }).localStorage = fakeStorage(20000) })
  it('apaga cópias antigas de versões anteriores ao abrir, sem tocar nos dados', async () => {
    const c = await import('./cache')
    localStorage.setItem('pedalclima.v1', '{"home":[1,2]}')
    localStorage.setItem('routes4:bike:1,2', 'x'); localStorage.setItem('elev1:abc', 'y')
    c.pruneCaches()
    expect(localStorage.getItem('routes4:bike:1,2')).toBeNull()
    expect(localStorage.getItem('elev1:abc')).toBeNull()
    expect(localStorage.getItem('pedalclima.v1')).toBe('{"home":[1,2]}')
  })
  it('mantém só as 40 cópias usadas mais recentemente', async () => {
    const c = await import('./cache')
    for (let i = 0; i < 45; i++) c.writeCache('routes5:' + i, [i])
    const left = Object.keys(localStorage).filter(k => k.startsWith('routes5:'))
    expect(left.length).toBe(40)
    expect(localStorage.getItem('routes5:0')).toBeNull()
    expect(c.readCache('routes5:44')).toEqual([44])
  })
  it('sem espaço: apaga as cópias para salvar os dados do usuário; se nem assim couber, avisa', async () => {
    const c = await import('./cache')
    for (let i = 0; i < 6; i++) localStorage.setItem('routes5:big' + i, 'z'.repeat(3000))
    expect(c.writeJson('pedalclima.v1', { h: 'd'.repeat(5000) })).toBe(true)
    expect(Object.keys(localStorage).some(k => k.startsWith('routes5:'))).toBe(false)
    expect(c.storageFull()).toBe(false)
    expect(c.writeJson('pedalclima.v1', { h: 'd'.repeat(30000) })).toBe(false)
    expect(c.storageFull()).toBe(true)
  })
})
