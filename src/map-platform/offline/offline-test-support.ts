import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { FakeConnectivity } from '../../test-support/fakes.ts'
import {
  type Tile,
  type TileCoordinates,
  tileKey,
  type TileSource,
  TileUnavailableError,
} from '../tile-source.ts'
import type { DeviceStorage, StorageEstimate } from './device-storage.ts'
import {
  IndexedDbOfflineRegionStore,
  type OfflineRegionStoreDependencies,
} from './indexeddb-offline-region-store.ts'
import { MapDatabase } from './map-database.ts'

/** Servidor de teselas simulado: la prueba decide el tamaño, la versión y cuándo se corta la red. */
export class SimulatedTileServer implements TileSource {
  readonly requested: string[] = []
  online = true
  version = '20260927_080001_pt'
  tileSizeInBytes = 1_000
  /** Corta la red después de entregar esta cantidad de teselas. */
  goOfflineAfter: number | null = null
  maxSimultaneousRequests = 0
  private inFlight = 0
  private delivered = 0

  async getTile(coordinates: TileCoordinates): Promise<Tile> {
    this.requested.push(tileKey(coordinates))
    this.inFlight++
    this.maxSimultaneousRequests = Math.max(
      this.maxSimultaneousRequests,
      this.inFlight,
    )
    try {
      await new Promise((resolve) => setTimeout(resolve, 1))
      if (
        this.goOfflineAfter !== null &&
        this.delivered >= this.goOfflineAfter
      ) {
        this.online = false
      }
      if (!this.online) throw new TileUnavailableError(coordinates)
      this.delivered++
      return {
        data: new ArrayBuffer(this.tileSizeInBytes),
        version: this.version,
      }
    } finally {
      this.inFlight--
    }
  }

  restoreNetwork() {
    this.online = true
    this.goOfflineAfter = null
  }
}

export class SimulatedDeviceStorage implements DeviceStorage {
  persistent = false
  persistenceRequests = 0
  space: StorageEstimate | null = {
    usageInBytes: 0,
    quotaInBytes: 10 * 1024 * 1024 * 1024,
  }

  estimate() {
    return Promise.resolve(this.space)
  }

  isPersistent() {
    return Promise.resolve(this.persistent)
  }

  requestPersistence() {
    this.persistenceRequests++
    this.persistent = true
    return Promise.resolve(true)
  }
}

export function resetStoredMapData() {
  globalThis.indexedDB = new IDBFactory()
}

export function createStoreForTest(
  overrides: Partial<OfflineRegionStoreDependencies> = {},
) {
  const server = new SimulatedTileServer()
  const deviceStorage = new SimulatedDeviceStorage()
  const connectivity = new FakeConnectivity()
  const database = new MapDatabase()
  const storedResourceUrls: string[] = []
  let regionCount = 0
  const store = new IndexedDbOfflineRegionStore({
    database,
    networkTileSource: server,
    mapResources: {
      ensureStored: (urls) => {
        storedResourceUrls.push(...urls)
        return Promise.resolve()
      },
    },
    offlineResourceUrls: ['https://mapas.example/fonts/0-255.pbf'],
    deviceStorage,
    connectivity,
    zoomLevels: { minZoom: 0, maxZoom: 14 },
    maxTilesPerRegion: 100,
    downloadConcurrency: 4,
    lowStorageThresholdInBytes: 100 * 1024 * 1024,
    now: () => new Date('2026-10-03T12:00:00Z'),
    newRegionId: () => `zona-${++regionCount}`,
    ...overrides,
  })
  return {
    store,
    server,
    deviceStorage,
    connectivity,
    database,
    storedResourceUrls,
  }
}
