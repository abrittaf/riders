import type { Connectivity } from '../connectivity/connectivity.ts'
import {
  BrowserGeolocation,
  browserLocationApi,
} from './browser-geolocation.ts'
import type { MapPlatform, MapPlatformConfig } from './map-platform.ts'
import type { MapProvider } from './map-provider.ts'
import { NetworkMapResourceSource } from './map-resource-source.ts'
import { mapRendererUrls } from './maplibre/map-renderer-urls.ts'
import { MapLibreResourceProtocol } from './maplibre/maplibre-resource-protocol.ts'
import { createMapLibreMapView } from './maplibre/MapLibreMapView.tsx'
import { BrowserDeviceStorage } from './offline/device-storage.ts'
import { IndexedDbOfflineRegionStore } from './offline/indexeddb-offline-region-store.ts'
import { MapDatabase } from './offline/map-database.ts'
import { OfflineFirstTileSource } from './offline/offline-first-tile-source.ts'
import { StoredFirstMapResourceSource } from './offline/stored-first-map-resource-source.ts'
import { OpenFreeMapProvider } from './providers/openfreemap/openfreemap-provider.ts'
import { OPEN_MAP_TILES_VECTOR_SOURCE_ID } from './providers/openfreemap/openfreemap-style.ts'
import { PhotonPlaceSearch } from './providers/photon/photon-place-search.ts'
import { PmtilesSampleProvider } from './providers/pmtiles/pmtiles-sample-provider.ts'
import { RequestPacer } from './providers/request-pacer.ts'
import { ValhallaRouteProvider } from './providers/valhalla/valhalla-route-provider.ts'

function createProvider(config: MapPlatformConfig): MapProvider {
  switch (config.tileProvider) {
    case 'openfreemap':
      return new OpenFreeMapProvider(config.openFreeMap, mapRendererUrls)
    case 'pmtiles-sample':
      return new PmtilesSampleProvider(
        {
          archiveUrl: config.pmtilesSample.archiveUrl,
          style: config.openFreeMap,
        },
        mapRendererUrls,
      )
  }
}

/** Raíz de composición del módulo: único lugar donde se elige el proveedor de mapa. */
export function createMapPlatform(
  config: MapPlatformConfig,
  dependencies: { connectivity: Connectivity },
): MapPlatform {
  const provider = createProvider(config)
  const database = new MapDatabase()
  const tileSource = new OfflineFirstTileSource(
    database,
    provider.networkTileSource,
  )
  const mapResources = new StoredFirstMapResourceSource(
    database,
    new NetworkMapResourceSource(),
  )
  const protocol = new MapLibreResourceProtocol(tileSource, mapResources)
  protocol.register()

  const geolocation = new BrowserGeolocation(browserLocationApi())
  void geolocation.restorePermission()

  return {
    MapView: createMapLibreMapView({
      provider,
      protocol,
      vectorSourceId: OPEN_MAP_TILES_VECTOR_SOURCE_ID,
      initialView: config.initialView,
      exposeRenderDiagnostics: config.exposeRenderDiagnostics,
    }),
    tileSource,
    offlineRegions: new IndexedDbOfflineRegionStore({
      database,
      networkTileSource: provider.downloadTileSource,
      mapResources,
      offlineResourceUrls: provider.offlineResourceUrls(),
      deviceStorage: new BrowserDeviceStorage(),
      connectivity: dependencies.connectivity,
      zoomLevels: { minZoom: 0, maxZoom: provider.maxZoom },
      ...config.offlineRegions,
    }),
    geolocation,
    routeProvider: new ValhallaRouteProvider(
      config.routing,
      new RequestPacer(config.routing.minIntervalBetweenRequestsInMs),
    ),
    placeSearch: new PhotonPlaceSearch(
      config.placeSearch,
      new RequestPacer(config.placeSearch.minIntervalBetweenRequestsInMs),
    ),
    attributions: provider.attributions,
  }
}
