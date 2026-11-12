import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// fontes embutidas no app (funcionam sem internet): Barlow no texto, Barlow Condensed nos títulos e números
import '@fontsource/barlow/400.css'
import '@fontsource/barlow/500.css'
import '@fontsource/barlow/600.css'
import '@fontsource/barlow/700.css'
import '@fontsource/barlow-condensed/500.css'
import '@fontsource/barlow-condensed/600.css'
import '@fontsource/barlow-condensed/700.css'
import '@fontsource/barlow-condensed/800.css'
import '@fontsource/barlow-condensed/800-italic.css'
import 'leaflet/dist/leaflet.css'
import './index.css'
import App from './App'
import { pruneCaches } from './services/cache'
import { applyTheme, useSettings } from './store/settings'

// apaga cópias temporárias antigas antes de tudo (libera espaço para os dados do usuário)
pruneCaches()
// tema escolhido nos Ajustes, já no primeiro desenho (sem piscar)
applyTheme(useSettings.getState().theme)
useSettings.subscribe((s, prev) => { if (s.theme !== prev.theme) applyTheme(s.theme) })
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => applyTheme(useSettings.getState().theme))

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
