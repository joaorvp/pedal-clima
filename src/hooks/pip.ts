/**
 * Janela flutuante (picture-in-picture). Um app web só pode pôr VÍDEO em janela flutuante,
 * então o painel é desenhado num <canvas> e transmitido como vídeo ao vivo.
 */
type Painter = (ctx: CanvasRenderingContext2D, w: number, h: number) => void
const W = 640, H = 360
let canvas: HTMLCanvasElement | null = null
let video: HTMLVideoElement | null = null
let painter: Painter | null = null
let timer: ReturnType<typeof setInterval> | null = null
let ticker: Worker | null = null

/**
 * Redesenha a cada segundo. Com o app em segundo plano, o navegador segura os timers da página (até 1 por minuto),
 * e a janela parecia parada; o tique vem de um worker, que não sofre esse freio. Sem worker, usa o timer comum.
 */
function startTicking() {
  if (ticker || timer) return
  try {
    ticker = new Worker(new URL('./pipTick.ts', import.meta.url), { type: 'module' })
    ticker.onmessage = () => paint()
    ticker.onerror = () => { ticker?.terminate(); ticker = null; if (!timer) timer = setInterval(paint, 1000) }
  } catch { timer = setInterval(paint, 1000) }
}
function stopTicking() { ticker?.terminate(); ticker = null; if (timer) clearInterval(timer); timer = null }

type SafariVideo = HTMLVideoElement & { webkitSetPresentationMode?: (m: string) => void; webkitPresentationMode?: string; autoPictureInPicture?: boolean }

export function pipSupported(): boolean {
  if (typeof document === 'undefined') return false
  const v = document.createElement('video') as SafariVideo
  return (!!document.pictureInPictureEnabled && 'requestPictureInPicture' in v) || typeof v.webkitSetPresentationMode === 'function'
}
export function pipActive(): boolean {
  const v = video as SafariVideo | null
  return !!v && (document.pictureInPictureElement === v || v.webkitPresentationMode === 'picture-in-picture')
}
function paint() {
  if (!canvas || !painter) return
  const ctx = canvas.getContext('2d'); if (ctx) painter(ctx, W, H)
}
export function setPipPainter(p: Painter) { painter = p; if (canvas) paint() }

/** Prepara o vídeo (ao iniciar o pedal): permite abrir a janela sozinha ao sair, onde o navegador deixa. */
export async function armPip(p: Painter) {
  if (!pipSupported()) return
  painter = p
  if (!canvas) { canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H }
  paint()
  if (!video) {
    video = document.createElement('video') as SafariVideo
    video.muted = true; video.playsInline = true; video.setAttribute('playsinline', '')
    video.setAttribute('aria-hidden', 'true')
    Object.assign(video.style, { position: 'fixed', left: '0', bottom: '0', width: '2px', height: '2px', opacity: '0.01', pointerEvents: 'none' })
    // pedido de janela automática ao sair do app (Safari usa a propriedade; o Chrome, o atributo e a ação da Media Session)
    ;(video as SafariVideo).autoPictureInPicture = true; video.setAttribute('autopictureinpicture', '')
    document.body.appendChild(video)
    video.srcObject = canvas.captureStream(2)
  }
  startTicking() // mantém o vídeo vivo e o relógio andando
  try { await video.play() } catch { /* só toca depois de um toque */ }
  try { navigator.mediaSession?.setActionHandler('enterpictureinpicture' as MediaSessionAction, () => { openPip() }) } catch { /* sem suporte */ }
}

export async function openPip(): Promise<boolean> {
  const v = video as SafariVideo | null
  if (!v) return false
  try {
    await v.play()
    if ('requestPictureInPicture' in v && document.pictureInPictureEnabled) await v.requestPictureInPicture()
    else v.webkitSetPresentationMode?.('picture-in-picture')
    return true
  } catch { return false }
}

export function disarmPip() {
  stopTicking()
  try { if (document.pictureInPictureElement) document.exitPictureInPicture() } catch { /* nada */ }
  try { navigator.mediaSession?.setActionHandler('enterpictureinpicture' as MediaSessionAction, null) } catch { /* sem suporte */ }
  if (video) { video.pause(); video.srcObject = null; video.remove(); video = null }
  canvas = null; painter = null
}
