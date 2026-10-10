import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { OnlineOnlyButton } from '../connectivity/OnlineOnlyButton.tsx'
import type { MapAttribution, MapViewHandle } from '../map-platform/index.ts'
import { LegSummary, RouteTotals } from './LegSummary.tsx'
import type { Roadmap } from './roadmap.ts'
import {
  EMPTY_MAP_DISPLAY,
  type RoadmapMapDisplay,
  roadmapMapDisplay,
} from './roadmap-map-display.ts'
import { RoadmapSources } from './RoadmapSources.tsx'
import { SurfaceLegend } from './SurfaceLegend.tsx'

/** Un Roadmap sobre el mapa: Points numerados, ruta, tramos y totales, con sus acciones. */
export function RoadmapDetail({
  roadmap,
  attributions,
  getMap,
  onMapDisplayChange,
  onEdit,
  onDuplicate,
  onDelete,
  onClose,
}: {
  roadmap: Roadmap
  /** Fuentes del ruteo y de la búsqueda, tal como las informan los proveedores. */
  attributions: readonly MapAttribution[]
  getMap: () => MapViewHandle | null
  onMapDisplayChange: (display: RoadmapMapDisplay) => void
  onEdit: () => void
  onDuplicate: () => Promise<void>
  onDelete: () => Promise<void>
  onClose: () => void
}) {
  const { t, i18n } = useTranslation()
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [busy, setBusy] = useState(false)
  const [showLegend, setShowLegend] = useState(false)

  useEffect(() => {
    const display = roadmapMapDisplay(roadmap.points, roadmap.legs)
    onMapDisplayChange(display)
    if (display.bounds) getMap()?.fitBounds(display.bounds)
  }, [roadmap, getMap, onMapDisplayChange])
  useEffect(
    () => () => onMapDisplayChange(EMPTY_MAP_DISPLAY),
    [onMapDisplayChange],
  )

  async function run(action: () => Promise<void>) {
    setBusy(true)
    try {
      await action()
    } finally {
      setBusy(false)
    }
  }

  const dateOf = (date: string | null) =>
    date
      ? new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' }).format(
          new Date(`${date}T00:00:00`),
        )
      : null

  return (
    <section
      className="sheet roadmap-detail"
      role="dialog"
      aria-label={roadmap.name}
    >
      <header className="sheet-header">
        <h2>{roadmap.name}</h2>
        <button type="button" onClick={onClose}>
          {t('nav.close')}
        </button>
      </header>
      {roadmap.description && <p>{roadmap.description}</p>}
      <ol className="point-sequence" aria-label={t('roadmaps.editor.points')}>
        {roadmap.points.map((point, index) => (
          <li key={index}>
            <div className="point-row">
              <div className="point-summary">
                <strong>{point.name}</strong>
                <small>
                  {[
                    point.type && t(`placeTypes.${point.type}`),
                    dateOf(point.date),
                  ]
                    .filter((part) => part)
                    .join(' · ')}
                </small>
              </div>
            </div>
            {roadmap.legs[index] && (
              <div className="leg-row">
                <LegSummary leg={roadmap.legs[index]} />
              </div>
            )}
          </li>
        ))}
      </ol>
      <RouteTotals legs={roadmap.legs} />
      <div className="legend-toggle">
        <button
          type="button"
          aria-expanded={showLegend}
          onClick={() => setShowLegend((shown) => !shown)}
        >
          {t('roadmaps.legend.open')}
        </button>
        {showLegend && <SurfaceLegend />}
      </div>
      {confirmingDelete ? (
        <div
          role="alertdialog"
          aria-label={t('roadmaps.detail.deleteConfirmTitle')}
          className="notice"
        >
          <p>
            {t('roadmaps.detail.deleteConfirmBody', { name: roadmap.name })}
          </p>
          <div className="form-actions">
            <button
              type="button"
              disabled={busy}
              onClick={() => void run(onDelete)}
            >
              {t('roadmaps.detail.deleteConfirm')}
            </button>
            <button type="button" onClick={() => setConfirmingDelete(false)}>
              {t('pointLookup.cancel')}
            </button>
          </div>
        </div>
      ) : (
        <div className="form-actions">
          <OnlineOnlyButton
            onClick={onEdit}
            unavailableMessage={t('roadmaps.detail.requiresConnection')}
          >
            {t('roadmaps.detail.edit')}
          </OnlineOnlyButton>
          <OnlineOnlyButton
            onClick={() => void run(onDuplicate)}
            disabled={busy}
            unavailableMessage={t('roadmaps.detail.requiresConnection')}
          >
            {t('roadmaps.detail.duplicate')}
          </OnlineOnlyButton>
          <OnlineOnlyButton
            onClick={() => setConfirmingDelete(true)}
            unavailableMessage={t('roadmaps.detail.requiresConnection')}
          >
            {t('roadmaps.detail.delete')}
          </OnlineOnlyButton>
        </div>
      )}
      <RoadmapSources attributions={attributions} />
    </section>
  )
}
