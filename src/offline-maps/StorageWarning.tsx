import { useTranslation } from 'react-i18next'
import { formatSize } from './format.ts'
import type { OfflineRegionsSnapshot } from './use-offline-regions.ts'

/** Aviso de almacenamiento por agotarse: ofrece borrar zonas, nunca borra nada por su cuenta. */
export function StorageWarning({
  snapshot,
  onManageRegions,
}: {
  snapshot: OfflineRegionsSnapshot
  onManageRegions: () => void
}) {
  const { t, i18n } = useTranslation()
  const { regions, storageUsage } = snapshot

  if (!storageUsage.isRunningLow || regions.length === 0) return null
  return (
    <aside className="storage-warning" role="alert">
      <p>
        {t('storageWarning.text', {
          size: formatSize(storageUsage.regionsSizeInBytes, i18n.language),
        })}
      </p>
      <button type="button" onClick={onManageRegions}>
        {t('storageWarning.manage')}
      </button>
    </aside>
  )
}
