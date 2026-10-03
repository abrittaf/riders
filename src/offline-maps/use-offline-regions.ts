import { useEffect, useState } from 'react'
import type {
  OfflineRegion,
  OfflineRegionStore,
  StorageUsage,
} from '../map-platform/index.ts'

export interface OfflineRegionsSnapshot {
  regions: OfflineRegion[]
  storageUsage: StorageUsage
}

const NOTHING_DOWNLOADED: OfflineRegionsSnapshot = {
  regions: [],
  storageUsage: {
    regionsSizeInBytes: 0,
    availableBytes: null,
    isRunningLow: false,
  },
}

/** Zonas descargadas y uso del almacenamiento, al día con cada cambio que informa el almacén. */
export function useOfflineRegions(
  store: OfflineRegionStore,
): OfflineRegionsSnapshot {
  const [snapshot, setSnapshot] = useState(NOTHING_DOWNLOADED)

  useEffect(() => {
    let latestRequest = 0
    let unmounted = false
    async function reload() {
      const request = ++latestRequest
      const [regions, storageUsage] = await Promise.all([
        store.listRegions(),
        store.getStorageUsage(),
      ])
      if (!unmounted && request === latestRequest) {
        setSnapshot({ regions, storageUsage })
      }
    }
    void reload()
    const unsubscribe = store.subscribe(() => void reload())
    return () => {
      unmounted = true
      unsubscribe()
    }
  }, [store])

  return snapshot
}
