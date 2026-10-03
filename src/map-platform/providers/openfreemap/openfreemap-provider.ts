import type {
  MapAttribution,
  MapProvider,
  MapStyle,
} from '../../map-provider.ts'
import type { MapRendererUrls } from '../../maplibre/map-renderer-urls.ts'
import type { TileSource } from '../../tile-source.ts'
import {
  buildOpenMapTilesStyle,
  openMapTilesOfflineResourceUrls,
} from './openfreemap-style.ts'
import { OpenFreeMapTileSource } from './openfreemap-tile-source.ts'

export interface OpenFreeMapConfig {
  serverUrl: string
  tileSetName: string
  styleName: string
}

export const OPEN_MAP_TILES_MAX_ZOOM = 14

export const OPEN_STREET_MAP_ATTRIBUTION: MapAttribution = {
  name: 'OpenStreetMap',
  url: 'https://www.openstreetmap.org/copyright',
  descriptionKey: 'map.sources.openStreetMap',
}

export const OPEN_MAP_TILES_ATTRIBUTION: MapAttribution = {
  name: 'OpenMapTiles',
  url: 'https://www.openmaptiles.org/',
  descriptionKey: 'map.sources.openMapTiles',
}

export const OPEN_FREE_MAP_ATTRIBUTION: MapAttribution = {
  name: 'OpenFreeMap',
  url: 'https://openfreemap.org',
  descriptionKey: 'map.sources.openFreeMap',
}

export class OpenFreeMapProvider implements MapProvider {
  readonly networkTileSource: TileSource
  readonly downloadTileSource: TileSource
  readonly maxZoom = OPEN_MAP_TILES_MAX_ZOOM
  readonly attributions = [
    OPEN_STREET_MAP_ATTRIBUTION,
    OPEN_MAP_TILES_ATTRIBUTION,
    OPEN_FREE_MAP_ATTRIBUTION,
  ]
  private readonly config: OpenFreeMapConfig
  private readonly rendererUrls: MapRendererUrls

  constructor(config: OpenFreeMapConfig, rendererUrls: MapRendererUrls) {
    this.config = config
    this.rendererUrls = rendererUrls
    this.networkTileSource = new OpenFreeMapTileSource(config, 'default')
    this.downloadTileSource = new OpenFreeMapTileSource(config, 'no-store')
  }

  buildStyle(language: string): MapStyle {
    return buildOpenMapTilesStyle({
      styleName: this.config.styleName,
      serverUrl: this.config.serverUrl,
      language,
      tileUrlTemplate: this.rendererUrls.tileUrlTemplate,
      resourceUrl: this.rendererUrls.resourceUrl,
      maxZoom: this.maxZoom,
    })
  }

  offlineResourceUrls(): string[] {
    return openMapTilesOfflineResourceUrls(this.config)
  }
}
