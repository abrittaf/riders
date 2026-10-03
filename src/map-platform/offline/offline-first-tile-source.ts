import type { Tile, TileCoordinates, TileSource } from '../tile-source.ts'

export interface StoredTiles {
  findTile(coordinates: TileCoordinates): Promise<Tile | null>
}

/** Busca cada tesela primero en el celular y después en la red: sin conexión el mapa se arma con lo guardado. */
export class OfflineFirstTileSource implements TileSource {
  private readonly storedTiles: StoredTiles
  private readonly network: TileSource

  constructor(storedTiles: StoredTiles, network: TileSource) {
    this.storedTiles = storedTiles
    this.network = network
  }

  async getTile(
    coordinates: TileCoordinates,
    signal?: AbortSignal,
  ): Promise<Tile> {
    const stored = await this.findStored(coordinates)
    return stored ?? this.network.getTile(coordinates, signal)
  }

  private async findStored(coordinates: TileCoordinates): Promise<Tile | null> {
    try {
      return await this.storedTiles.findTile(coordinates)
    } catch {
      // Si el almacenamiento del celular falla, el mapa sigue funcionando con la red.
      return null
    }
  }
}
