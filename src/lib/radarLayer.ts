import L from './leaflet'

/**
 * Camada do radar que funciona no celular.
 *
 * O RainViewer gratuito só entrega imagens até o zoom 7. Uma camada comum com maxNativeZoom 7 estica essa imagem
 * até o zoom da rua: no zoom 15, cada imagem vira um elemento de 65.536 px, acima do limite de textura dos celulares,
 * e o navegador simplesmente não desenha (sem erro). Aqui cada quadrado do mapa (256 px) é um canvas com só o
 * pedaço da imagem do zoom 7 que cai nele. A imagem não precisa de CORS: desenhar no canvas só o "suja" para leitura,
 * e este canvas nunca é lido.
 */
const MAX_Z = 7
const cache = new Map<string, Promise<HTMLImageElement>>()
function loadImg(url: string): Promise<HTMLImageElement> {
  let p = cache.get(url)
  if (!p) {
    p = new Promise((res, rej) => { const i = new Image(); i.decoding = 'async'; i.onload = () => res(i); i.onerror = () => rej(new Error('radar')); i.src = url })
    p.catch(() => cache.delete(url))
    cache.set(url, p)
    if (cache.size > 120) cache.delete(cache.keys().next().value!)
  }
  return p
}

export interface RadarGridOptions extends L.GridLayerOptions { url: string }

/** `url` com {z}/{x}/{y} (o caminho do quadro do RainViewer). */
export function radarGrid(opts: RadarGridOptions): L.GridLayer {
  const Grid = L.GridLayer.extend({
    createTile(this: L.GridLayer & { _wrapCoords: (c: L.Coords) => L.Coords }, coords: L.Coords, done: L.DoneCallback) {
      const size = this.getTileSize(), tile = document.createElement('canvas')
      tile.width = size.x; tile.height = size.y
      const c = this._wrapCoords(coords), nz = Math.min(c.z, MAX_Z), scale = 2 ** (c.z - nz)
      const px = Math.floor(c.x / scale), py = Math.floor(c.y / scale), sub = 256 / scale
      const url = opts.url.replace('{z}', String(nz)).replace('{x}', String(px)).replace('{y}', String(py))
      loadImg(url).then(img => {
        const ctx = tile.getContext('2d')
        if (ctx) { ctx.imageSmoothingEnabled = true; ctx.drawImage(img, (c.x - px * scale) * sub, (c.y - py * scale) * sub, sub, sub, 0, 0, size.x, size.y) }
        done(undefined, tile)
      }, e => done(e as Error, tile))
      return tile
    },
  })
  return new (Grid as unknown as new (o: L.GridLayerOptions) => L.GridLayer)(opts)
}
