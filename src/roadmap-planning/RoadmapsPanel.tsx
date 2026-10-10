import { useTranslation } from 'react-i18next'
import { Panel } from '../app-shell/Panel.tsx'
import { OnlineOnlyButton } from '../connectivity/OnlineOnlyButton.tsx'
import { formatDistance } from '../point-lookup/format-distance.ts'
import { formatDuration } from './format.ts'
import type { Roadmap } from './roadmap.ts'

/** La lista de Roadmaps del Rider (spec «Lista y detalle de Roadmaps»). */
export function RoadmapsPanel({
  roadmaps,
  onOpen,
  onCreate,
  onClose,
}: {
  roadmaps: Roadmap[] | null
  onOpen: (roadmap: Roadmap) => void
  onCreate: () => void
  onClose: () => void
}) {
  const { t, i18n } = useTranslation()

  return (
    <Panel title={t('roadmaps.list.title')} onClose={onClose}>
      {roadmaps !== null && roadmaps.length === 0 && (
        <div className="roadmaps-empty">
          <h3>{t('roadmaps.list.empty.title')}</h3>
          <p>{t('roadmaps.list.empty.body')}</p>
        </div>
      )}
      <OnlineOnlyButton
        onClick={onCreate}
        unavailableMessage={t('roadmaps.list.createRequiresConnection')}
      >
        {t('roadmaps.list.create')}
      </OnlineOnlyButton>
      {roadmaps !== null && roadmaps.length > 0 && (
        <ul className="roadmap-list">
          {roadmaps.map((roadmap) => (
            <li key={roadmap.id}>
              <button
                type="button"
                className="roadmap-list-item"
                onClick={() => onOpen(roadmap)}
              >
                <strong>{roadmap.name}</strong>
                <small>
                  {formatDistance(roadmap.totalDistanceM, i18n.language)} ·{' '}
                  {formatDuration(roadmap.totalDurationS, i18n.language)} ·{' '}
                  {t('roadmaps.list.points', { count: roadmap.points.length })}
                </small>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
