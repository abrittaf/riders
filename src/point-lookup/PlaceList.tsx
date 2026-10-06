import { useTranslation } from 'react-i18next'
import {
  distanceInMeters,
  type GeoPosition,
  type Place,
} from '../map-platform/index.ts'
import { formatDistance } from './format-distance.ts'

/** Lista de lugares para elegir uno, ordenada por cercanía a la posición de referencia. */
export function PlaceList({
  places,
  from,
  onChoose,
}: {
  places: readonly Place[]
  from: GeoPosition | null
  onChoose: (place: Place) => void
}) {
  const { t, i18n } = useTranslation()
  const withDistance = places.map((place) => ({
    place,
    distance: from ? distanceInMeters(from, place.position) : null,
  }))
  withDistance.sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0))

  return (
    <ul className="place-list">
      {withDistance.map(({ place, distance }) => (
        <li
          key={`${place.name}|${place.position.latitude}|${place.position.longitude}`}
        >
          <div className="place-summary">
            <strong>{place.name}</strong>
            <small>
              {[
                place.type && t(`placeTypes.${place.type}`),
                place.locality,
                distance !== null && formatDistance(distance, i18n.language),
              ]
                .filter((part) => part)
                .join(' · ')}
            </small>
          </div>
          <button type="button" onClick={() => onChoose(place)}>
            {t('pointLookup.choose')}
          </button>
        </li>
      ))}
    </ul>
  )
}
