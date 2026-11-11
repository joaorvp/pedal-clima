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
    ;(video as SafariVideo).autoPictureInPicture = true
    document.body.appendChild(video)
    video.srcObject = canvas.captureStream(2)
  }
  if (!timer) timer = setInterval(paint, 1000) // mantém o vídeo vivo e o relógio andando
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
  if (timer) clearInterval(timer); timer = null
  try { if (document.pictureInPictureElement) document.exitPictureInPicture() } catch { /* nada */ }
  try { navigator.mediaSession?.setActionHandler('enterpictureinpicture' as MediaSessionAction, null) } catch { /* sem suporte */ }
  if (video) { video.pause(); video.srcObject = null; video.remove(); video = null }
  canvas = null; painter = null
}
