import { useMemo } from 'react'
import type { TripCtx } from '../domain/advice'
import { batteryEstimate, elevFor } from '../domain/battery'
import { evaluate } from '../domain/weather'
import { baseSpeed, useSettings } from '../store/settings'
import { rideSpeedFrom } from '../domain/speed'
import { endpointName, useTrip } from '../store/trip'

/** Velocidade para estimar a chegada no pedal (média do pedal misturada com a sua média). */
export const rideSpeed = rideSpeedFrom

export function useLabels() {
  const origin = useTrip(s => s.origin), dest = useTrip(s => s.dest)
  return useMemo(() => {
    const from = endpointName(origin), to = endpointName(dest)
    return {
      dep: origin.kind === 'me' ? 'Saída' : 'Saída: ' + from,
      arr: 'Chegada: ' + (to || 'destino'),
      from: origin.kind === 'me' ? 'Você' : from,
      to,
    }
  }, [origin, dest])
}

/** Rota selecionada, avaliação no horário escolhido (ou do ponto atual, no modo pedal) e contexto de textos. */
export function useTripView() {
  const routes = useTrip(s => s.routes), sel = useTrip(s => s.sel), mode = useTrip(s => s.mode)
  const dep = useTrip(s => s.dep), now = useTrip(s => s.now), ride = useTrip(s => s.ride)
  const speed = useSettings(baseSpeed), probTh = useSettings(s => s.probTh)
  const whkm = useSettings(s => s.whkm), batt = useSettings(s => s.batt)
  const labels = useLabels()
  const route = mode === 'trip' ? routes[sel] : undefined
  const riding = !!ride?.pos
  const sp = riding ? rideSpeed(ride, speed) : speed

  return useMemo(() => {
    if (!route?.wx) return null
    const depMs = riding ? (ride!.last?.t ?? now) - ride!.d / sp * 3600e3 : dep ?? now
    const ev = evaluate(route, 'ida', depMs, sp)
    const ctx: TripCtx = { route, dir: 'ida', speed: sp, probTh, depLabel: labels.dep, arrLabel: labels.arr, now }
    const prof = elevFor(route, 'ida')
    const battery = batteryEstimate(ev, route.total, prof, whkm, batt)
    return { route, ev, ctx, prof, battery, riding }
  }, [route, dep, now, riding, ride, sp, probTh, labels, whkm, batt])
}
