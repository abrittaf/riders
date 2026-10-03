import { type DBSchema, type IDBPDatabase, openDB } from 'idb'
import type { GeoBounds } from '../geo.ts'
import type {
  DownloadPauseReason,
  OfflineRegionStatus,
} from '../offline-region-store.ts'
import { type Tile, type TileCoordinates, tileKey } from '../tile-source.ts'
import type { ObservedTileSizes } from './tile-size-estimator.ts'

export interface StoredRegion {
  id: string
  name: string
  bounds: GeoBounds
  status: OfflineRegionStatus
  pauseReason: DownloadPauseReason | null
  totalTileCount: number
  downloadedTileCount: number
  sizeInBytes: number
  downloadedAt: number
  /** Aumenta con cada «actualizar zona»: una tesela cuenta como descargada solo si es de la generación vigente. */
  generation: number
}

interface StoredTile extends TileCoordinates {
  regionId: string
  data: ArrayBuffer
  sizeInBytes: number
  version: string
  generation: number
}

interface MapDatabaseSchema extends DBSchema {
  regions: { key: string; value: StoredRegion }
  tiles: {
    key: [string, number, number, number]
    value: StoredTile
    indexes: {
      'by-coordinates': [number, number, number]
      'by-region-generation': [string, number]
    }
  }
  resources: { key: string; value: { url: string; data: ArrayBuffer } }
  'tile-size-stats': { key: number; value: ObservedTileSizes & { z: number } }
}

const DATABASE_NAME = 'riders-map'

function allTilesOfRegion(regionId: string): IDBKeyRange {
  // En IndexedDB un arreglo ordena después de cualquier número: [id, []] es mayor que toda clave [id, z, x, y].
  return IDBKeyRange.bound([regionId], [regionId, []])
}

/** Zonas, teselas y recursos del mapa guardados en el celular (IndexedDB). */
export class MapDatabase {
  private readonly database: Promise<IDBPDatabase<MapDatabaseSchema>>

  constructor() {
    this.database = openDB<MapDatabaseSchema>(DATABASE_NAME, 1, {
      upgrade(database) {
        database.createObjectStore('regions', { keyPath: 'id' })
        const tiles = database.createObjectStore('tiles', {
          keyPath: ['regionId', 'z', 'x', 'y'],
        })
        tiles.createIndex('by-coordinates', ['z', 'x', 'y'])
        tiles.createIndex('by-region-generation', ['regionId', 'generation'])
        database.createObjectStore('resources', { keyPath: 'url' })
        database.createObjectStore('tile-size-stats', { keyPath: 'z' })
      },
    })
  }

  async findTile({ z, x, y }: TileCoordinates): Promise<Tile | null> {
    const database = await this.database
    const stored = await database.getFromIndex('tiles', 'by-coordinates', [
      z,
      x,
      y,
    ])
    return stored ? { data: stored.data, version: stored.version } : null
  }

  /**
   * Guarda una tesela recién descargada y actualiza, en la misma transacción, el avance de la zona
   * y las mediciones de tamaño. Devuelve la zona actualizada, o `null` si la zona ya no existe.
   */
  async storeDownloadedTile(
    regionId: string,
    coordinates: TileCoordinates,
    tile: Tile,
  ): Promise<StoredRegion | null> {
    const database = await this.database
    const transaction = database.transaction(
      ['regions', 'tiles', 'tile-size-stats'],
      'readwrite',
    )
    const regions = transaction.objectStore('regions')
    const tiles = transaction.objectStore('tiles')
    const stats = transaction.objectStore('tile-size-stats')

    const region = await regions.get(regionId)
    if (!region) {
      await transaction.done
      return null
    }
    const { z, x, y } = coordinates
    const previous = await tiles.get([regionId, z, x, y])
    const sizeInBytes = tile.data.byteLength
    await tiles.put({
      regionId,
      z,
      x,
      y,
      data: tile.data,
      sizeInBytes,
      version: tile.version,
      generation: region.generation,
    })
    const updatedRegion: StoredRegion = {
      ...region,
      downloadedTileCount:
        region.downloadedTileCount +
        (previous?.generation === region.generation ? 0 : 1),
      sizeInBytes:
        region.sizeInBytes + sizeInBytes - (previous?.sizeInBytes ?? 0),
    }
    await regions.put(updatedRegion)
    const observed = (await stats.get(z)) ?? { z, count: 0, totalBytes: 0 }
    await stats.put({
      z,
      count: observed.count + 1,
      totalBytes: observed.totalBytes + sizeInBytes,
    })
    await transaction.done
    return updatedRegion
  }

  /** Claves `z/x/y` de las teselas de la zona ya descargadas en la generación indicada. */
  async downloadedTileKeys(
    regionId: string,
    generation: number,
  ): Promise<Set<string>> {
    const database = await this.database
    const keys = await database.getAllKeysFromIndex(
      'tiles',
      'by-region-generation',
      IDBKeyRange.only([regionId, generation]),
    )
    return new Set(keys.map(([, z, x, y]) => tileKey({ z, x, y })))
  }

  async tileVersions(regionId: string): Promise<Set<string>> {
    const database = await this.database
    const tiles = await database.getAll('tiles', allTilesOfRegion(regionId))
    return new Set(tiles.map((tile) => tile.version))
  }

  async getRegion(regionId: string): Promise<StoredRegion | null> {
    return (await (await this.database).get('regions', regionId)) ?? null
  }

  async listRegions(): Promise<StoredRegion[]> {
    return (await this.database).getAll('regions')
  }

  async putRegion(region: StoredRegion): Promise<void> {
    await (await this.database).put('regions', region)
  }

  /** Cambia campos de la zona sin pisar el avance que una descarga en curso pueda estar escribiendo. */
  async updateRegion(
    regionId: string,
    changes: Partial<StoredRegion>,
  ): Promise<StoredRegion | null> {
    const database = await this.database
    const transaction = database.transaction('regions', 'readwrite')
    const region = await transaction.store.get(regionId)
    const updated = region ? { ...region, ...changes } : null
    if (updated) await transaction.store.put(updated)
    await transaction.done
    return updated
  }

  async deleteRegion(regionId: string): Promise<void> {
    const database = await this.database
    const transaction = database.transaction(['regions', 'tiles'], 'readwrite')
    await transaction.objectStore('tiles').delete(allTilesOfRegion(regionId))
    await transaction.objectStore('regions').delete(regionId)
    await transaction.done
  }

  async observedTileSizes(): Promise<Map<number, ObservedTileSizes>> {
    const stats = await (await this.database).getAll('tile-size-stats')
    return new Map(
      stats.map(({ z, count, totalBytes }) => [z, { count, totalBytes }]),
    )
  }

  async findResource(url: string): Promise<ArrayBuffer | null> {
    return (await (await this.database).get('resources', url))?.data ?? null
  }

  async storeResource(url: string, data: ArrayBuffer): Promise<void> {
    await (await this.database).put('resources', { url, data })
  }
}
