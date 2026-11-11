import { CURRENT_APP_VERSION } from '../domain/changelog'
import { useSettings } from '../store/settings'
import { useTrip } from '../store/trip'

/** Últimos erros do app (para o relatório). */
const errors: string[] = []
export function installErrorLog() {
  const push = (m: string) => { errors.push(new Date().toISOString().slice(11, 19) + ' ' + m.slice(0, 300)); if (errors.length > 10) errors.shift() }
  window.addEventListener('error', e => push(e.message || String(e.error)))
  window.addEventListener('unhandledrejection', e => push('promessa: ' + String((e.reason as Error)?.message ?? e.reason)))
}

/** Relatório técnico para mandar quando algo estranho acontece. Sem coordenadas nem endereços. */
export function buildReport(): string {
  const t = useTrip.getState(), s = useSettings.getState()
  const standalone = matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone
  const lines = [
    `Pedágua ${CURRENT_APP_VERSION} · ${new Date().toLocaleString('pt-BR')}`,
    `Aparelho: ${navigator.userAgent}`,
    `Instalado: ${standalone ? 'sim' : 'não'} · tela ${innerWidth}x${innerHeight} · online: ${navigator.onLine ? 'sim' : 'não'}`,
    `Localização: ${t.locStatus}${t.me ? ` · precisão ${Math.round(t.me.acc)} m · última leitura há ${Math.round((Date.now() - t.me.t) / 1000)} s` : ''}`,
    `Tela: ${t.mode}${t.ride ? ` · pedalando (km ${t.ride.d.toFixed(1)}, fora da rota ${Math.round(t.ride.off * 1000)} m, sinal ${t.ride.weakSignal ? 'fraco' : 'ok'})` : ''}`,
    `Rotas: ${t.routes.length} · escolhida ${t.sel + 1} · ${t.routes[t.sel] ? t.routes[t.sel].total.toFixed(1) + ' km' : '-'}${t.routeNote ? ' · ' + t.routeNote : ''}`,
    `Previsão do trajeto: ${t.wxAt ? new Date(t.wxAt).toLocaleTimeString('pt-BR') : '-'} · clima local: ${t.local ? new Date(t.local.at).toLocaleTimeString('pt-BR') : '-'} · sem conexão: ${t.offline ? 'sim' : 'não'}`,
    `Alertas INMET: ${t.alerts === null ? 'não consultou' : t.alerts.length} · radar: ${t.radar.frames.length} quadros · ar: ${t.air ? Math.round(t.air.aqi) : '-'}`,
    `Ajustes: rota ${s.profile} · ${s.speed} km/h · voz ${s.voice ? 'sim' : 'não'} · ciclovias ${s.cycleMap ? 'sim' : 'não'} · lugares ${s.places.length} · pedais ${s.history.length}`,
    `Recursos: janela flutuante ${document.pictureInPictureEnabled ? 'sim' : 'não'} · voz ${'speechSynthesis' in window ? 'sim' : 'não'} · vibração ${'vibrate' in navigator ? 'sim' : 'não'} · tela acesa ${'wakeLock' in navigator ? 'sim' : 'não'}`,
    `Erro na tela: ${t.error || '-'}`,
    'Últimos erros:', ...(errors.length ? errors : ['(nenhum)']),
  ]
  return lines.join('\n')
}
