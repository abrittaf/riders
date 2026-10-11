/**
 * Galería para la captura de referencia de la ruta (tarea 4.4 de roadmap-planning): un Roadmap
 * sintético con las cuatro clases de superficie sobre un fondo liso, sin teselas, para que la
 * imagen no dependa de la red ni de la versión del mapa. Se construye únicamente con
 * VITE_MAP_DIAGNOSTICS=true; no forma parte de la app publicada.
 */
import { Map as MapLibreMap, Marker, setWorkerUrl } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import 'maplibre-gl/dist/maplibre-gl.css'
import { StrictMode, useEffect, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { I18nextProvider } from 'react-i18next'
import { createI18n } from '../../i18n/i18n.ts'
import '../../index.css'
import { SurfaceLegend } from '../../roadmap-planning/SurfaceLegend.tsx'
import type { GeoPosition } from '../geo.ts'
import type { RouteLegDisplay } from '../map-view.ts'
import { ROUTE_LINE_DASHES, ROUTE_SOURCE_ID, setRoute } from './route-layers.ts'

setWorkerUrl(workerUrl)

const CENTER: [number, number] = [-66.2, -25.1]

/** Dos tramos: pavimento, consolidado y suelto en el primero; sin dato y pavimento en el segundo. */
function sampleRoute(): { route: RouteLegDisplay[]; points: GeoPosition[] } {
  const along = (count: number, from: GeoPosition, to: GeoPosition) =>
    Array.from({ length: count }, (_, index) => {
      const t = index / (count - 1)
      return {
        latitude: from.latitude + (to.latitude - from.latitude) * t,
        longitude:
          from.longitude +
          (to.longitude - from.longitude) * t +
          Math.sin(t * Math.PI * 2) * 0.01,
      }
    })
  const a = { latitude: -25.0, longitude: -66.3 }
  const b = { latitude: -25.1, longitude: -66.1 }
  const c = { latitude: -25.2, longitude: -66.3 }
  return {
    points: [a, b, c],
    route: [
      {
        geometry: along(31, a, b),
        surfaces: [
          { fromIndex: 0, toIndex: 10, surface: 'paved' },
          { fromIndex: 10, toIndex: 20, surface: 'compacted' },
          { fromIndex: 20, toIndex: 30, surface: 'loose' },
        ],
      },
      {
        geometry: along(21, b, c),
        surfaces: [
          { fromIndex: 0, toIndex: 10, surface: 'unknown' },
          { fromIndex: 10, toIndex: 20, surface: 'paved' },
        ],
      },
    ],
  }
}

/**
 * Lo que las pruebas verifican de la estructura dibujada, sin depender de píxeles: qué trazo tiene
 * la capa de cada superficie y qué superficies hay en la ruta.
 */
function exposeRouteStructure(map: MapLibreMap, container: HTMLElement) {
  const dashes = Object.fromEntries(
    Object.keys(ROUTE_LINE_DASHES).map((surface) => [
      surface,
      map.getPaintProperty(`roadmap-route-${surface}`, 'line-dasharray') ??
        null,
    ]),
  )
  container.dataset.routeLayerDashes = JSON.stringify(dashes)
  container.dataset.routeSurfaces = [
    ...new Set(
      map
        .querySourceFeatures(ROUTE_SOURCE_ID)
        .map((feature) => String(feature.properties?.['surface'])),
    ),
  ]
    .sort()
    .join(',')
}

export function RouteSample() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current!
    const map = new MapLibreMap({
      container,
      style: {
        version: 8,
        sources: {},
        layers: [
          {
            id: 'background',
            type: 'background',
            paint: { 'background-color': '#f2efe9' },
          },
        ],
      },
      center: CENTER,
      zoom: 9.8,
      interactive: false,
      attributionControl: false,
    })
    const { route, points } = sampleRoute()
    map.on('load', () => {
      setRoute(map, route)
      points.forEach((point, index) => {
        const element = document.createElement('div')
        element.className = 'map-marker map-marker-point'
        element.textContent = String(index + 1)
        new Marker({ element })
          .setLngLat([point.longitude, point.latitude])
          .addTo(map)
      })
    })
    map.on('idle', () => {
      if (map.getSource(ROUTE_SOURCE_ID)) exposeRouteStructure(map, container)
      container.dataset.mapIdle = 'true'
    })
    return () => map.remove()
  }, [])

  return (
    <div
      ref={containerRef}
      className="map-view route-gallery-map"
      data-testid="route-sample"
    />
  )
}

const i18n = createI18n({
  deviceLanguages: ['es-AR'],
  preference: { read: () => null, write: () => {} },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nextProvider i18n={i18n}>
      <main className="route-gallery">
        <RouteSample />
        <SurfaceLegend />
      </main>
    </I18nextProvider>
  </StrictMode>,
)
