// A extensão leaflet-rotate espera o Leaflet como variável global; este módulo roda antes dela.
import L from 'leaflet'
;(globalThis as unknown as { L: typeof L }).L = L
