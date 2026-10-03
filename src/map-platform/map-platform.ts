import type { GeoPosition } from './geo.ts'
import type { Geolocation } from './geolocation.ts'
import type { MapAttribution } from './map-provider.ts'
import type { MapView } from './map-view.ts'
import type { OfflineRegionStore } from './offline-region-store.ts'
import type { TileSource } from './tile-source.ts'

export type TileProviderName = 'openfreemap' | 'pmtiles-sample'

export interface MapPlatformConfig {
  tileProvider: TileProviderName
  openFreeMap: { serverUrl: string; tileSetName: string; styleName: string }
  pmtilesSample: { archiveUrl: string }
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
  attributions: readonly MapAttribution[]
}
