import { useEffect, useState } from 'react'
import { MapView } from './components/MapView'
import { Sheet } from './components/Sheet'
import { Hero } from './components/Hero'
import { TripCard } from './components/TripCard'
import { TripHeader } from './components/TripHeader'
import { LocalCard, RoutineCard, WhereTo } from './components/Explore'
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

  // ao abrir: pede a localização e mostra o clima onde você está
  useEffect(() => { startLocation(); useTrip.getState().refreshLocal() }, [])
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
    <UpdatePrompt />
    <InstallBanner />
    <WhatsNew />
  </>
}
