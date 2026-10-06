import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type {
  GeoPosition,
  MapViewHandle,
  Place,
  PlaceType,
} from '../map-platform/index.ts'
import { PlaceList } from './PlaceList.tsx'
import { PLACE_TYPES } from './place-types.ts'

/**
 * Lugares de un tipo dentro de la zona visible del mapa, leídos de las teselas cargadas: funciona
 * también sin conexión en una zona descargada. Los lugares listados se resaltan sobre el mapa.
 */
export function PlacesByType({
  getMap,
  near,
  onHighlight,
  onChoose,
}: {
  getMap: () => MapViewHandle | null
  near: GeoPosition | null
  onHighlight: (places: Place[]) => void
  onChoose: (place: Place) => void
}) {
  const { t } = useTranslation()
  const [selection, setSelection] = useState<{
    type: PlaceType
    places: Place[]
  } | null>(null)

  function choose(type: PlaceType) {
    const places = getMap()?.placesInView([type]) ?? []
    setSelection({ type, places })
    onHighlight(places)
  }

  // Al salir de esta forma de elegir, los lugares dejan de estar resaltados.
  useEffect(() => () => onHighlight([]), [onHighlight])

  return (
    <div className="places-by-type">
      <div
        className="place-type-choices"
        role="group"
        aria-label={t('pointLookup.byType.label')}
      >
        {PLACE_TYPES.map((candidate) => (
          <button
            key={candidate}
            type="button"
            aria-pressed={selection?.type === candidate}
            onClick={() => choose(candidate)}
          >
            {t(`placeTypes.${candidate}`)}
          </button>
        ))}
      </div>
      {selection === null && <p>{t('pointLookup.byType.hint')}</p>}
      {selection !== null && selection.places.length === 0 && (
        <p role="status">
          {t('pointLookup.byType.none', {
            type: t(`placeTypesPlural.${selection.type}`),
          })}
        </p>
      )}
      {selection !== null && selection.places.length > 0 && (
        <PlaceList places={selection.places} from={near} onChoose={onChoose} />
      )}
    </div>
  )
}
