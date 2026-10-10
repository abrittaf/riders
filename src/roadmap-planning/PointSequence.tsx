import { useTranslation } from 'react-i18next'
import { LegSummary } from './LegSummary.tsx'
import type { DraftPoint, LegState } from './roadmap-draft.ts'

/** La secuencia de Points en edición, con el tramo entre cada par y las acciones sobre cada Point. */
export function PointSequence({
  points,
  legs,
  routingAvailable,
  onInsert,
  onMove,
  onRemove,
  onDateChange,
  onRetryRouting,
}: {
  points: readonly DraftPoint[]
  legs: readonly LegState[]
  /** Sin conexión no se calcula ningún tramo: el pendiente lo explica. */
  routingAvailable: boolean
  /** Insertar un Point en la posición dada de la secuencia. */
  onInsert: (index: number) => void
  onMove: (index: number, direction: -1 | 1) => void
  onRemove: (index: number) => void
  onDateChange: (index: number, date: string | null) => void
  onRetryRouting: () => void
}) {
  const { t } = useTranslation()

  return (
    <ol className="point-sequence" aria-label={t('roadmaps.editor.points')}>
      {points.map((entry, index) => (
        <li key={entry.key}>
          <div className="point-row">
            <div className="point-summary">
              <strong>{entry.point.name}</strong>
              {entry.point.type && (
                <small>{t(`placeTypes.${entry.point.type}`)}</small>
              )}
            </div>
            <label className="point-date">
              <span>{t('roadmaps.editor.pointDate')}</span>
              <input
                type="date"
                value={entry.point.date ?? ''}
                onChange={(event) =>
                  onDateChange(index, event.target.value || null)
                }
              />
            </label>
            <div className="point-actions">
              <button
                type="button"
                onClick={() => onMove(index, -1)}
                disabled={index === 0}
              >
                {t('roadmaps.editor.moveUp')}
              </button>
              <button
                type="button"
                onClick={() => onMove(index, 1)}
                disabled={index === points.length - 1}
              >
                {t('roadmaps.editor.moveDown')}
              </button>
              <button type="button" onClick={() => onRemove(index)}>
                {t('roadmaps.editor.remove')}
              </button>
            </div>
          </div>
          {index < legs.length && (
            <div className="leg-row">
              <Leg
                state={legs[index]!}
                routingAvailable={routingAvailable}
                onRetry={onRetryRouting}
              />
              <button type="button" onClick={() => onInsert(index + 1)}>
                {t('roadmaps.editor.insertHere')}
              </button>
            </div>
          )}
        </li>
      ))}
    </ol>
  )
}

function Leg({
  state,
  routingAvailable,
  onRetry,
}: {
  state: LegState
  routingAvailable: boolean
  onRetry: () => void
}) {
  const { t } = useTranslation()
  switch (state.status) {
    case 'routed':
      return <LegSummary leg={state.leg} />
    case 'pending':
      return (
        <span role="status">
          {routingAvailable
            ? t('roadmaps.legs.calculating')
            : t('roadmaps.editor.routingRequiresConnection')}
        </span>
      )
    case 'no-route':
      return <span role="alert">{t('roadmaps.legs.noRoute')}</span>
    case 'unavailable':
      return (
        <span role="alert">
          {t('roadmaps.legs.unavailable')}{' '}
          <button type="button" onClick={onRetry}>
            {t('roadmaps.legs.retry')}
          </button>
        </span>
      )
  }
}
