import type { Connectivity } from '../../connectivity/connectivity.ts'
import type { GeoBounds } from '../geo.ts'
import {
  DownloadNotAllowedError,
  type DownloadPauseReason,
  type DownloadPlan,
  type OfflineRegion,
  type OfflineRegionStore,
  type StorageUsage,
} from '../offline-region-store.ts'
import {
  tileCountsByZoom,
  tilesCovering,
  totalTileCount,
  zoomedInBounds,
  type ZoomLevels,
} from '../tile-math.ts'
import { tileKey, type TileSource } from '../tile-source.ts'
import type { DeviceStorage } from './device-storage.ts'
import type { MapDatabase, StoredRegion } from './map-database.ts'
import { TileSizeEstimator } from './tile-size-estimator.ts'

export interface OfflineRegionStoreDependencies {
  database: MapDatabase
  /** De dónde se descargan las teselas: siempre la red, nunca lo ya guardado. */
  networkTileSource: TileSource
  mapResources: { ensureStored(urls: readonly string[]): Promise<void> }
  offlineResourceUrls: readonly string[]
  deviceStorage: DeviceStorage
  connectivity: Connectivity
  zoomLevels: ZoomLevels
  maxTilesPerRegion: number
  downloadConcurrency: number
  lowStorageThresholdInBytes: number
  now?: () => Date
  newRegionId?: () => string
}

interface DownloadRun {
  abort: AbortController
  finished: Promise<void>
}

function isQuotaExceeded(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'QuotaExceededError'
}

function toOfflineRegion(stored: StoredRegion): OfflineRegion {
  return {
    id: stored.id,
    name: stored.name,
    bounds: stored.bounds,
    status: stored.status,
    pauseReason: stored.pauseReason,
    totalTileCount: stored.totalTileCount,
    downloadedTileCount: stored.downloadedTileCount,
    sizeInBytes: stored.sizeInBytes,
    downloadedAt: new Date(stored.downloadedAt),
  }
}

/** Zonas descargadas tesela por tesela desde la red y guardadas en IndexedDB (design.md, D4). */
export class IndexedDbOfflineRegionStore implements OfflineRegionStore {
  private readonly dependencies: OfflineRegionStoreDependencies
  private readonly database: MapDatabase
  private readonly now: () => Date
  private readonly newRegionId: () => string
  private readonly runs = new Map<string, DownloadRun>()
  private readonly listeners = new Set<() => void>()
  private initialization: Promise<void> | null = null
  private storageFilledUp = false

  constructor(dependencies: OfflineRegionStoreDependencies) {
    this.dependencies = dependencies
    this.database = dependencies.database
    this.now = dependencies.now ?? (() => new Date())
    this.newRegionId = dependencies.newRegionId ?? (() => crypto.randomUUID())
  }

  initialize(): Promise<void> {
    this.initialization ??= this.requestPersistenceAndResumeDownloads()
    return this.initialization
  }

  private async requestPersistenceAndResumeDownloads(): Promise<void> {
    const { deviceStorage, connectivity } = this.dependencies
    if (!(await deviceStorage.isPersistent())) {
      await deviceStorage.requestPersistence()
    }
    connectivity.subscribe(() => {
      if (connectivity.isOnline()) void this.resumeDownloadsWaitingForNetwork()
    })
    // Una zona que quedó «descargando» es de una apertura anterior de la app: la descarga se interrumpió.
    for (const region of await this.database.listRegions()) {
      if (region.status === 'downloading' && !this.runs.has(region.id)) {
        await this.database.updateRegion(region.id, {
          status: 'paused',
          pauseReason: 'connectivity',
        })
      }
    }
    if (connectivity.isOnline()) await this.resumeDownloadsWaitingForNetwork()
    this.notify()
  }

  private async resumeDownloadsWaitingForNetwork(): Promise<void> {
    for (const region of await this.database.listRegions()) {
      if (region.status === 'paused' && region.pauseReason === 'connectivity') {
        await this.resumeDownload(region.id)
      }
    }
  }

  async planDownload(bounds: GeoBounds): Promise<DownloadPlan> {
    const { zoomLevels, maxTilesPerRegion, deviceStorage } = this.dependencies
    const tileCount = totalTileCount(bounds, zoomLevels)
    if (tileCount > maxTilesPerRegion) {
      return {
        outcome: 'too-large',
        tileCount,
        maxTileCount: maxTilesPerRegion,
        zoomLevelsToZoomIn: this.zoomLevelsToFit(bounds),
      }
    }

    const estimator = new TileSizeEstimator(
      await this.database.observedTileSizes(),
    )
    const estimatedSizeInBytes = estimator.estimateSizeInBytes(
      tileCountsByZoom(bounds, zoomLevels),
    )
    const storage = await deviceStorage.estimate()
    if (storage) {
      const availableBytes = Math.max(
        storage.quotaInBytes - storage.usageInBytes,
        0,
      )
      if (estimatedSizeInBytes > availableBytes) {
        return {
          outcome: 'insufficient-space',
          estimatedSizeInBytes,
          availableBytes,
        }
      }
    }
    return { outcome: 'ready', tileCount, estimatedSizeInBytes }
  }

