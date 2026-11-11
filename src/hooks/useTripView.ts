import { useMemo } from 'react'
import type { TripCtx } from '../domain/advice'
import { batteryEstimate, elevFor } from '../domain/battery'
import { evaluate } from '../domain/weather'
import { curPlace, destName, useSettings } from '../store/settings'
import { useTrip } from '../store/trip'

/** Velocidade usada nos cálculos: a medida pelo GPS durante o pedal, ou a média configurada. */
export function rideSpeed(ema: number | undefined, configured: number) {
  return ema && ema > 8 ? Math.min(45, ema) : configured || 22
}

export function useLabels() {
  const dir = useTrip(s => s.dir)
  const place = useSettings(curPlace)
  const name = useSettings(destName)
  return useMemo(() => ({
    dep: dir === 'ida' ? 'Saída de casa' : place ? 'Saída: ' + name : 'Saída do trabalho',
    arr: dir === 'ida' ? (place ? 'Chegada: ' + name : 'Chegada no trabalho') : 'Chegada em casa',
    from: dir === 'ida' ? 'Casa' : name,
    to: dir === 'ida' ? name : 'Casa',
  }), [dir, place, name])
}

/** Rota selecionada, avaliação no horário escolhido (ou do ponto atual, no modo pedal) e contexto de textos. */
export function useTripView() {
  const routes = useTrip(s => s.routes), sel = useTrip(s => s.sel), dir = useTrip(s => s.dir)
  const dep = useTrip(s => s.dep), now = useTrip(s => s.now), ride = useTrip(s => s.ride)
  const speed = useSettings(s => s.speed), probTh = useSettings(s => s.probTh)
  const whkm = useSettings(s => s.whkm), batt = useSettings(s => s.batt)
  const labels = useLabels()
  const route = routes[sel]
  const riding = !!ride?.pos
  const sp = riding ? rideSpeed(ride!.ema, speed) : speed

  return useMemo(() => {
    if (!route?.wx) return null
    const depMs = riding ? (ride!.last?.t ?? now) - ride!.d / sp * 3600e3 : dep ?? now
    const ev = evaluate(route, dir, depMs, sp)
    const ctx: TripCtx = { route, dir, speed: sp, probTh, depLabel: labels.dep, arrLabel: labels.arr, now }
    const prof = elevFor(route, dir)
    const battery = batteryEstimate(ev, route.total, prof, whkm, batt)
    return { route, ev, ctx, prof, battery, riding }
  }, [route, dir, dep, now, riding, ride, sp, probTh, labels, whkm, batt])
}
