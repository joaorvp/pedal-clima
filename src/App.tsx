import { useEffect, useState } from 'react'
import { MapView } from './components/MapView'
import { Sheet } from './components/Sheet'
import { Hero } from './components/Hero'
import { TripCard } from './components/TripCard'
import { TripHeader } from './components/TripHeader'
import { LocalCard, LocationAsk, RoutineCard, WhereTo } from './components/Explore'
import { UndoToast } from './components/UndoToast'
import { localSummary } from './domain/local'
import { rainStopped } from './hooks/alerts'
import { AppBar, Banners, Checklist, Footer, SlotsCard } from './components/Panels'
import { SettingsDialog } from './components/SettingsDialog'
import { Welcome } from './components/Welcome'
import { InstallBanner, UpdatePrompt, WhatsNew } from './components/Pwa'
import { Dashboard } from './components/Dashboard'
import { startLocation } from './hooks/location'
import { useSettings } from './store/settings'
import { useTrip } from './store/trip'

export default function App() {
  const [settings, setSettings] = useState<{ open: boolean; focus?: string }>({ open: false })
  const [full, setFull] = useState(false)
  const mode = useTrip(s => s.mode)
  const view = useTrip(s => s.mode + s.routes.length + ':' + s.sel + ':' + s.loading + ':' + !!s.ride?.pos + ':' + s.arrived + ':' + !!s.local + ':' + (s.alerts?.length ?? 0) + s.locStatus)
  const profile = useSettings(s => s.profile)

  // ao abrir: se a localização já foi permitida, usa direto; senão, o card explica antes do pedido do navegador
  useEffect(() => {
    useTrip.getState().refreshLocal()
    const go = () => startLocation()
    if (useSettings.getState().locAllowed) { go(); return }
    if (!navigator.permissions?.query) return
    navigator.permissions.query({ name: 'geolocation' }).then(p => {
      if (p.state === 'granted') { useSettings.getState().patch({ locAllowed: true }); go() }
      else if (p.state === 'denied') useTrip.getState().set({ locStatus: 'denied' })
    }).catch(() => {})
  }, [])
  // atalhos do ícone do app (?ir=trabalho / ?ir=casa): abre o trajeto direto, saindo de onde você está
  useEffect(() => {
    const ir = new URLSearchParams(location.search).get('ir'); if (!ir) return
    history.replaceState(history.state, '', location.pathname)
    const s = useSettings.getState()
    const dest = ir === 'trabalho' && s.workSet ? { ll: s.work, name: 'Trabalho', key: 'work' } : ir === 'casa' && s.homeSet ? { ll: s.home, name: 'Casa', key: 'home' } : null
    if (!dest) return
    const go = () => useTrip.getState().startTrip({ kind: 'place', ...dest })
    if (useTrip.getState().me) { go(); return }
    // espera a localização por alguns segundos para sair de onde você está
    const t0 = Date.now(), id = setInterval(() => { if (useTrip.getState().me || Date.now() - t0 > 5000) { clearInterval(id); go() } }, 300)
    return () => clearInterval(id)
  }, [])
  // "me avise quando parar": confere a cada 5 min e avisa quando a chuva passar
  const watchClear = useTrip(s => s.watchClear), local = useTrip(s => s.local)
  useEffect(() => {
    if (!watchClear) return
    const id = setInterval(() => useTrip.getState().refreshLocal(), 5 * 60e3)
    return () => clearInterval(id)
  }, [watchClear])
  useEffect(() => {
    if (!watchClear || !local) return
    if (!localSummary(local.wx, Date.now()).raining) { useTrip.getState().set({ watchClear: false }); rainStopped() }
  }, [watchClear, local])
  // trocar o tipo de rota recalcula o trajeto aberto
  useEffect(() => { if (useTrip.getState().mode === 'trip') { useTrip.getState().set({ routes: [] }); useTrip.getState().refresh() } }, [profile])
  useEffect(() => {
    const refresh = setInterval(() => useTrip.getState().refresh(), 10 * 60e3)
    const tick = setInterval(() => useTrip.getState().set({ now: Date.now() }), 60e3)
    const vis = () => { const t = useTrip.getState(); if (!document.hidden && Date.now() - Math.max(t.wxAt, t.local?.at ?? 0) > 5 * 60e3) t.refresh() }
    document.addEventListener('visibilitychange', vis)
    return () => { clearInterval(refresh); clearInterval(tick); document.removeEventListener('visibilitychange', vis) }
  }, [])
  useEffect(() => { document.body.style.overflow = full ? 'hidden' : '' }, [full])
  // botão voltar: com um trajeto aberto, volta para a tela inicial em vez de sair do app
  useEffect(() => {
    if (mode === 'trip' && !history.state?.pedalTrip) history.pushState({ pedalTrip: true }, '')
    if (mode === 'explore' && history.state?.pedalTrip) history.back()
  }, [mode])
  useEffect(() => {
    const onPop = () => { const t = useTrip.getState(); if (t.mode === 'trip' && !t.ride) t.closeTrip(); else if (t.ride) history.pushState({ pedalTrip: true }, '') }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  return <>
    <AppBar onSettings={() => setSettings({ open: true })} />
    <main className="shell">
      <MapView full={full} onToggleFull={() => setFull(f => !f)} />
      <Sheet contentKey={view}>
        <Banners />
        {mode === 'explore' ? <>
          <LocationAsk />
          <RoutineCard />
          <WhereTo onAddPlace={() => setSettings({ open: true, focus: 'places' })} />
          <LocalCard />
        </> : <>
          <TripHeader />
          <Hero />
          <TripCard />
          <SlotsCard />
          <Checklist />
        </>}
        <Footer />
      </Sheet>
    </main>
    <SettingsDialog open={settings.open} focus={settings.focus} onClose={() => setSettings({ open: false })} />
    <Welcome />
    <Dashboard />
    <UndoToast />
    <UpdatePrompt />
    <InstallBanner />
    <WhatsNew />
  </>
}
