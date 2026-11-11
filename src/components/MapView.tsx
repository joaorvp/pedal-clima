import L from 'leaflet'
import { Layers, LocateFixed, Maximize, Play, Route as RouteIcon, Square } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { hhmm, fmt1 } from '../domain/format'
import { placeName } from '../domain/advice'
import { ordered, CATS, cat } from '../domain/weather'
import type { LatLon } from '../domain/types'
import { lastView, saveView } from '../hooks/location'
import { useTripView } from '../hooks/useTripView'
import { useSettings, type PointKey } from '../store/settings'
import { endpointLL, useTrip } from '../store/trip'
import { setPointFromMap, setTripVia } from '../store/actions'

const css = (n: string) => getComputedStyle(document.documentElement).getPropertyValue(n).trim()
const BASES = [
  { url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '&copy; OpenStreetMap' },
  { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', attribution: 'Esri, &copy; OpenStreetMap' },
]
const svgPath = {
  home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  work: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
}
const glyph = (k: keyof typeof svgPath) => `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${svgPath[k]}</svg>`
const placeIcon = (k: keyof typeof svgPath, label: string) => L.divIcon({ className: '', iconSize: [34, 34], iconAnchor: [17, 17], html: `<div class="saved-pin" title="${label}">${glyph(k)}</div>` })
const destIcon = L.divIcon({ className: '', iconSize: [34, 42], iconAnchor: [17, 40], html: `<div class="dest-pin">${glyph('flag')}</div>` })
const originIcon = L.divIcon({ className: '', iconSize: [20, 20], iconAnchor: [10, 10], html: '<div class="origin-dot"></div>' })
const viaIcon = L.divIcon({ className: '', iconSize: [30, 30], iconAnchor: [15, 30], html: '<div class="pin" style="background:#6b7a93"><b>P</b></div>' })
const dotIcon = L.divIcon({ className: 'smooth', iconSize: [22, 22], iconAnchor: [11, 11], html: '<div class="me-dot"></div>' })
const BIKE = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="16" r="3.4"/><circle cx="18" cy="16" r="3.4"/><path d="M6 16l3.6-6.4h5.6L18 16M9.6 9.6L8.6 7H7M15.2 9.6l-1-2.6h2.2M6 16h5.6l3.6-6.4"/></svg>'
const bikeIcon = (heading: number | null) => L.divIcon({ className: 'smooth', iconSize: [56, 56], iconAnchor: [28, 28],
  html: `<div class="bike-me">${heading != null ? `<div class="bike-cone" style="transform:rotate(${heading}deg)"></div>` : ''}<div class="bike-disc">${BIKE}</div></div>` })

const PICK_LABEL: Record<PointKey | 'dest', string> = { home: 'Toque no mapa onde fica a sua casa', via: 'Toque num ponto por onde você passa', work: 'Toque no mapa onde fica o trabalho', dest: 'Toque no mapa para escolher o destino' }

interface Lyr { route: L.LayerGroup; ends: L.LayerGroup; places: L.LayerGroup; radar: L.TileLayer | null; me: L.Marker | null; acc: L.Circle | null; handle: L.Marker | null; meBike: boolean | null }

export function MapView({ full, onToggleFull }: { full: boolean; onToggleFull: () => void }) {
  const el = useRef<HTMLDivElement>(null)
  const [inst, setInst] = useState<{ map: L.Map; ly: Lyr } | null>(null)
  const view = useTripView()
  const mode = useTrip(s => s.mode), origin = useTrip(s => s.origin), dest = useTrip(s => s.dest), via = useTrip(s => s.via)
  const routes = useTrip(s => s.routes), sel = useTrip(s => s.sel), radar = useTrip(s => s.radar)
  const me = useTrip(s => s.me), ride = useTrip(s => s.ride), pickMode = useTrip(s => s.pickMode)
  const fitNonce = useTrip(s => s.fitNonce), centerNonce = useTrip(s => s.centerNonce)
  const sheetVisible = useTrip(s => s.sheetVisible), now = useTrip(s => s.now)
  const home = useSettings(s => s.home), work = useSettings(s => s.work), places = useSettings(s => s.places)
  const names = useSettings(s => s.names), homeSet = useSettings(s => s.homeSet), workSet = useSettings(s => s.workSet)

  // cria o mapa uma vez, já na última região vista (sem o salto de "Brasília inteira" para a sua rua)
  useEffect(() => {
    if (!el.current) return
    const lv = lastView(), s0 = useSettings.getState()
    const map = L.map(el.current, { zoomControl: false }).setView(lv?.c ?? s0.home, lv?.z ?? 14)
    L.control.zoom({ position: 'bottomright' }).addTo(map)
    let baseIdx = 0, errors = 0, base: L.TileLayer
    const setBase = (i: number) => {
      if (base) map.removeLayer(base)
      baseIdx = i; errors = 0
      base = L.tileLayer(BASES[i].url, { maxZoom: 19, attribution: BASES[i].attribution }).addTo(map)
      base.on('tileerror', () => { if (++errors >= 4 && baseIdx < BASES.length - 1) setBase(baseIdx + 1) })
      base.on('tileload', () => { errors = 0 })
    }
    setBase(0)
    map.createPane('radar'); map.getPane('radar')!.style.zIndex = '350'; map.getPane('radar')!.style.pointerEvents = 'none'
    const ly: Lyr = { route: L.layerGroup().addTo(map), ends: L.layerGroup().addTo(map), places: L.layerGroup().addTo(map), radar: null, me: null, acc: null, handle: null, meBike: null }
    map.on('dragstart', () => { const r = useTrip.getState().ride; if (r?.follow) useTrip.getState().set({ ride: { ...r, follow: false } }) })
    map.on('moveend', () => { const c = map.getCenter(); saveView([+c.lat.toFixed(5), +c.lng.toFixed(5)], map.getZoom()) })
    map.on('click', e => {
      const t = useTrip.getState(), k = t.pickMode; if (!k) return
      const ll: LatLon = [e.latlng.lat, e.latlng.lng]
      t.set({ pickMode: null })
      if (k === 'dest') t.startTrip({ kind: 'place', ll, name: 'Ponto no mapa' })
      else setPointFromMap(k, ll)
    })
    setInst({ map, ly })
    return () => { map.remove(); setInst(null) }
  }, [])

  const map = inst?.map, ly = inst?.ly
  const centerOn = useCallback((pos: LatLon, zoom?: number) => {
    if (!map) return
    const z = zoom ?? Math.max(map.getZoom(), 15), pt = map.project(pos, z).add([0, sheetVisible / 2])
    map.setView(map.unproject(pt, z), z, { animate: true })
  }, [map, sheetVisible])
  const fit = useCallback(() => {
    if (!map || !routes.length) return
    map.fitBounds(L.latLngBounds(routes.flatMap(r => r.line)).pad(0.06), { paddingTopLeft: [16, 40], paddingBottomRight: [56, useTrip.getState().sheetVisible + 16] })
  }, [map, routes])

  // lugares salvos (só na tela inicial): um toque monta o trajeto
  useEffect(() => {
    if (!map || !ly) return
    ly.places.clearLayers()
    if (mode !== 'explore') return
    const add = (ll: LatLon, k: keyof typeof svgPath, name: string, key: string) =>
      L.marker(ll, { icon: placeIcon(k, name), title: name, keyboard: true }).on('click', () => useTrip.getState().startTrip({ kind: 'place', ll, name, key })).addTo(ly.places)
    if (homeSet) add(home, 'home', names.home ? 'Casa · ' + names.home : 'Casa', 'home')
    if (workSet) add(work, 'work', names.work ? 'Trabalho · ' + names.work : 'Trabalho', 'work')
    places.forEach(p => add([p.lat, p.lon], 'star', p.name, p.id))
  }, [map, ly, mode, home, work, places, names, homeSet, workSet])

  // origem, destino e ponto P do trajeto
  useEffect(() => {
    if (!map || !ly) return
    ly.ends.clearLayers()
    if (mode !== 'trip') return
    const d = endpointLL(dest, null)
    if (origin.kind === 'place') L.marker(origin.ll, { icon: originIcon, interactive: false, keyboard: false }).addTo(ly.ends)
    if (d) L.marker(d, { icon: destIcon, title: dest?.kind === 'place' ? dest.name : '' }).addTo(ly.ends)
    if (via) {
      const m = L.marker(via, { icon: viaIcon, draggable: true, title: 'Passar por (arraste para mudar)' }).addTo(ly.ends)
      m.on('dragend', () => { const p = m.getLatLng(); setTripVia([p.lat, p.lng]) })
    }
  }, [map, ly, mode, origin, dest, via])

  // rotas coloridas pela chuva
  useEffect(() => {
    if (!map || !ly) return
    ly.route.clearLayers()
    if (mode !== 'trip') return
    const base = { lineJoin: 'round' as const, lineCap: 'round' as const, smoothFactor: 1.2, interactive: false }
    routes.forEach((r, i) => {
      if (i === sel) return
      L.polyline(r.line, { ...base, color: '#0b1a1c', weight: 9, opacity: .18 }).addTo(ly.route)
      L.polyline(r.line, { ...base, interactive: true, color: '#8fa3a6', weight: 6, opacity: .9 })
        .bindTooltip(r.name + ' · toque para usar', { sticky: true }).on('click', () => useTrip.getState().selectRoute(i)).addTo(ly.route)
    })
    if (!view) return
    const { route, ev, ctx } = view, line = route.line
    L.polyline(line, { ...base, color: '#0b1a1c', weight: 13, opacity: .28 }).addTo(ly.route)
    L.polyline(line, { ...base, color: '#ffffff', weight: 10, opacity: 1 }).addTo(ly.route)
    for (const sg of ev.segs) {
      const i0 = Math.min(sg.a.ri, sg.b.ri), i1 = Math.max(sg.a.ri, sg.b.ri) + 1
      const pts: LatLon[] = [[sg.a.lat, sg.a.lon], ...line.slice(i0 + 1, i1), [sg.b.lat, sg.b.lon]]
      const passed = !!ride?.pos && sg.to <= ride.d
      L.polyline(pts, { ...base, interactive: true, color: passed ? '#9aa6bd' : css(CATS[cat(sg.rate)].color), weight: 6, opacity: passed ? .7 : 1 })
        .bindTooltip(`<div class="tip">${placeName(sg.from, ctx)} · você passa às <b>${hhmm(sg.t)}</b><br>${CATS[cat(sg.rate)].label} · ${fmt1(sg.rate)} mm/h · ${sg.prob}%</div>`, { sticky: true })
        .on('click', e => { L.DomEvent.stopPropagation(e); showHandle(e.latlng) })
        .addTo(ly.route)
    }
    const pts = ordered(route, 'ida')
    for (let k = 3; k < pts.length - 1; k += 4) {
      const a = pts[k]
      L.marker([a.lat, a.lon], { interactive: false, keyboard: false, icon: L.divIcon({ className: '', iconSize: [14, 14], iconAnchor: [7, 7],
        html: `<svg width="14" height="14" viewBox="0 0 14 14" style="transform:rotate(${a.brg}deg)"><path d="M3 10l4-6 4 6" fill="none" stroke="#0b1a1c" stroke-opacity=".55" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 10l4-6 4 6" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>` }) }).addTo(ly.route)
    }
    function showHandle(ll: L.LatLng) {
      if (!map || !ly || useTrip.getState().ride?.pos) return
      if (ly.handle) map.removeLayer(ly.handle)
      const h = L.marker(ll, { draggable: true, zIndexOffset: 900, icon: L.divIcon({ className: '', iconSize: [26, 26], iconAnchor: [13, 13], html: '<div class="rhandle"></div>' }) })
        .bindTooltip('Arraste para mudar o caminho', { permanent: true, direction: 'top', offset: [0, -14] }).addTo(map)
      const timer = setTimeout(() => { if (ly.handle === h) { map.removeLayer(h); ly.handle = null } }, 7000)
      h.on('dragstart', () => { clearTimeout(timer); h.closeTooltip() })
      h.on('dragend', () => { const p = h.getLatLng(); map.removeLayer(h); ly.handle = null; setTripVia([p.lat, p.lng]) })
      ly.handle = h
    }
  }, [map, ly, mode, routes, sel, view, ride?.pos, ride?.d])

  // enquadra a rota quando ela muda; centraliza em você ao abrir e ao voltar para a tela inicial
  const fitRef = useRef(fit), centerRef = useRef(centerOn)
  useEffect(() => { fitRef.current = fit; centerRef.current = centerOn }, [fit, centerOn])
  useEffect(() => { if (!useTrip.getState().ride?.pos && useTrip.getState().mode === 'trip') fitRef.current() }, [map, fitNonce])
  useEffect(() => { const p = useTrip.getState().me?.pos; if (map && p && useTrip.getState().mode === 'explore') centerRef.current(p, 15) }, [map, centerNonce])

  // radar
  useEffect(() => {
    if (!map || !ly) return
    if (ly.radar) { map.removeLayer(ly.radar); ly.radar = null }
    const f = radar.frames[radar.idx]
    if (radar.on && f) ly.radar = L.tileLayer(`${radar.host}${f.path}/256/{z}/{x}/{y}/2/1_1.png`, { pane: 'radar', opacity: .65, maxNativeZoom: 7, maxZoom: 19, attribution: 'Radar: RainViewer' }).addTo(map)
  }, [map, ly, radar.on, radar.idx, radar.frames, radar.host])
  useEffect(() => {
    if (!radar.playing) return
    const id = setInterval(() => useTrip.setState(s => ({ radar: { ...s.radar, idx: (s.radar.idx + 1) % Math.max(1, s.radar.frames.length) } })), 650)
    return () => clearInterval(id)
  }, [radar.playing])

  // você no mapa: ponto azul; pedalando, a bike girando no sentido do movimento
  const riding = !!ride?.pos
  const pos = riding ? ride!.pos! : me?.pos ?? null
  const heading = riding ? ride!.heading : null
  useEffect(() => {
    if (!map || !ly) return
    if (!pos) { if (ly.me) { map.removeLayer(ly.me); map.removeLayer(ly.acc!); ly.me = ly.acc = null; ly.meBike = null } return }
    const acc = riding ? ride!.acc : me?.acc ?? 0
    if (!ly.me) {
      ly.acc = L.circle(pos, { radius: acc, color: '#2b7fff', weight: 1, opacity: .4, fillOpacity: .12, interactive: false }).addTo(map)
      ly.me = L.marker(pos, { interactive: false, keyboard: false, zIndexOffset: 1000, icon: riding ? bikeIcon(heading) : dotIcon }).addTo(map)
      ly.meBike = riding
    } else {
      ly.me.setLatLng(pos); ly.acc!.setLatLng(pos).setRadius(acc)
      if (riding) ly.me.setIcon(bikeIcon(heading)); else if (ly.meBike) ly.me.setIcon(dotIcon)
      ly.meBike = riding
    }
    if (riding && ride!.follow) centerOn(pos)
  }, [map, ly, pos?.[0], pos?.[1], heading, riding, ride?.follow, me?.acc]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (map) map.getContainer().style.cursor = pickMode ? 'crosshair' : '' }, [map, pickMode])
  useEffect(() => { const id = setTimeout(() => map?.invalidateSize(), 60); return () => clearTimeout(id) }, [map, full])

  const f = radar.frames[radar.idx]
  const radarLabel = !radar.on ? 'radar desligado' : f ? `radar ${hhmm(f.time * 1000)}${radar.playing ? '' : ` · há ${Math.max(0, Math.round((now / 1000 - f.time) / 60))} min`}` : 'radar indisponível'
  const T = useTrip.getState
  const lost = riding && !ride!.follow
  return (
    <section className={'card mapcard' + (full ? ' full' : '')} id="mapcard">
      <div className="mapwrap">
        <div id="map" ref={el} aria-label="Mapa com a sua posição, o trajeto e o radar de chuva" />
        <div className="mapfab">
          <button className="fab" id="full" type="button" aria-label="Mapa em tela cheia" onClick={onToggleFull}><Maximize className="i" /></button>
          <button className="fab" id="radar-toggle" type="button" aria-pressed={radar.on} aria-label="Mostrar radar" onClick={() => T().set({ radar: { ...radar, on: !radar.on } })}><Layers className="i" /></button>
          <button className="fab" id="radar-play" type="button" aria-label={radar.playing ? 'Parar animação do radar' : 'Animar radar da última hora'}
            onClick={() => T().set({ radar: radar.playing ? { ...radar, playing: false, idx: Math.max(0, radar.frames.length - 1) } : { ...radar, on: true, playing: radar.frames.length > 0, idx: 0 } })}>
            {radar.playing ? <Square className="i" /> : <Play className="i" />}
          </button>
          {mode === 'trip' && !riding && <button className="fab" id="fit" type="button" aria-label="Ver o trajeto inteiro" onClick={fit}><RouteIcon className="i" /></button>}
        </div>
        <button className={'fab locate' + (lost ? ' lost' : '')} id="locate" type="button" aria-label={riding ? 'Voltar a seguir você' : 'Mostrar onde estou'}
          onClick={() => {
            const t = T(), r = t.ride
            if (r?.pos) { t.set({ ride: { ...r, follow: true } }); centerOn(r.pos); return }
            if (t.me) centerOn(t.me.pos, Math.max(map?.getZoom() ?? 15, 15))
            else t.set({ error: t.locStatus === 'denied' ? 'A localização está bloqueada. Libere nas permissões do navegador para ver onde você está.' : 'Procurando sua localização…' })
          }}><LocateFixed className="i" /></button>
        <div className="radarpill num" id="radar-time">{radarLabel}</div>
        {pickMode && <div className="picking" id="picking">{PICK_LABEL[pickMode]}</div>}
      </div>
    </section>
  )
}
