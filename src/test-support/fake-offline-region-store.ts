import { vi } from 'vitest'
import type {
  DownloadPlan,
  GeoBounds,
  OfflineRegion,
  OfflineRegionStore,
  StorageUsage,
} from '../map-platform/index.ts'

const MEGABYTE = 1024 * 1024

export function offlineRegion(
  traits: Partial<OfflineRegion> = {},
): OfflineRegion {
  return {
    id: 'zona-1',
    name: 'Cuesta del Obispo',
    bounds: { west: -66, south: -25.3, east: -65.7, north: -25.1 },
    status: 'complete',
    pauseReason: null,
    totalTileCount: 100,
    downloadedTileCount: 100,
    sizeInBytes: 12.5 * MEGABYTE,
    downloadedAt: new Date('2026-10-01T15:00:00Z'),
    ...traits,
  }
}

/** Almacén de zonas en memoria: las descargas terminan al instante y las acciones quedan registradas. */
export class FakeOfflineRegionStore implements OfflineRegionStore {
  regions: OfflineRegion[]
  plan: DownloadPlan = {
    outcome: 'ready',
    tileCount: 15,
    estimatedSizeInBytes: 3 * MEGABYTE,
  }
  availableBytes: number | null = 2048 * MEGABYTE
  isRunningLow = false
  private readonly listeners = new Set<() => void>()

  constructor(regions: OfflineRegion[] = []) {
    this.regions = regions
  }

  readonly initialize = vi.fn(() => Promise.resolve())
  readonly planDownload = vi.fn((_bounds: GeoBounds) =>
    Promise.resolve(this.plan),
  )
  readonly startDownload = vi.fn((name: string, bounds: GeoBounds) => {
    const region = offlineRegion({
      id: `zona-${this.regions.length + 1}`,
      name,
      bounds,
      sizeInBytes: 3 * MEGABYTE,
    })
    this.regions = [region, ...this.regions]
    this.notify()
    return Promise.resolve(region)
  })
  readonly pauseDownload = vi.fn((_regionId: string) => Promise.resolve())
  readonly resumeDownload = vi.fn((_regionId: string) => Promise.resolve())
  readonly refreshRegion = vi.fn((_regionId: string) => Promise.resolve())
  readonly deleteRegion = vi.fn((regionId: string) => {
    this.regions = this.regions.filter((region) => region.id !== regionId)
    this.notify()
    return Promise.resolve()
  })

  listRegions(): Promise<OfflineRegion[]> {
    return Promise.resolve(this.regions)
  }

  getStorageUsage(): Promise<StorageUsage> {
    return Promise.resolve({
      regionsSizeInBytes: this.regions.reduce(
        (total, region) => total + region.sizeInBytes,
        0,
      ),
      availableBytes: this.availableBytes,
      isRunningLow: this.isRunningLow,
    })
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify() {
    this.listeners.forEach((listener) => listener())
  }
}
