import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { OnlineOnlyButton } from '../connectivity/OnlineOnlyButton.tsx'
import type {
  DownloadPlan,
  GeoBounds,
  MapViewHandle,
  OfflineRegionStore,
} from '../map-platform/index.ts'
import { formatSize } from './format.ts'

interface PlannedDownload {
  bounds: GeoBounds
  plan: DownloadPlan
}

/** Descarga de la zona visible en el mapa: informa el tamaño estimado, pide un nombre y confirma. */
export function RegionDownloadForm({
  store,
  getMap,
  onZoomedIn,
}: {
  store: OfflineRegionStore
  getMap: () => MapViewHandle | null
  onZoomedIn: () => void
}) {
  const { t, i18n } = useTranslation()
  const nameId = useId()
  const [planned, setPlanned] = useState<PlannedDownload | null>(null)
  const [name, setName] = useState('')

  async function planVisibleRegion() {
    const bounds = getMap()?.getVisibleBounds()
    if (!bounds) return
    setPlanned({ bounds, plan: await store.planDownload(bounds) })
  }

  async function confirmDownload(bounds: GeoBounds) {
    await store.startDownload(name.trim(), bounds)
    setPlanned(null)
    setName('')
  }

  if (planned === null) {
    return (
      <OnlineOnlyButton onClick={() => void planVisibleRegion()}>
        {t('offlineRegions.download.start')}
      </OnlineOnlyButton>
    )
  }

  const { plan, bounds } = planned
  const cancelButton = (
    <button type="button" onClick={() => setPlanned(null)}>
      {t('offlineRegions.download.cancel')}
    </button>
  )

  if (plan.outcome === 'too-large') {
    return (
      <div className="region-download" role="alert">
        <p>
          {t('offlineRegions.download.tooLarge', {
            count: plan.zoomLevelsToZoomIn,
          })}
        </p>
        <button
          type="button"
          onClick={() => {
            getMap()?.zoomIn(plan.zoomLevelsToZoomIn)
            setPlanned(null)
            onZoomedIn()
          }}
        >
          {t('offlineRegions.download.zoomIn')}
        </button>
        {cancelButton}
      </div>
    )
  }

  if (plan.outcome === 'insufficient-space') {
    return (
      <div className="region-download" role="alert">
        <p>
          {t('offlineRegions.download.insufficientSpace', {
            estimated: formatSize(plan.estimatedSizeInBytes, i18n.language),
            available: formatSize(plan.availableBytes, i18n.language),
          })}
        </p>
        {cancelButton}
      </div>
    )
  }

  return (
    <form
      className="region-download"
      onSubmit={(event) => event.preventDefault()}
    >
      <div className="field">
        <label htmlFor={nameId}>{t('offlineRegions.download.name')}</label>
        <input
          id={nameId}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </div>
      <p>
        {t('offlineRegions.download.estimatedSize', {
          size: formatSize(plan.estimatedSizeInBytes, i18n.language),
        })}
      </p>
      <OnlineOnlyButton
        onClick={() => void confirmDownload(bounds)}
        disabled={name.trim() === ''}
      >
        {t('offlineRegions.download.confirm')}
      </OnlineOnlyButton>
      {cancelButton}
    </form>
  )
}
