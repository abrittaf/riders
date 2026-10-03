import { PMTiles, type Source } from 'pmtiles'
import {
  type Tile,
  type TileCoordinates,
  type TileSource,
  TileUnavailableError,
} from '../../tile-source.ts'

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

/** Teselas leídas de un único archivo PMTiles, por dirección o desde una fuente de bytes. */
export class PmtilesTileSource implements TileSource {
  private readonly archive: PMTiles

  constructor(archive: string | Source) {
    this.archive = new PMTiles(archive)
  }

  async getTile(
    coordinates: TileCoordinates,
    signal?: AbortSignal,
  ): Promise<Tile> {
    try {
      const header = await this.archive.getHeader()
      const tile = await this.archive.getZxy(
        coordinates.z,
        coordinates.x,
        coordinates.y,
        signal,
      )
      if (!tile) throw new Error('El archivo no contiene la tesela')
      return { data: tile.data, version: header.etag ?? 'pmtiles' }
    } catch (error) {
      if (isAbort(error)) throw error
      throw new TileUnavailableError(coordinates, { cause: error })
    }
  }
}
