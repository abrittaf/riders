import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  type GeoPosition,
  type Geolocation,
  MAP_CROSSHAIR_POSITION,
  type MapViewHandle,
  type Place,
  type PlaceSearch,
} from '../map-platform/index.ts'
import { ChosenPositionForm } from './ChosenPositionForm.tsx'
import { NameSearch } from './NameSearch.tsx'
import { PlacesByType } from './PlacesByType.tsx'
import { type Point, pointFromPlace } from './point.ts'
import { referencePosition } from './reference-position.ts'

type PickerMode = 'search' | 'by-type'

/**
 * Las tres formas de elegir un Point (spec point-lookup): buscar por nombre, elegir por tipo entre
 * lo visible, o una posición cualquiera: la que queda bajo la mira del mapa, o la que el Rider
 * tocó de forma sostenida (`positionFromMap`, que llega del mapa).
 */
export function PointPicker({
  placeSearch,
  geolocation,
  getMap,
  positionFromMap,
  onPositionFromMapHandled,
  onPickingChange,
  onHighlight,
  onPick,
  onCancel,
}: {
  placeSearch: PlaceSearch
  geolocation: Geolocation
  getMap: () => MapViewHandle | null
  positionFromMap: GeoPosition | null
  onPositionFromMapHandled: () => void
  /** Avisa cuándo el selector está abierto, para que el mapa muestre la mira. */
  onPickingChange: (picking: boolean) => void
  onHighlight: (places: Place[]) => void
  onPick: (point: Point) => void
  onCancel: () => void
}) {
  const { t } = useTranslation()
  const [mode, setMode] = useState<PickerMode>('search')
  const [near] = useState(() => referencePosition(geolocation, getMap()))
  const [crosshairPosition, setCrosshairPosition] =
    useState<GeoPosition | null>(null)
  const choosePlace = useCallback(
    (place: Place) => onPick(pointFromPlace(place)),
    [onPick],
  )
  // Mientras el selector está abierto, el mapa muestra la mira.
  useEffect(() => {
    onPickingChange(true)
    return () => onPickingChange(false)
  }, [onPickingChange])

  const chosenPosition = positionFromMap ?? crosshairPosition
  if (chosenPosition) {
    const handled = () => {
      setCrosshairPosition(null)
      onPositionFromMapHandled()
    }
    return (
      <section className="point-picker" aria-label={t('pointLookup.title')}>
        <ChosenPositionForm
          position={chosenPosition}
          placeSearch={placeSearch}
          onConfirm={(point) => {
            handled()
            onPick(point)
          }}
          onCancel={handled}
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
      <div className="crosshair-choice">
        <p className="long-press-hint">{t('pointLookup.anyPositionHint')}</p>
        <button
          type="button"
          onClick={() => {
            const map = getMap()
            if (map)
              setCrosshairPosition(map.positionAt(MAP_CROSSHAIR_POSITION))
          }}
        >
          {t('pointLookup.useCrosshair')}
        </button>
      </div>
    </section>
  )
}
