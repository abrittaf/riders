import {
  boundsCenter,
  type GeoPosition,
  type Geolocation,
  type MapViewHandle,
} from '../map-platform/index.ts'

/**
 * Desde dónde se miden las distancias y se prioriza la búsqueda: la posición del Rider si se
 * conoce; si no, el centro del mapa, que es lo que está mirando.
 */
export function referencePosition(
  geolocation: Geolocation,
  map: MapViewHandle | null,
): GeoPosition | null {
  const own = geolocation.getState().lastKnownPosition
  if (own) return own
  return map ? boundsCenter(map.getVisibleBounds()) : null
}
