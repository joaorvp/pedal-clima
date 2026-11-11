import L from 'leaflet'
import { Crosshair, Layers, Maximize, Play, Square } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { hhmm, fmt1 } from '../domain/format'
import { placeName } from '../domain/advice'
import { ordered, CATS, cat } from '../domain/weather'
import type { LatLon } from '../domain/types'
import { useTripView } from '../hooks/useTripView'
import { destPt, useSettings, type PointKey } from '../store/settings'
import { useTrip } from '../store/trip'
import { setPointFromMap } from '../store/actions'

const css = (n: string) => getComputedStyle(document.documentElement).getPropertyValue(n).trim()
const BASES = [
  { url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '&copy; OpenStreetMap' },
  { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', attribution: 'Esri, &copy; OpenStreetMap' },
]
const PIN = { home: { letter: 'C', color: '#0b7a70' }, via: { letter: 'P', color: '#6f8285' }, work: { letter: 'T', color: '#b5562b' } } as const
const pinIcon = (k: PointKey) => L.divIcon({ className: '', iconSize: [30, 30], iconAnchor: [15, 30], html: `<div class="pin" style="background:${PIN[k].color}"><b>${PIN[k].letter}</b></div>` })
interface Layers { route: L.LayerGroup; markers: Record<PointKey, L.Marker>; radar: L.TileLayer | null; me: L.Marker | null; acc: L.Circle | null; handle: L.Marker | null }
const PICK_LABEL: Record<PointKey, string> = { home: 'Toque no mapa onde fica a sua casa', via: 'Toque num ponto por onde você passa', work: 'Toque no mapa onde fica o trabalho' }

export function MapView({ full, onToggleFull }: { full: boolean; onToggleFull: () => void }) {
  const el = useRef<HTMLDivElement>(null)
  const [inst, setInst] = useState<{ map: L.Map; ly: Layers } | null>(null)
  const view = useTripView()
  const routes = useTrip(s => s.routes), sel = useTrip(s => s.sel), radar = useTrip(s => s.radar)
  const ride = useTrip(s => s.ride), pickMode = useTrip(s => s.pickMode), fitNonce = useTrip(s => s.fitNonce)
  const sheetVisible = useTrip(s => s.sheetVisible), now = useTrip(s => s.now)
  const home = useSettings(s => s.home), via = useSettings(s => s.via), dest = useSettings(destPt)

  // cria o mapa uma vez
  useEffect(() => {
    if (!el.current) return
    const map = L.map(el.current, { zoomControl: false }).setView([-15.84, -48.02], 12)
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
    const s = useSettings.getState()
    const markers = {
      home: L.marker(s.home, { draggable: true, icon: pinIcon('home'), title: 'Casa' }).addTo(map),
      via: L.marker(s.via ?? s.home, { draggable: true, icon: pinIcon('via'), title: 'Passar por' }),
      work: L.marker(destPt(s), { draggable: true, icon: pinIcon('work'), title: 'Destino' }).addTo(map),
    }
    for (const k of Object.keys(markers) as PointKey[]) markers[k].on('dragend', () => { const p = markers[k].getLatLng(); setPointFromMap(k, [p.lat, p.lng]) })
    const ly: Layers = { route: L.layerGroup().addTo(map), markers, radar: null, me: null, acc: null, handle: null }
    map.on('dragstart', () => { const r = useTrip.getState().ride; if (r) useTrip.getState().set({ ride: { ...r, follow: false } }) })
    map.on('click', e => {
      const k = useTrip.getState().pickMode; if (!k) return
      useTrip.getState().set({ pickMode: null }); setPointFromMap(k, [e.latlng.lat, e.latlng.lng])
    })
    setInst({ map, ly })
    return () => { map.remove(); setInst(null) }
  }, [])

  const map = inst?.map, ly = inst?.ly
  const centerOn = useCallback((pos: LatLon) => {
    if (!map) return
    const z = Math.max(map.getZoom(), 15), pt = map.project(pos, z).add([0, sheetVisible / 2])
    map.setView(map.unproject(pt, z), z, { animate: true })
  }, [map, sheetVisible])
  const fit = useCallback(() => {
    if (!map || !routes.length) return
    map.fitBounds(L.latLngBounds(routes.flatMap(r => r.line)).pad(0.06), { paddingTopLeft: [16, 40], paddingBottomRight: [56, useTrip.getState().sheetVisible + 16] })
  }, [map, routes])

  // marcadores
  useEffect(() => {
    if (!map || !ly) return
    ly.markers.home.setLatLng(home); ly.markers.work.setLatLng(dest)
    if (via) { ly.markers.via.setLatLng(via); if (!map.hasLayer(ly.markers.via)) ly.markers.via.addTo(map) }
    else if (map.hasLayer(ly.markers.via)) map.removeLayer(ly.markers.via)
  }, [map, ly, home, via, dest])

  // rotas coloridas pela chuva
  useEffect(() => {
    if (!map || !ly) return
    ly.route.clearLayers()
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
      L.polyline(pts, { ...base, interactive: true, color: css(CATS[cat(sg.rate)].color), weight: 6, opacity: 1 })
        .bindTooltip(`<div class="tip">${placeName(sg.from, ctx)} · você passa às <b>${hhmm(sg.t)}</b><br>${CATS[cat(sg.rate)].label} · ${fmt1(sg.rate)} mm/h · ${sg.prob}%</div>`, { sticky: true })
        .on('click', e => { L.DomEvent.stopPropagation(e); showHandle(e.latlng) })
        .addTo(ly.route)
    }
    const pts = ordered(route, ctx.dir)
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
      h.on('dragend', () => { const p = h.getLatLng(); map.removeLayer(h); ly.handle = null; setPointFromMap('via', [p.lat, p.lng]) })
      ly.handle = h
    }
  }, [map, ly, routes, sel, view])

  // enquadra a rota quando ela muda (considerando a gaveta por cima do mapa)
  const fitRef = useRef(fit)
  useEffect(() => { fitRef.current = fit }, [fit])
  useEffect(() => { if (!useTrip.getState().ride?.pos) fitRef.current() }, [map, fitNonce])

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

  // posição ao vivo
  useEffect(() => {
    if (!map || !ly) return
    if (!ride?.pos) { if (ly.me) { map.removeLayer(ly.me); map.removeLayer(ly.acc!); ly.me = ly.acc = null } return }
    if (!ly.me) {
      ly.acc = L.circle(ride.pos, { radius: ride.acc, color: '#2b7fff', weight: 1, opacity: .4, fillOpacity: .12, interactive: false }).addTo(map)
      ly.me = L.marker(ride.pos, { interactive: false, keyboard: false, zIndexOffset: 1000, icon: L.divIcon({ className: '', iconSize: [18, 18], iconAnchor: [9, 9], html: '<div class="me-dot"></div>' }) }).addTo(map)
    } else { ly.me.setLatLng(ride.pos); ly.acc!.setLatLng(ride.pos).setRadius(ride.acc) }
    if (ride.follow) centerOn(ride.pos)
  }, [map, ly, ride?.pos, ride?.acc, ride?.follow, centerOn])
  useEffect(() => { if (map) map.getContainer().style.cursor = pickMode ? 'crosshair' : '' }, [map, pickMode])
  useEffect(() => { const id = setTimeout(() => map?.invalidateSize(), 60); return () => clearTimeout(id) }, [map, full])

  const f = radar.frames[radar.idx]
  const radarLabel = !radar.on ? 'radar desligado' : f ? `radar ${hhmm(f.time * 1000)}${radar.playing ? '' : ` · há ${Math.max(0, Math.round((now / 1000 - f.time) / 60))} min`}` : 'radar indisponível'
  const T = useTrip.getState
  return (
    <section className={'card mapcard' + (full ? ' full' : '')} id="mapcard">
      <div className="mapwrap">
        <div id="map" ref={el} aria-label="Mapa do trajeto com radar de chuva" />
        <div className="mapfab">
          <button className="fab" id="full" type="button" aria-label="Mapa em tela cheia" onClick={onToggleFull}><Maximize className="i" /></button>
          <button className="fab" id="radar-toggle" type="button" aria-pressed={radar.on} aria-label="Mostrar radar" onClick={() => T().set({ radar: { ...radar, on: !radar.on } })}><Layers className="i" /></button>
          <button className="fab" id="radar-play" type="button" aria-label={radar.playing ? 'Parar animação do radar' : 'Animar radar da última hora'}
            onClick={() => T().set({ radar: radar.playing ? { ...radar, playing: false, idx: Math.max(0, radar.frames.length - 1) } : { ...radar, on: true, playing: radar.frames.length > 0, idx: 0 } })}>
            {radar.playing ? <Square className="i" /> : <Play className="i" />}
          </button>
          <button className="fab" id="fit" type="button" aria-label="Centralizar trajeto"
            onClick={() => { const r = T().ride; if (r?.pos) { T().set({ ride: { ...r, follow: true } }); centerOn(r.pos) } else fit() }}><Crosshair className="i" /></button>
        </div>
        <div className="radarpill num" id="radar-time">{radarLabel}</div>
        {pickMode && <div className="picking" id="picking">{PICK_LABEL[pickMode]}</div>}
      </div>
    </section>
  )
}
