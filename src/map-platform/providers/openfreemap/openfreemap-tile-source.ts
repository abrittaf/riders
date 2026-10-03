import {
  type Tile,
  type TileCoordinates,
  type TileSource,
  TileUnavailableError,
} from '../../tile-source.ts'

export interface OpenFreeMapServerConfig {
  serverUrl: string
  tileSetName: string
}

/**
 * `default`: el navegador reutiliza las teselas que ya bajó, como en cualquier mapa web.
 * `no-store`: las teselas no pasan por la caché del navegador; para descargas de zonas, que la app
 * guarda por su cuenta y no deben ocupar espacio dos veces.
 */
export type TileHttpCaching = 'default' | 'no-store'

interface PublishedTileSet {
  urlTemplate: string
  version: string
}

const TILE_SET_MAX_AGE_IN_MS = 6 * 60 * 60 * 1000

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

/**
 * Teselas de la instancia de OpenFreeMap. El servidor publica en `<servidor>/<conjunto>` un TileJSON
 * con la dirección de la compilación vigente, que cambia con cada actualización de los datos.
 */
export class OpenFreeMapTileSource implements TileSource {
  private readonly config: OpenFreeMapServerConfig
  private readonly httpCaching: TileHttpCaching
  private readonly fetchFromServer: typeof fetch
  private readonly now: () => number
  private tileSet: {
    published: Promise<PublishedTileSet>
    requestedAt: number
  } | null = null

  constructor(
    config: OpenFreeMapServerConfig,
    httpCaching: TileHttpCaching = 'default',
    fetchFromServer: typeof fetch = (...args) => fetch(...args),
    now: () => number = Date.now,
  ) {
    this.config = config
    this.httpCaching = httpCaching
    this.fetchFromServer = fetchFromServer
    this.now = now
  }

  async getTile(
    coordinates: TileCoordinates,
    signal?: AbortSignal,
  ): Promise<Tile> {
    try {
      const tileSet = await this.currentTileSet()
      const url = tileSet.urlTemplate
        .replace('{z}', String(coordinates.z))
        .replace('{x}', String(coordinates.x))
        .replace('{y}', String(coordinates.y))
      const response = await this.fetchFromServer(url, {
        signal,
        cache: this.httpCaching,
      })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} al pedir ${url}`)
      }
      return { data: await response.arrayBuffer(), version: tileSet.version }
    } catch (error) {
      if (isAbort(error)) throw error
      throw new TileUnavailableError(coordinates, { cause: error })
    }
  }

  private currentTileSet(): Promise<PublishedTileSet> {
    const isFresh =
      this.tileSet !== null &&
      this.now() - this.tileSet.requestedAt < TILE_SET_MAX_AGE_IN_MS
    if (!isFresh) {
      const published = this.fetchPublishedTileSet()
      const requested = { published, requestedAt: this.now() }
      this.tileSet = requested
      published.catch(() => {
        if (this.tileSet === requested) this.tileSet = null
      })
    }
    return this.tileSet!.published
  }

  private async fetchPublishedTileSet(): Promise<PublishedTileSet> {
    const tileJsonUrl = `${this.config.serverUrl}/${this.config.tileSetName}`
    const response = await this.fetchFromServer(tileJsonUrl)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} al pedir ${tileJsonUrl}`)
    }
    const tileJson = (await response.json()) as { tiles?: string[] }
    const urlTemplate = tileJson.tiles?.[0]
    if (!urlTemplate) {
      throw new Error(`${tileJsonUrl} no informa la dirección de las teselas`)
    }
    return { urlTemplate, version: versionOf(urlTemplate) }
  }
}

/** `https://servidor/planet/20260927_080001_pt/{z}/{x}/{y}.pbf` → `20260927_080001_pt` */
function versionOf(urlTemplate: string): string {
  const segments = urlTemplate.split('/')
  const zoomSegment = segments.indexOf('{z}')
  return (
    (zoomSegment > 0 ? segments[zoomSegment - 1] : undefined) ?? urlTemplate
  )
}
