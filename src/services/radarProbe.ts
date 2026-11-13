/**
 * Confere se há chuva nas imagens do radar que cobrem a área do mapa.
 * Baixa as imagens à parte (a camada visível não muda) e procura qualquer pixel colorido.
 * Se o servidor não permitir ler as imagens, devolve null e o app simplesmente não mostra o aviso.
 */
const cache = new Map<string, Promise<boolean | null>>()

const lon2x = (lon: number, z: number) => Math.floor((lon + 180) / 360 * 2 ** z)
const lat2y = (lat: number, z: number) => { const r = lat * Math.PI / 180; return Math.floor((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * 2 ** z) }

function tileHasRain(url: string): Promise<boolean | null> {
  let p = cache.get(url)
  if (!p) {
    p = (async () => {
      try {
        const r = await fetch(url, { mode: 'cors' }); if (!r.ok) return null
        const img = await createImageBitmap(await r.blob())
        const c = document.createElement('canvas'); c.width = img.width; c.height = img.height
        const ctx = c.getContext('2d', { willReadFrequently: true }); if (!ctx) return null
        ctx.drawImage(img, 0, 0)
        const px = ctx.getImageData(0, 0, c.width, c.height).data
        for (let i = 3; i < px.length; i += 8) if (px[i] > 40) return true
        return false
      } catch { return null }
    })()
    cache.set(url, p)
    if (cache.size > 300) cache.delete(cache.keys().next().value!)
  }
  return p
}

/** true: há chuva em algum quadro; false: nenhum pixel de chuva; null: não deu para saber. */
export async function radarHasRain(host: string, paths: string[], b: { n: number; s: number; e: number; w: number }, zoom: number): Promise<boolean | null> {
  const z = Math.max(1, Math.min(7, Math.floor(zoom)))
  const x0 = lon2x(b.w, z), x1 = lon2x(b.e, z), y0 = lat2y(b.n, z), y1 = lat2y(b.s, z)
  if ((x1 - x0 + 1) * (y1 - y0 + 1) > 6 || !paths.length) return null // área grande demais: não arrisca dizer que está seco
  const jobs: Promise<boolean | null>[] = []
  for (const path of paths) for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) jobs.push(tileHasRain(`${host}${path}/256/${z}/${x}/${y}/2/1_1.png`))
  const res = await Promise.all(jobs)
  if (res.some(v => v === true)) return true
  return res.some(v => v === null) ? null : false
}

/**
 * Chuva no radar exatamente onde você está (raio de ~2 km na imagem mais recente).
 * true: o radar mostra chuva; false: seco; null: não deu para ler a imagem.
 */
export async function radarRainAt(host: string, path: string, ll: [number, number]): Promise<boolean | null> {
  const z = 7, n = 2 ** z, r = ll[0] * Math.PI / 180
  const fx = (ll[1] + 180) / 360 * n, fy = (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * n
  const tx = Math.floor(fx), ty = Math.floor(fy), px = Math.floor((fx - tx) * 256), py = Math.floor((fy - ty) * 256)
  try {
    const res = await fetch(`${host}${path}/256/${z}/${tx}/${ty}/2/1_1.png`, { mode: 'cors' }); if (!res.ok) return null
    const img = await createImageBitmap(await res.blob())
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height
    const ctx = c.getContext('2d', { willReadFrequently: true }); if (!ctx) return null
    ctx.drawImage(img, 0, 0)
    const R = 2, x0 = Math.max(0, px - R), y0 = Math.max(0, py - R)
    const d = ctx.getImageData(x0, y0, Math.min(img.width - x0, 2 * R + 1), Math.min(img.height - y0, 2 * R + 1)).data
    for (let i = 3; i < d.length; i += 4) if (d[i] > 60) return true
    return false
  } catch { return null }
}
