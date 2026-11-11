/** Avisos falados durante o pedal (Web Speech API, em português, sem internet na maioria dos celulares). */
let ptVoice: SpeechSynthesisVoice | null = null
function pickVoice() {
  const vs = typeof speechSynthesis !== 'undefined' ? speechSynthesis.getVoices() : []
  ptVoice = vs.find(v => v.lang === 'pt-BR') ?? vs.find(v => v.lang.startsWith('pt')) ?? null
}
if (typeof speechSynthesis !== 'undefined') { pickVoice(); speechSynthesis.addEventListener?.('voiceschanged', pickVoice) }

export const canSpeak = () => typeof speechSynthesis !== 'undefined' && typeof SpeechSynthesisUtterance !== 'undefined'

export function say(text: string) {
  if (!canSpeak()) return
  try {
    speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'pt-BR'; u.rate = 1.05
    if (ptVoice) u.voice = ptVoice
    speechSynthesis.speak(u)
  } catch { /* sem voz disponível */ }
}

/** "1,2 quilômetro", "300 metros" */
export function spokenDistance(km: number) {
  if (km < 1) return `${Math.max(50, Math.round(km * 1000 / 50) * 50)} metros`
  const v = Math.round(km * 10) / 10
  return `${String(v).replace('.', ',')} ${v === 1 ? 'quilômetro' : 'quilômetros'}`
}
