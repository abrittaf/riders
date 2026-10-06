import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type {
  GeoPosition,
  Geolocation,
  MapViewHandle,
  Place,
  PlaceSearch,
} from '../map-platform/index.ts'
import { ChosenPositionForm } from './ChosenPositionForm.tsx'
import { NameSearch } from './NameSearch.tsx'
import { PlacesByType } from './PlacesByType.tsx'
import { type Point, pointFromPlace } from './point.ts'
import { referencePosition } from './reference-position.ts'

type PickerMode = 'search' | 'by-type'

/**
 * Las tres formas de elegir un Point (spec point-lookup): buscar por nombre, elegir por tipo entre
 * lo visible, o la posición que el Rider tocó en el mapa (`positionFromMap`, que llega del mapa).
 */
export function PointPicker({
  placeSearch,
  geolocation,
  getMap,
  positionFromMap,
  onPositionFromMapHandled,
  onHighlight,
  onPick,
  onCancel,
}: {
  placeSearch: PlaceSearch
  geolocation: Geolocation
  getMap: () => MapViewHandle | null
  positionFromMap: GeoPosition | null
  onPositionFromMapHandled: () => void
  onHighlight: (places: Place[]) => void
  onPick: (point: Point) => void
  onCancel: () => void
}) {
  const { t } = useTranslation()
  const [mode, setMode] = useState<PickerMode>('search')
  const [near] = useState(() => referencePosition(geolocation, getMap()))
  const choosePlace = useCallback(
    (place: Place) => onPick(pointFromPlace(place)),
    [onPick],
  )

  if (positionFromMap) {
    return (
      <section className="point-picker" aria-label={t('pointLookup.title')}>
        <ChosenPositionForm
          position={positionFromMap}
          placeSearch={placeSearch}
          onConfirm={(point) => {
            onPositionFromMapHandled()
            onPick(point)
          }}
          onCancel={onPositionFromMapHandled}
        />
      </section>
    )
  }

  return (
    <section className="point-picker" aria-label={t('pointLookup.title')}>
      <header className="sheet-header">
        <h2>{t('pointLookup.title')}</h2>
        <button type="button" onClick={onCancel}>
          {t('pointLookup.cancel')}
        </button>
      </header>
      <div className="picker-modes" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'search'}
          onClick={() => setMode('search')}
        >
          {t('pointLookup.modes.search')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'by-type'}
          onClick={() => setMode('by-type')}
        >
          {t('pointLookup.modes.byType')}
        </button>
      </div>
      {mode === 'search' && (
        <NameSearch
          placeSearch={placeSearch}
          near={near}
          onChoose={choosePlace}
        />
      )}
      {mode === 'by-type' && (
        <PlacesByType
          getMap={getMap}
          near={near}
          onHighlight={onHighlight}
          onChoose={choosePlace}
        />
      )}
      <p className="long-press-hint">{t('pointLookup.longPressHint')}</p>
    </section>
  )
}
