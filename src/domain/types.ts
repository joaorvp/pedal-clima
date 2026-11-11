export type LatLon = [number, number]
export type Dir = 'ida' | 'volta'
export type Profile = 'bike' | 'main'
export type Level = 'ok' | 'warn' | 'bad'

export interface Sample { lat: number; lon: number; km: number; ri: number; brg: number }
/** Amostra no sentido escolhido: `d` é a distância desde a saída, `wi` o índice da previsão. */
export interface OrderedSample extends Sample { d: number; wi: number }

export interface Hourly {
  time: number[]
  precipitation_probability: number[]
  precipitation: number[]
  temperature_2m: number[]
  apparent_temperature?: number[]
  relative_humidity_2m?: number[]
  weather_code: number[]
  wind_speed_10m: number[]
  wind_direction_10m: number[]
  wind_gusts_10m: number[]
  uv_index?: number[]
  is_day?: number[]
}
export interface PointWeather {
  minutely_15?: { time: number[]; precipitation: number[] }
  hourly: Hourly
  daily?: SunTimes
}
export interface SunTimes { sunrise: number[]; sunset: number[] }

export interface RouteCandidate { line: LatLon[]; roads: string[]; profile: Profile; viaP: boolean; /** fração do caminho em ciclovia (0–1), quando o roteador informa */ cycle?: number | null }
export interface ElevPoint { km: number; z: number }
export interface Route extends RouteCandidate {
  name: string
  cum: number[]
  samples: Sample[]
  total: number
  viaKm: number | null
  wx: PointWeather[] | null
  elev?: ElevPoint[]
}

export interface Seg {
  a: OrderedSample; b: OrderedSample
  from: number; to: number
  /** horário no meio do trecho e no início do trecho (ms) */
  t: number; tA: number
  rate: number; prob: number; code: number
}
export interface Evaluation {
  segs: Seg[]
  exposure: number; maxRate: number; maxProb: number
  storm: boolean; head: number; gustMax: number
  dur: number; arr: number; depMs: number
}
