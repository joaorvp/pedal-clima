import { buzz } from './location'
import { say } from './voice'

/** Dois toques curtos (Web Audio), para chamar atenção quando a chuva passa. */
export function chime() {
  try {
    const ctx = new AudioContext(), now = ctx.currentTime
    for (const [f, t] of [[880, 0], [1320, 0.18]] as const) {
      const o = ctx.createOscillator(), g = ctx.createGain()
      o.frequency.value = f; o.type = 'sine'
      g.gain.setValueAtTime(0.0001, now + t); g.gain.exponentialRampToValueAtTime(0.25, now + t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.35)
      o.connect(g).connect(ctx.destination); o.start(now + t); o.stop(now + t + 0.4)
    }
    setTimeout(() => ctx.close(), 1000)
  } catch { /* sem áudio */ }
}
export function rainStopped() { buzz([80, 60, 80]); chime(); say('Parou de chover aqui. Bom pedal!') }
