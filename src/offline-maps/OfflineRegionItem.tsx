import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { OnlineOnlyButton } from '../connectivity/OnlineOnlyButton.tsx'
import type {
  OfflineRegion,
  OfflineRegionStore,
} from '../map-platform/index.ts'
import { formatDate, formatSize } from './format.ts'

function downloadedPercent(region: OfflineRegion): number {
  return region.totalTileCount === 0
    ? 0
    : Math.floor((region.downloadedTileCount / region.totalTileCount) * 100)
}

export function OfflineRegionItem({
  region,
  store,
}: {
  region: OfflineRegion
  store: OfflineRegionStore
}) {
  const { t, i18n } = useTranslation()
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  return (
    <li className="offline-region">
      <h3>{region.name}</h3>
      <p>
        {t('offlineRegions.region.details', {
          size: formatSize(region.sizeInBytes, i18n.language),
          date: formatDate(region.downloadedAt, i18n.language),
        })}
      </p>
      {region.status === 'downloading' && (
        <>
          <p role="status">
            {t('offlineRegions.region.downloading', {
              percent: downloadedPercent(region),
            })}
          </p>
          <progress
            value={region.downloadedTileCount}
            max={region.totalTileCount}
          />
        </>
      )}
      {region.status === 'paused' && (
        <>
          <p role="status">
            {t(
              `offlineRegions.region.paused.${region.pauseReason ?? 'manual'}`,
            )}
          </p>
          <p>{t('offlineRegions.region.incomplete')}</p>
        </>
      )}
      {region.status === 'complete' && (
        <p role="status">{t('offlineRegions.region.complete')}</p>
      )}

      {confirmingDelete ? (
        <div className="offline-region-actions" role="group">
          <p>
            {t('offlineRegions.region.confirmDelete', { name: region.name })}
          </p>
          <button
            type="button"
            onClick={() => void store.deleteRegion(region.id)}
          >
            {t('offlineRegions.region.confirmDeleteYes')}
          </button>
          <button type="button" onClick={() => setConfirmingDelete(false)}>
            {t('offlineRegions.download.cancel')}
          </button>
        </div>
      ) : (
        <div className="offline-region-actions">
          {region.status === 'downloading' && (
            <button
              type="button"
              onClick={() => void store.pauseDownload(region.id)}
            >
              {t('offlineRegions.region.pause')}
            </button>
          )}
          {region.status === 'paused' && (
            <OnlineOnlyButton
              onClick={() => void store.resumeDownload(region.id)}
            >
              {t('offlineRegions.region.resume')}
            </OnlineOnlyButton>
          )}
          {region.status === 'complete' && (
            <OnlineOnlyButton
              onClick={() => void store.refreshRegion(region.id)}
            >
              {t('offlineRegions.region.refresh')}
            </OnlineOnlyButton>
          )}
          <button type="button" onClick={() => setConfirmingDelete(true)}>
            {t('offlineRegions.region.delete')}
          </button>
        </div>
      )}
    </li>
  )
}
