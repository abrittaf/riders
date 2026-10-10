import { type FormEvent, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { RoadmapService } from '../backend/index.ts'
import { OnlineOnlyButton } from '../connectivity/OnlineOnlyButton.tsx'
import { useIsOnline } from '../connectivity/online-context.ts'
import type {
  GeoPosition,
  Geolocation,
  MapViewHandle,
  Place,
  PlaceSearch,
  RouteProvider,
} from '../map-platform/index.ts'
import type { Point } from '../point-lookup/point.ts'
import { PointPicker } from '../point-lookup/PointPicker.tsx'
import { routePendingLegs } from './leg-routing.ts'
import { RouteTotals } from './LegSummary.tsx'
import { PointSequence } from './PointSequence.tsx'
import {
  draftOf,
  type DraftPoint,
  type EditorDraft,
  emptyDraft,
  insertPoint,
  type LegState,
  movePoint,
  removePoint,
  roadmapDraftOf,
  setPointDate,
} from './roadmap-draft.ts'
import {
  EMPTY_MAP_DISPLAY,
  type RoadmapMapDisplay,
  roadmapMapDisplay,
} from './roadmap-map-display.ts'
import {
  type Roadmap,
  ROADMAP_DESCRIPTION_MAX_LENGTH,
  ROADMAP_NAME_MAX_LENGTH,
  validateDescription,
  validatePoints,
  validateRoadmapName,
} from './roadmap.ts'
import { SurfaceLegend } from './SurfaceLegend.tsx'

export interface RoadmapEditorDependencies {
  roadmaps: RoadmapService
  routeProvider: RouteProvider
  placeSearch: PlaceSearch
  geolocation: Geolocation
}

/** Edición de un Roadmap en planificación: nombre, descripción y la secuencia de Points con su ruta. */
export function RoadmapEditor({
  dependencies,
  roadmap,
  getMap,
  positionFromMap,
  onPositionFromMapHandled,
  onPickingChange,
  onHighlight,
  onMapDisplayChange,
  onSaved,
  onClose,
}: {
  dependencies: RoadmapEditorDependencies
  /** El Roadmap que se edita; `null` para crear uno nuevo. */
  roadmap: Roadmap | null
  getMap: () => MapViewHandle | null
  positionFromMap: GeoPosition | null
  onPositionFromMapHandled: () => void
  onPickingChange: (picking: boolean) => void
  onHighlight: (places: Place[]) => void
  onMapDisplayChange: (display: RoadmapMapDisplay) => void
  onSaved: (id: string) => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const isOnline = useIsOnline()
  const { roadmaps, routeProvider } = dependencies
  const [draft, setDraft] = useState<EditorDraft>(() =>
    roadmap ? draftOf(roadmap) : emptyDraft(),
  )
  const [picking, setPicking] = useState<{ index: number } | null>(null)
  const [showErrors, setShowErrors] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveFailed, setSaveFailed] = useState(false)
  const [showLegend, setShowLegend] = useState(false)

  const errors = {
    name: validateRoadmapName(draft.name),
    description: validateDescription(draft.description),
    points: validatePoints(draft.points.map((entry) => entry.point)),
    legs: draft.legs.every((leg) => leg.status === 'routed')
      ? null
      : draft.legs.some((leg) => leg.status === 'no-route')
        ? 'no-route'
        : 'incomplete',
  }
  const hasErrors = Object.values(errors).some((error) => error !== null)
  const hasPendingLegs = draft.legs.some((leg) => leg.status === 'pending')

  useRouting(
    draft.points,
    draft.legs,
    setDraft,
    routeProvider,
    isOnline && hasPendingLegs,
  )

  // El mapa muestra lo que se está armando: ruta calculada y Points numerados.
  useEffect(() => {
    onMapDisplayChange(
      roadmapMapDisplay(
        draft.points.map((entry) => entry.point),
        draft.legs.map((leg) => (leg.status === 'routed' ? leg.leg : null)),
      ),
    )
  }, [draft.points, draft.legs, onMapDisplayChange])
  useEffect(
    () => () => onMapDisplayChange(EMPTY_MAP_DISPLAY),
    [onMapDisplayChange],
  )

  // Al abrir un Roadmap existente, el mapa se encuadra sobre su ruta.
  useEffect(() => {
    if (!roadmap) return
    const { bounds } = roadmapMapDisplay(roadmap.points, roadmap.legs)
    if (bounds) getMap()?.fitBounds(bounds)
  }, [roadmap, getMap])

  function addPoint(index: number, point: Point) {
    setDraft((current) => insertPoint(current, index, point))
    setPicking(null)
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    setShowErrors(true)
    const toSave = roadmapDraftOf(draft)
    if (hasErrors || !toSave) return
    setSaving(true)
    setSaveFailed(false)
    try {
      const id = roadmap
        ? await roadmaps.update(roadmap.id, toSave).then(() => roadmap.id)
        : await roadmaps.create(toSave)
      onSaved(id)
    } catch {
      setSaveFailed(true)
    } finally {
      setSaving(false)
    }
  }

  if (picking) {
    return (
      <div className="sheet">
        <PointPicker
          placeSearch={dependencies.placeSearch}
          geolocation={dependencies.geolocation}
          getMap={getMap}
          positionFromMap={positionFromMap}
          onPositionFromMapHandled={onPositionFromMapHandled}
          onPickingChange={onPickingChange}
          onHighlight={onHighlight}
          onPick={(point) => addPoint(picking.index, point)}
          onCancel={() => setPicking(null)}
        />
      </div>
    )
  }

  const title = roadmap
    ? t('roadmaps.editor.editTitle')
    : t('roadmaps.editor.title')
  const routedLegs = draft.legs.flatMap((leg) =>
    leg.status === 'routed' ? [leg.leg] : [],
  )

  return (
    <form
      className="sheet roadmap-editor"
      role="dialog"
      aria-label={title}
      onSubmit={(event) => void save(event)}
    >
      <header className="sheet-header">
        <h2>{title}</h2>
        <button type="button" onClick={onClose}>
          {t('nav.close')}
        </button>
      </header>
      <div className="field">
        <label htmlFor="roadmap-name">{t('roadmaps.editor.name')}</label>
        <input
          id="roadmap-name"
          value={draft.name}
          maxLength={ROADMAP_NAME_MAX_LENGTH + 1}
          aria-invalid={showErrors && errors.name !== null}
          aria-describedby={
            showErrors && errors.name ? 'roadmap-name-error' : undefined
          }
          onChange={(event) => setDraft({ ...draft, name: event.target.value })}
        />
        {showErrors && errors.name && (
          <small className="field-error" id="roadmap-name-error" role="alert">
            {t(`roadmaps.editor.errors.name.${errors.name}`)}
          </small>
        )}
      </div>
      <div className="field">
        <label htmlFor="roadmap-description">
          {t('roadmaps.editor.description')}
        </label>
        <textarea
          id="roadmap-description"
          value={draft.description}
          rows={2}
          maxLength={ROADMAP_DESCRIPTION_MAX_LENGTH}
          onChange={(event) =>
            setDraft({ ...draft, description: event.target.value })
          }
        />
      </div>
      {draft.points.length === 0 ? (
        <p>{t('roadmaps.editor.noPoints')}</p>
      ) : (
        <PointSequence
          points={draft.points}
          legs={draft.legs}
          routingAvailable={isOnline}
          onInsert={(index) => setPicking({ index })}
          onMove={(index, direction) =>
            setDraft((current) => movePoint(current, index, direction))
          }
          onRemove={(index) =>
            setDraft((current) => removePoint(current, index))
          }
          onDateChange={(index, date) =>
            setDraft((current) => setPointDate(current, index, date))
          }
          onRetryRouting={() =>
            setDraft((current) => ({
              ...current,
              legs: current.legs.map((leg) =>
                leg.status === 'unavailable' ? { status: 'pending' } : leg,
              ),
            }))
          }
        />
      )}
      <button
        type="button"
        onClick={() => setPicking({ index: draft.points.length })}
      >
        {t('roadmaps.editor.addPoint')}
      </button>
      {showErrors && errors.points && (
        <p className="field-error" role="alert">
          {t(`roadmaps.editor.errors.points.${errors.points}`)}
        </p>
      )}
      {showErrors && errors.points === null && errors.legs && (
        <p className="field-error" role="alert">
          {t(`roadmaps.editor.errors.legs.${errors.legs}`)}
        </p>
      )}
      {routedLegs.length > 0 && errors.legs === null && (
        <RouteTotals legs={routedLegs} />
      )}
      {routedLegs.length > 0 && (
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
      )}
      {saveFailed && <p role="alert">{t('roadmaps.editor.saveFailed')}</p>}
      <div className="form-actions">
        <OnlineOnlyButton
          type="submit"
          disabled={saving}
          unavailableMessage={t('roadmaps.editor.saveRequiresConnection')}
        >
          {t('roadmaps.editor.save')}
        </OnlineOnlyButton>
      </div>
    </form>
  )
}

/** Calcula los tramos pendientes cuando hay conexión; un cambio de la secuencia cancela lo que estaba en curso. */
function useRouting(
  points: readonly DraftPoint[],
  legs: readonly LegState[],
  setDraft: (update: (current: EditorDraft) => EditorDraft) => void,
  routeProvider: RouteProvider,
  active: boolean,
) {
  useEffect(() => {
    if (!active) return
    const abort = new AbortController()
    void routePendingLegs(points, legs, routeProvider, abort.signal).then(
      (results) => {
        if (abort.signal.aborted) return
        setDraft((current) =>
          current.legs === legs
            ? {
                ...current,
                legs: current.legs.map(
                  (leg, index) => results.get(index) ?? leg,
                ),
              }
            : current,
        )
      },
      () => {},
    )
    return () => abort.abort()
  }, [points, legs, active, routeProvider, setDraft])
}
