import type { MapProvider, MapStyle } from '../../map-provider.ts'
import type { MapRendererUrls } from '../../maplibre/map-renderer-urls.ts'
import type { TileSource } from '../../tile-source.ts'
import {
  OPEN_MAP_TILES_ATTRIBUTION,
  OPEN_MAP_TILES_MAX_ZOOM,
  OPEN_STREET_MAP_ATTRIBUTION,
} from '../openfreemap/openfreemap-provider.ts'
import {
  buildOpenMapTilesStyle,
  openMapTilesOfflineResourceUrls,
} from '../openfreemap/openfreemap-style.ts'
import { PmtilesTileSource } from './pmtiles-tile-source.ts'

export interface PmtilesSampleConfig {
  archiveUrl: string
  /** El archivo usa el esquema OpenMapTiles: se dibuja con el mismo estilo, glifos e íconos. */
  style: { serverUrl: string; styleName: string }
}

/**
 * Segundo proveedor, de ejemplo: las teselas salen de un archivo PMTiles en lugar de un servidor.
 * Es la ruta de salida documentada si OpenFreeMap dejara de estar disponible (design.md, D3).
 */
export class PmtilesSampleProvider implements MapProvider {
  readonly networkTileSource: TileSource
  readonly downloadTileSource: TileSource
  readonly maxZoom = OPEN_MAP_TILES_MAX_ZOOM
  readonly attributions = [
    OPEN_STREET_MAP_ATTRIBUTION,
    OPEN_MAP_TILES_ATTRIBUTION,
  ]
  private readonly config: PmtilesSampleConfig
  private readonly rendererUrls: MapRendererUrls

  constructor(config: PmtilesSampleConfig, rendererUrls: MapRendererUrls) {
    this.config = config
    this.rendererUrls = rendererUrls
    this.networkTileSource = new PmtilesTileSource(config.archiveUrl)
    this.downloadTileSource = this.networkTileSource
  }

  buildStyle(language: string): MapStyle {
    return buildOpenMapTilesStyle({
      ...this.config.style,
      language,
      tileUrlTemplate: this.rendererUrls.tileUrlTemplate,
      resourceUrl: this.rendererUrls.resourceUrl,
      maxZoom: this.maxZoom,
    })
  }

  offlineResourceUrls(): string[] {
    return openMapTilesOfflineResourceUrls(this.config.style)
  }
}
