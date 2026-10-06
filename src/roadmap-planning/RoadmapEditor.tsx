import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type {
  GeoPosition,
  Geolocation,
  MapViewHandle,
  Place,
  PlaceSearch,
} from '../map-platform/index.ts'
import type { Point } from '../point-lookup/point.ts'
import { PointPicker } from '../point-lookup/PointPicker.tsx'

/**
 * Edición de un Roadmap en planificación. Por ahora arma la secuencia de Points; el nombre, la
 * ruta y el guardado llegan con las tareas del grupo 4.
 */
export function RoadmapEditor({
  placeSearch,
  geolocation,
  getMap,
  positionFromMap,
  onPositionFromMapHandled,
  onHighlight,
  onClose,
}: {
  placeSearch: PlaceSearch
  geolocation: Geolocation
  getMap: () => MapViewHandle | null
  positionFromMap: GeoPosition | null
  onPositionFromMapHandled: () => void
  onHighlight: (places: Place[]) => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [points, setPoints] = useState<Point[]>([])
  const [picking, setPicking] = useState(false)

  if (picking) {
    return (
      <div className="sheet">
        <PointPicker
          placeSearch={placeSearch}
          geolocation={geolocation}
          getMap={getMap}
          positionFromMap={positionFromMap}
          onPositionFromMapHandled={onPositionFromMapHandled}
          onHighlight={onHighlight}
          onPick={(point) => {
            setPoints((current) => [...current, point])
            setPicking(false)
          }}
          onCancel={() => setPicking(false)}
        />
      </div>
    )
  }

  return (
    <section
      className="sheet roadmap-editor"
      role="dialog"
      aria-label={t('roadmaps.editor.title')}
    >
      <header className="sheet-header">
        <h2>{t('roadmaps.editor.title')}</h2>
        <button type="button" onClick={onClose}>
          {t('nav.close')}
        </button>
      </header>
      {points.length === 0 ? (
        <p>{t('roadmaps.editor.noPoints')}</p>
      ) : (
        <ol className="point-sequence" aria-label={t('roadmaps.editor.points')}>
          {points.map((point, index) => (
            <li key={`${index}-${point.name}`}>
              <strong>{point.name}</strong>
              {point.type && <small>{t(`placeTypes.${point.type}`)}</small>}
            </li>
          ))}
        </ol>
      )}
      <button type="button" onClick={() => setPicking(true)}>
        {t('roadmaps.editor.addPoint')}
      </button>
    </section>
  )
}