  private zoomLevelsToFit(bounds: GeoBounds): number {
    const { zoomLevels, maxTilesPerRegion } = this.dependencies
    let levels = 0
    let visible = bounds
    while (
      totalTileCount(visible, zoomLevels) > maxTilesPerRegion &&
      levels < zoomLevels.maxZoom
    ) {
      visible = zoomedInBounds(visible)
      levels++
    }
    return levels
  }

  async startDownload(name: string, bounds: GeoBounds): Promise<OfflineRegion> {
    const plan = await this.planDownload(bounds)
    if (plan.outcome !== 'ready') throw new DownloadNotAllowedError(plan)

    const region: StoredRegion = {
      id: this.newRegionId(),
      name,
      bounds,
      status: 'downloading',
      pauseReason: null,
      totalTileCount: plan.tileCount,
      downloadedTileCount: 0,
      sizeInBytes: 0,
      downloadedAt: this.now().getTime(),
      generation: 1,
    }
    await this.database.putRegion(region)
    this.startRun(region.id)
    this.notify()
    return toOfflineRegion(region)
  }

  async pauseDownload(regionId: string): Promise<void> {
    await this.stopRun(regionId)
    await this.pause(regionId, 'manual')
  }

  async resumeDownload(regionId: string): Promise<void> {
    if (this.runs.has(regionId)) return
    const region = await this.database.updateRegion(regionId, {
      status: 'downloading',
      pauseReason: null,
    })
    if (region) this.startRun(regionId)
    this.notify()
  }

  async refreshRegion(regionId: string): Promise<void> {
    await this.stopRun(regionId)
    const region = await this.database.getRegion(regionId)
    if (!region) return
    await this.database.updateRegion(regionId, {
      status: 'downloading',
      pauseReason: null,
      generation: region.generation + 1,
      downloadedTileCount: 0,
      downloadedAt: this.now().getTime(),
    })
    this.startRun(regionId)
    this.notify()
  }

  async deleteRegion(regionId: string): Promise<void> {
    await this.stopRun(regionId)
    await this.database.deleteRegion(regionId)
    this.storageFilledUp = false
    this.notify()
  }

  async listRegions(): Promise<OfflineRegion[]> {
    const regions = await this.database.listRegions()
    return regions
      .sort((a, b) => b.downloadedAt - a.downloadedAt)
      .map(toOfflineRegion)
  }

  async getStorageUsage(): Promise<StorageUsage> {
    const regions = await this.database.listRegions()
    const storage = await this.dependencies.deviceStorage.estimate()
    const availableBytes = storage
      ? Math.max(storage.quotaInBytes - storage.usageInBytes, 0)
      : null
    return {
      regionsSizeInBytes: regions.reduce(
        (total, region) => total + region.sizeInBytes,
        0,
      ),
      availableBytes,
      isRunningLow:
        this.storageFilledUp ||
        (availableBytes !== null &&
          availableBytes < this.dependencies.lowStorageThresholdInBytes),
    }
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify() {
    this.listeners.forEach((listener) => listener())
  }

  private startRun(regionId: string) {
    const abort = new AbortController()
    const finished = this.download(regionId, abort).finally(() => {
      if (this.runs.get(regionId)?.abort === abort) this.runs.delete(regionId)
      this.notify()
    })
    this.runs.set(regionId, { abort, finished })
  }

  private async stopRun(regionId: string): Promise<void> {
    const run = this.runs.get(regionId)
    if (!run) return
    run.abort.abort()
    await run.finished
  }

  private async pause(regionId: string, reason: DownloadPauseReason) {
    await this.database.updateRegion(regionId, {
      status: 'paused',
      pauseReason: reason,
    })
    this.notify()
  }

  private async download(regionId: string, abort: AbortController) {
    const { networkTileSource, mapResources, offlineResourceUrls } =
      this.dependencies
    const region = await this.database.getRegion(regionId)
    if (!region) return

    await mapResources.ensureStored(offlineResourceUrls)
    const alreadyDownloaded = await this.database.downloadedTileKeys(
      regionId,
      region.generation,
    )
    const pending = [
      ...tilesCovering(region.bounds, this.dependencies.zoomLevels),
    ].filter((tile) => !alreadyDownloaded.has(tileKey(tile)))

    let nextPending = 0
    let pauseReason: DownloadPauseReason | null = null
    const downloadPendingTiles = async () => {
      while (!abort.signal.aborted && nextPending < pending.length) {
        const coordinates = pending[nextPending++]!
        try {
          const tile = await networkTileSource.getTile(
            coordinates,
            abort.signal,
          )
          const updated = await this.database.storeDownloadedTile(
            regionId,
            coordinates,
            tile,
          )
          if (!updated) {
            abort.abort()
            return
          }
          this.notify()
        } catch (error) {
          if (abort.signal.aborted) return
          if (isQuotaExceeded(error)) this.storageFilledUp = true
          pauseReason = isQuotaExceeded(error) ? 'storage-full' : 'connectivity'
          abort.abort()
          return
        }
      }
    }
    await Promise.all(
      Array.from(
        { length: this.dependencies.downloadConcurrency },
        downloadPendingTiles,
      ),
    )

    if (pauseReason) {
      await this.pause(regionId, pauseReason)
    } else if (!abort.signal.aborted) {
      await this.database.updateRegion(regionId, {
        status: 'complete',
        pauseReason: null,
      })
    }
  }
}
