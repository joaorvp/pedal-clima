import { useEffect, useState } from 'react'
import { MapView } from './components/MapView'
import { Sheet } from './components/Sheet'
import { Hero } from './components/Hero'
import { TripCard } from './components/TripCard'
import { AppBar, Banners, Checklist, Footer, SlotsCard } from './components/Panels'
import { SettingsDialog } from './components/SettingsDialog'
import { Welcome } from './components/Welcome'
import { InstallBanner, UpdatePrompt, WhatsNew } from './components/Pwa'
import { destPt, useSettings } from './store/settings'
import { useTrip } from './store/trip'

export default function App() {
  const [settings, setSettings] = useState<{ open: boolean; focus?: string }>({ open: false })
  const [full, setFull] = useState(false)
  const view = useTrip(s => s.routes.length + ':' + s.sel + ':' + s.loading + ':' + !!s.ride?.pos + ':' + s.arrived)
  const alerts = useTrip(s => s.alerts?.length ?? 0), customized = useSettings(s => s.customized)
  // recalcula a rota quando os pontos, o destino ou o tipo de rota mudam
  const sig = useSettings(s => [s.home, s.via, destPt(s), s.profile].flat().join(','))

  useEffect(() => { useTrip.getState().loadSnapshot() }, [])
  useEffect(() => { useTrip.getState().refresh() }, [sig])
  useEffect(() => {
    const refresh = setInterval(() => useTrip.getState().refresh(), 10 * 60e3)
    const tick = setInterval(() => useTrip.getState().set({ now: Date.now() }), 60e3)
    const vis = () => { if (!document.hidden && Date.now() - useTrip.getState().wxAt > 5 * 60e3) useTrip.getState().refresh() }
    document.addEventListener('visibilitychange', vis)
    return () => { clearInterval(refresh); clearInterval(tick); document.removeEventListener('visibilitychange', vis) }
  }, [])
  useEffect(() => { document.body.style.overflow = full ? 'hidden' : '' }, [full])

  return <>
    <AppBar onSettings={() => setSettings({ open: true })} />
    <main className="shell">
      <MapView full={full} onToggleFull={() => setFull(f => !f)} />
      <Sheet contentKey={view + alerts + customized}>
        <Banners onFix={() => setSettings({ open: true })} />
        <Hero />
        <TripCard onEdit={() => setSettings({ open: true })} onAddPlace={() => setSettings({ open: true, focus: 'places' })} />
        <SlotsCard />
        <Checklist />
        <Footer />
      </Sheet>
    </main>
    <SettingsDialog open={settings.open} focus={settings.focus} onClose={() => setSettings({ open: false })} />
    <Welcome />
    <UpdatePrompt />
    <InstallBanner />
    <WhatsNew />
  </>
}
