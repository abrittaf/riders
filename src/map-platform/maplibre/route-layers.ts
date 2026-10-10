import type { Feature, FeatureCollection } from 'geojson'
import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl'
import type { RouteLegDisplay } from '../map-view.ts'
import type { RoadSurface } from '../route-provider.ts'

export const ROUTE_SOURCE_ID = 'roadmap-route'

/**
 * Estilo de línea por superficie (design.md de roadmap-planning, D1b), con la convención del mapa
 * oficial de OpenStreetMap: continua, discontinua, punteada, punto y raya. Las longitudes van en
 * múltiplos del ancho de la línea.
 */
export const ROUTE_LINE_DASHES: Record<RoadSurface, number[] | null> = {
  paved: null,
  compacted: [2.5, 1.5],
  loose: [0.6, 1.4],
  unknown: [2.5, 1.5, 0.6, 1.5],
}

const ROUTE_COLOR = '#c2185b'
const ROUTE_CASING_COLOR = '#ffffff'
const ROUTE_WIDTH = 5

export const ROUTE_LAYER_IDS = [
  'roadmap-route-casing',
  ...Object.keys(ROUTE_LINE_DASHES).map(
    (surface) => `roadmap-route-${surface}`,
  ),
]

/** Un GeoJSON con una línea por segmento de superficie, en el orden de los tramos. */
export function routeGeoJson(
  route: readonly RouteLegDisplay[],
): FeatureCollection {
  const features: Feature[] = []
  route.forEach((leg, legIndex) => {
    for (const segment of leg.surfaces) {
      const coordinates = leg.geometry
        .slice(segment.fromIndex, segment.toIndex + 1)
        .map((position) => [position.longitude, position.latitude])
      if (coordinates.length < 2) continue
      features.push({
        type: 'Feature',
        properties: { surface: segment.surface, leg: legIndex },
        geometry: { type: 'LineString', coordinates },
      })
    }
  })
  return { type: 'FeatureCollection', features }
}

/** Crea la fuente y las capas de la ruta una vez; después solo cambian los datos. */
export function ensureRouteLayers(map: MapLibreMap) {
  if (map.getSource(ROUTE_SOURCE_ID)) return
  map.addSource(ROUTE_SOURCE_ID, {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
  })
  map.addLayer({
    id: 'roadmap-route-casing',
    type: 'line',
    source: ROUTE_SOURCE_ID,
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': ROUTE_CASING_COLOR, 'line-width': ROUTE_WIDTH + 3 },
  })
  for (const [surface, dashes] of Object.entries(ROUTE_LINE_DASHES)) {
    map.addLayer({
      id: `roadmap-route-${surface}`,
      type: 'line',
      source: ROUTE_SOURCE_ID,
      filter: ['==', ['get', 'surface'], surface],
      layout: {
        'line-cap': dashes ? 'butt' : 'round',
        'line-join': 'round',
      },
      paint: {
        'line-color': ROUTE_COLOR,
        'line-width': ROUTE_WIDTH,
        ...(dashes ? { 'line-dasharray': dashes } : {}),
      },
    })
  }
}

export function setRoute(map: MapLibreMap, route: readonly RouteLegDisplay[]) {
  ensureRouteLayers(map)
  const source = map.getSource(ROUTE_SOURCE_ID) as GeoJSONSource
  source.setData(routeGeoJson(route))
}
