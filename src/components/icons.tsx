import { Backpack, BatteryCharging, Check, Cloud, CloudLightning, CloudRain, CloudSun, Lightbulb, Route, Sun, SunMedium, Thermometer, Wind, Zap } from 'lucide-react'
import type { CheckIcon, IconName } from '../domain/advice'

const MAP = {
  sun: Sun, partly: CloudSun, cloud: Cloud, rain: CloudRain, storm: CloudLightning, road: Route, check: Check,
  bolt: Zap, battery: BatteryCharging, bag: Backpack, light: Lightbulb, wind: Wind, uv: SunMedium, thermo: Thermometer,
}
export function Icon({ name }: { name: IconName | CheckIcon }) {
  const C = MAP[name]
  return <C className="i" aria-hidden="true" />
}
