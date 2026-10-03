import type { GeoBounds } from './geo.ts'

export type OfflineRegionStatus = 'downloading' | 'paused' | 'complete'

export type DownloadPauseReason = 'connectivity' | 'manual' | 'storage-full'

export interface OfflineRegion {
  id: string
  name: string
  bounds: GeoBounds
  status: OfflineRegionStatus
  pauseReason: DownloadPauseReason | null
  totalTileCount: number
  downloadedTileCount: number
  sizeInBytes: number
  /** Fecha en que se inició la descarga (o la última actualización) de la zona. */
  downloadedAt: Date
}

export type DownloadPlan =
  | { outcome: 'ready'; tileCount: number; estimatedSizeInBytes: number }
  | {
      outcome: 'too-large'
      tileCount: number
      maxTileCount: number
      /** Cuántos niveles hay que acercar el mapa para que la zona visible entre en el límite. */
      zoomLevelsToZoomIn: number
    }
  | {
      outcome: 'insufficient-space'
      estimatedSizeInBytes: number
      availableBytes: number
    }

export interface StorageUsage {
  regionsSizeInBytes: number
  /** `null` cuando el navegador no informa el espacio disponible. */
  availableBytes: number | null
  isRunningLow: boolean
}

export class DownloadNotAllowedError extends Error {
  readonly plan: DownloadPlan

  constructor(plan: DownloadPlan) {
    super(`La zona no se puede descargar: ${plan.outcome}`)
    this.name = 'DownloadNotAllowedError'
    this.plan = plan
  }
}

/** Zonas del mapa guardadas en el celular para verlas sin conexión. */
export interface OfflineRegionStore {
  /** Pide almacenamiento persistente (una sola vez) y retoma las descargas interrumpidas. */
  initialize(): Promise<void>
  planDownload(bounds: GeoBounds): Promise<DownloadPlan>
  /** @throws DownloadNotAllowedError si la zona supera el límite o no entra en el espacio disponible. */
  startDownload(name: string, bounds: GeoBounds): Promise<OfflineRegion>
  pauseDownload(regionId: string): Promise<void>
  resumeDownload(regionId: string): Promise<void>
  /** Vuelve a descargar la zona completa con la versión vigente de las teselas. */
  refreshRegion(regionId: string): Promise<void>
  deleteRegion(regionId: string): Promise<void>
  listRegions(): Promise<OfflineRegion[]>
  getStorageUsage(): Promise<StorageUsage>
  subscribe(listener: () => void): () => void
}
