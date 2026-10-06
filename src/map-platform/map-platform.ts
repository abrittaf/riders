import type { GeoPosition } from './geo.ts'
import type { Geolocation } from './geolocation.ts'
import type { MapAttribution } from './map-provider.ts'
import type { MapView } from './map-view.ts'
import type { OfflineRegionStore } from './offline-region-store.ts'
import type { PlaceSearch } from './place-search.ts'
import type { RouteProvider } from './route-provider.ts'
import type { TileSource } from './tile-source.ts'

export type TileProviderName = 'openfreemap' | 'pmtiles-sample'

export interface MapPlatformConfig {
  tileProvider: TileProviderName
  openFreeMap: { serverUrl: string; tileSetName: string; styleName: string }
  pmtilesSample: { archiveUrl: string }
  routing: {
    serverUrl: string
    costing: string
    /** Condición de uso de la instancia comunitaria: una consulta por segundo. */
    minIntervalBetweenRequestsInMs: number
  }
  placeSearch: {
    serverUrl: string
    maxResults: number
    minIntervalBetweenRequestsInMs: number
  }
  initialView: { center: GeoPosition; zoom: number }
  offlineRegions: {
    maxTilesPerRegion: number
    downloadConcurrency: number
    lowStorageThresholdInBytes: number
  }
  exposeRenderDiagnostics: boolean
}

/** Todo lo que la app necesita del mapa, sin saber qué proveedor hay detrás. */
export interface MapPlatform {
  MapView: MapView
  tileSource: TileSource
  offlineRegions: OfflineRegionStore
  geolocation: Geolocation
  routeProvider: RouteProvider
  placeSearch: PlaceSearch
  /** Fuentes del mapa que exigen ser mencionadas; las del ruteo y la búsqueda las informa cada proveedor. */
  attributions: readonly MapAttribution[]
}
