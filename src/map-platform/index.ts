/**
 * Interfaz pública de `map-platform`: el único módulo que conoce al renderizador y a los proveedores
 * de mapa. El resto de la app importa solo desde acá (salvo `create-map-platform.ts`, que la raíz de
 * composición de la app usa una vez al arrancar).
 */
export type { GeoBounds, GeoPosition } from './geo.ts'
export { boundsCenter, boundsIntersect, distanceInMeters } from './geo.ts'
export type {
  Geolocation,
  GeolocationState,
  LocationPermission,
} from './geolocation.ts'
export type { MapPlatform, MapPlatformConfig } from './map-platform.ts'
export type { MapAttribution } from './map-provider.ts'
export type {
  MapMarker,
  MapMarkerKind,
  MapView,
  MapViewHandle,
  MapViewProps,
  OwnPositionMarker,
} from './map-view.ts'
export type {
  DownloadPauseReason,
  DownloadPlan,
  OfflineRegion,
  OfflineRegionStatus,
  OfflineRegionStore,
  StorageUsage,
} from './offline-region-store.ts'
export { DownloadNotAllowedError } from './offline-region-store.ts'
export type { Place, PlaceType } from './place.ts'
export type { PlaceSearch } from './place-search.ts'
export { PlaceSearchUnavailableError } from './place-search.ts'
export type { PolylinePrecision } from './polyline.ts'
export { decodePolyline, encodePolyline } from './polyline.ts'
export type {
  RoadPreference,
  RoadSurface,
  Route,
  RouteLeg,
  RouteLimit,
  RouteProvider,
  RouteRequest,
  SurfaceSegment,
} from './route-provider.ts'
export {
  NoRouteError,
  RouteLimitExceededError,
  RouteServiceUnavailableError,
} from './route-provider.ts'
export type { Tile, TileCoordinates, TileSource } from './tile-source.ts'
export { TileUnavailableError } from './tile-source.ts'
