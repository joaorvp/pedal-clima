import { rideVerdict, type Verdict } from '../domain/advice'
import { baseSpeed, useSettings } from '../store/settings'
import { useTrip } from '../store/trip'
import { rideSpeed, useTripView } from './useTripView'

/** Números do pedal em andamento (os mesmos no veredito, no painel e na janela flutuante). */
export function useRideNumbers() {
  const view = useTripView(), ride = useTrip(s => s.ride), speed = useSettings(baseSpeed)
  if (!ride?.pos || !view) return null
  const sp = rideSpeed(ride, speed)
  const v: Verdict = rideVerdict(view.ev, view.ctx, ride.d, ride.off, sp)
  const left = Math.max(0, view.route.total - ride.d)
  const eta = (ride.last?.t ?? 0) + left / sp * 3600e3
  const ahead = view.ev.segs.find(sg => sg.to > ride.d && sg.rate >= 0.2)
  // chuva prevista no que falta (mm que você deve pegar) e a maior chance nesse trecho
  let aheadMm = 0, aheadProb = 0
  for (const sg of view.ev.segs) {
    if (sg.to <= ride.d) continue
    const len = sg.to - Math.max(sg.from, ride.d)
    aheadMm += sg.rate * len / sp; aheadProb = Math.max(aheadProb, sg.prob)
  }
  return { view, ride, v, left, eta, sp, aheadMm, aheadProb, distRain: ahead ? Math.max(0, ahead.from - ride.d) : null, storm: view.ev.segs.some(sg => sg.to > ride.d && sg.code >= 95) }
}
