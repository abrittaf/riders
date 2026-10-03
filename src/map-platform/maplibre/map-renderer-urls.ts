import type { TileCoordinates } from '../tile-source.ts'

/**
 * Direcciones con las que el renderizador pide teselas y recursos a la app (y no a un servidor):
 * así toda tesela pasa por el `TileSource` y todo recurso por el `MapResourceSource`.
 */
export interface MapRendererUrls {
  tileUrlTemplate: string
  resourceUrl(url: string): string
}

export const MAP_PROTOCOL = 'riders'

const TILE_PREFIX = `${MAP_PROTOCOL}://tile/`
const RESOURCE_PREFIX = `${MAP_PROTOCOL}://resource/`
const HTTPS_PREFIX = 'https://'

export const mapRendererUrls: MapRendererUrls = {
  tileUrlTemplate: `${TILE_PREFIX}{z}/{x}/{y}`,
  resourceUrl(url) {
    if (!url.startsWith(HTTPS_PREFIX)) {
      throw new Error(`Los recursos del mapa se sirven por HTTPS: ${url}`)
    }
    return RESOURCE_PREFIX + url.slice(HTTPS_PREFIX.length)
  },
}

export type MapRendererRequest =
  | { kind: 'tile'; coordinates: TileCoordinates }
  | { kind: 'resource'; url: string }

export function parseMapRendererUrl(url: string): MapRendererRequest {
  if (url.startsWith(TILE_PREFIX)) {
    const [z, x, y] = url.slice(TILE_PREFIX.length).split('/').map(Number)
    if (z === undefined || x === undefined || y === undefined) {
      throw new Error(`Dirección de tesela inválida: ${url}`)
    }
    return { kind: 'tile', coordinates: { z, x, y } }
  }
  if (url.startsWith(RESOURCE_PREFIX)) {
    return {
      kind: 'resource',
      url: HTTPS_PREFIX + url.slice(RESOURCE_PREFIX.length),
    }
  }
  throw new Error(`Dirección desconocida para el protocolo del mapa: ${url}`)
}
