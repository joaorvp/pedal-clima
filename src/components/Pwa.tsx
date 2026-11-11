import { Download, RefreshCw, Sparkles, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { CHANGELOG, CURRENT_APP_VERSION } from '../domain/changelog'
import { useSettings } from '../store/settings'

/** Aviso de versão nova: o service worker novo só assume quando você toca em "Atualizar". */
export function UpdatePrompt() {
  const { needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW({
    onRegisteredSW(_url, reg) { if (reg) setInterval(() => reg.update().catch(() => {}), 60 * 60e3) },
  })
  const [updating, setUpdating] = useState(false)
  if (!needRefresh) return null
  async function update() {
    setUpdating(true)
    try {
      // Recarrega por conta própria depois que o worker novo ativa (o SW não usa clients.claim).
      const waiting = (await navigator.serviceWorker.getRegistration())?.waiting
      const activated = waiting ? new Promise<void>(res => waiting.addEventListener('statechange', () => { if (waiting.state === 'activated') res() })) : Promise.resolve()
      await updateServiceWorker(true)
      await Promise.race([activated, new Promise(r => setTimeout(r, 4000))])
    } finally { window.location.reload() }
  }
  return (
    <div className="toast" role="status">
      <RefreshCw className="i" /><p>Nova versão disponível.</p>
      <button className="btn primary" type="button" onClick={update} disabled={updating}>{updating ? 'Atualizando…' : 'Atualizar'}</button>
      <button className="ibtn" type="button" aria-label="Agora não" onClick={() => setNeedRefresh(false)}><X className="i" /></button>
    </div>
  )
}

interface BeforeInstallPromptEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

/** Convite para instalar (Android/desktop). No iPhone, explica o "Adicionar à Tela de Início". */
export function InstallBanner() {
  const dismissed = useSettings(s => s.installDismissed), onboarded = useSettings(s => s.onboarded)
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null)
  const standalone = typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone)
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
  useEffect(() => {
    const h = (e: Event) => { e.preventDefault(); setEvt(e as BeforeInstallPromptEvent) }
    window.addEventListener('beforeinstallprompt', h)
    return () => window.removeEventListener('beforeinstallprompt', h)
  }, [])
  if (standalone || dismissed || !onboarded || (!evt && !ios)) return null
  const close = () => useSettings.getState().patch({ installDismissed: true })
  return (
    <div className="toast install" role="dialog" aria-label="Instalar o app">
      <Download className="i" />
      <div><b>Instalar o Pedágua</b><small>{evt ? 'Abra pela tela inicial, como um app.' : 'No Safari: Compartilhar → Adicionar à Tela de Início.'}</small></div>
      {evt && <button className="btn primary" type="button" onClick={async () => { await evt.prompt(); await evt.userChoice; setEvt(null); close() }}>Instalar</button>}
      <button className="ibtn" type="button" aria-label="Fechar" onClick={close}><X className="i" /></button>
    </div>
  )
}

/** "O que há de novo": aparece uma vez por versão, só para quem já usava o app. */
export function WhatsNew() {
  const seen = useSettings(s => s.seenVersion), onboarded = useSettings(s => s.onboarded), customized = useSettings(s => s.customized)
  const [open, setOpen] = useState(true)
  if (!open || seen === CURRENT_APP_VERSION) return null
  if (!customized || !onboarded) { queueMicrotask(() => useSettings.getState().patch({ seenVersion: CURRENT_APP_VERSION })); return null }
  const entry = CHANGELOG[0]
  const close = () => { useSettings.getState().patch({ seenVersion: CURRENT_APP_VERSION }); setOpen(false) }
  return (
    <div className="toast news" role="dialog" aria-labelledby="news-title">
      <Sparkles className="i" />
      <div><b id="news-title">{entry.title}</b><ul>{entry.items.map(i => <li key={i}>{i}</li>)}</ul></div>
      <button className="ibtn" type="button" aria-label="Fechar novidades" onClick={close}><X className="i" /></button>
    </div>
  )
}
