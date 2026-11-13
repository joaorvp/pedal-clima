import { useEffect, useRef, useState } from 'react'
import L from '../lib/leaflet'
import type { LatLon } from '../domain/types'

const pinIcon = L.divIcon({ className: '', iconSize: [34, 42], iconAnchor: [17, 40], html: '<div class="dest-pin mini"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="10" r="3"/><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/></svg></div>' })

/** Mapinha com um alfinete: arraste o alfinete (ou toque no mapa) para acertar o lugar antes de salvar. */
export function MiniMapPin({ ll, onMove }: { ll: LatLon; onMove: (ll: LatLon) => void }) {
  const el = useRef<HTMLDivElement>(null), inst = useRef<{ map: L.Map; m: L.Marker; street: L.TileLayer; sat: L.TileLayer } | null>(null)
  const [sat, setSat] = useState(false)
  const cb = useRef(onMove)
  useEffect(() => { cb.current = onMove }, [onMove])
  useEffect(() => {
    if (!el.current) return
    const map = L.map(el.current, { zoomControl: true, attributionControl: true, rotate: false, rotateControl: false } as L.MapOptions).setView(ll, 17)
    const street = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(map)
    // foto aérea: ajuda a achar o lugar quando ele não aparece no mapa comum (telhado, estacionamento)
    const satL = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, attribution: 'Imagem: Esri, Maxar, Earthstar Geographics' })
    const m = L.marker(ll, { draggable: true, icon: pinIcon, keyboard: true, title: 'Arraste para acertar o lugar' }).addTo(map)
    const set = (p: L.LatLng) => cb.current([+p.lat.toFixed(5), +p.lng.toFixed(5)])
    m.on('dragend', () => set(m.getLatLng()))
    map.on('click', e => { m.setLatLng(e.latlng); set(e.latlng) })
    inst.current = { map, m, street, sat: satL }
    setTimeout(() => map.invalidateSize(), 80)
    return () => { map.remove(); inst.current = null }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  // ponto trocado de fora (nova busca): leva o alfinete e o mapa até ele
  useEffect(() => {
    const i = inst.current; if (!i) return
    const cur = i.m.getLatLng()
    if (Math.abs(cur.lat - ll[0]) + Math.abs(cur.lng - ll[1]) > 1e-6) { i.m.setLatLng(ll); i.map.setView(ll, Math.max(i.map.getZoom(), 16)) }
  }, [ll])
  useEffect(() => {
    const i = inst.current; if (!i) return
    if (sat) { i.map.removeLayer(i.street); i.sat.addTo(i.map) } else { i.map.removeLayer(i.sat); i.street.addTo(i.map) }
  }, [sat])
  return (
    <div className={'minimap-wrap' + (sat ? ' sat' : '')}>
      <div className="minimap" ref={el} aria-label="Mapa para acertar o lugar: arraste o alfinete ou toque no ponto certo" />
      <button className="mm-toggle" type="button" id="mm-sat" aria-pressed={sat} onClick={() => setSat(!sat)}>{sat ? 'Mapa' : 'Satélite'}</button>
    </div>
  )
}
