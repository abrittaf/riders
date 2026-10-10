import { useTranslation } from 'react-i18next'
import { formatDistance } from '../point-lookup/format-distance.ts'
import { formatDuration } from './format.ts'
import type { RoadmapLeg } from './roadmap.ts'

/** Distancia, tiempo estimado y kilómetros sin pavimentar de un tramo calculado. */
export function LegSummary({ leg }: { leg: RoadmapLeg }) {
  const { t, i18n } = useTranslation()
  const hasUnknown = leg.surfaces.some(
    (segment) => segment.surface === 'unknown',
  )
  return (
    <span className="leg-summary">
      {formatDistance(leg.distanceM, i18n.language)} ·{' '}
      {formatDuration(leg.durationS, i18n.language)} ·{' '}
      {t('roadmaps.legs.unpaved', {
        distance: formatDistance(leg.unpavedM, i18n.language),
      })}
      {hasUnknown && <> · {t('roadmaps.legs.unknownSurface')}</>}
    </span>
  )
}

/** Totales del Roadmap: los kilómetros aproximados del viaje y su tiempo. */
export function RouteTotals({ legs }: { legs: readonly RoadmapLeg[] }) {
  const { t, i18n } = useTranslation()
  const distance = legs.reduce((sum, leg) => sum + leg.distanceM, 0)
  const duration = legs.reduce((sum, leg) => sum + leg.durationS, 0)
  const unpaved = legs.reduce((sum, leg) => sum + leg.unpavedM, 0)
  return (
    <p className="route-totals" role="status">
      {t('roadmaps.totals', {
        distance: formatDistance(distance, i18n.language),
        duration: formatDuration(duration, i18n.language),
        unpaved: formatDistance(unpaved, i18n.language),
      })}
    </p>
  )
}
