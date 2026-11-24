const pad = (n: number) => String(n).padStart(2, '0')
export const hhmm = (t: number | Date) => { const d = new Date(t); return pad(d.getHours()) + ':' + pad(d.getMinutes()) }
export const fmt1 = (n: number) => n.toFixed(1).replace('.', ',')
export const lowerFirst = (s: string) => s.replace(/^./, c => c.toLowerCase())
export const upperFirst = (s: string) => s.replace(/^./, c => c.toUpperCase())

/** Dia e mês (24/11), para mostrar de quando é a previsão. */
export const ddmm = (ms: number) => { const d = new Date(ms); return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') }
