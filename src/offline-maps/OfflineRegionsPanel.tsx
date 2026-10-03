import { useTranslation } from 'react-i18next'
import { Panel } from '../app-shell/Panel.tsx'
import type {
  MapViewHandle,
  OfflineRegionStore,
} from '../map-platform/index.ts'
import { formatSize } from './format.ts'
import { OfflineRegionItem } from './OfflineRegionItem.tsx'
import { RegionDownloadForm } from './RegionDownloadForm.tsx'
import type { OfflineRegionsSnapshot } from './use-offline-regions.ts'

export function OfflineRegionsPanel({
  store,
  snapshot,
  getMap,
  onClose,
}: {
  store: OfflineRegionStore
  snapshot: OfflineRegionsSnapshot
  getMap: () => MapViewHandle | null
  onClose: () => void
}) {
  const { t, i18n } = useTranslation()
  const { regions, storageUsage } = snapshot

  return (
    <Panel title={t('offlineRegions.title')} onClose={onClose}>
      {regions.length === 0 && (
        <div className="offline-regions-empty">
          <h3>{t('offlineRegions.empty.title')}</h3>
          <p>{t('offlineRegions.empty.body')}</p>
        </div>
      )}
      <p className="offline-regions-storage">
        {t('offlineRegions.storage.used', {
          size: formatSize(storageUsage.regionsSizeInBytes, i18n.language),
        })}{' '}
        {storageUsage.availableBytes !== null &&
          t('offlineRegions.storage.available', {
            size: formatSize(storageUsage.availableBytes, i18n.language),
          })}
      </p>
      <RegionDownloadForm store={store} getMap={getMap} onZoomedIn={onClose} />
      <ul className="offline-regions">
        {regions.map((region) => (
          <OfflineRegionItem key={region.id} region={region} store={store} />
        ))}
      </ul>
    </Panel>
  )
}
