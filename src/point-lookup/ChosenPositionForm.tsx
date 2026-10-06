import { type FormEvent, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useIsOnline } from '../connectivity/online-context.ts'
import type { GeoPosition, PlaceSearch } from '../map-platform/index.ts'
import { formatCoordinates, type Point, pointFromPosition } from './point.ts'

/**
 * Una posición tocada en el mapa se confirma como Point con un nombre propuesto: el lugar o la
 * dirección más cercana cuando hay conexión; las coordenadas si no. El Rider puede cambiarlo.
 */
export function ChosenPositionForm({
  position,
  placeSearch,
  onConfirm,
  onCancel,
}: {
  position: GeoPosition
  placeSearch: PlaceSearch
  onConfirm: (point: Point) => void
  onCancel: () => void
}) {
  const { t, i18n } = useTranslation()
  const isOnline = useIsOnline()
  const coordinates = formatCoordinates(position, i18n.language)
  const [proposal, setProposal] = useState<string | null>(
    isOnline ? null : coordinates,
  )
  const [edited, setEdited] = useState<string | null>(null)
  const name = edited ?? proposal ?? coordinates

  useEffect(() => {
    if (!isOnline) return
    const abort = new AbortController()
    placeSearch
      .findNearestPlace(position, abort.signal)
      .then((place) => setProposal(place?.name ?? coordinates))
      .catch(() => {
        if (!abort.signal.aborted) setProposal(coordinates)
      })
    return () => abort.abort()
  }, [isOnline, placeSearch, position, coordinates])

  function submit(event: FormEvent) {
    event.preventDefault()
    const trimmed = name.trim()
    if (trimmed === '') return
    onConfirm(pointFromPosition(position, trimmed))
  }

  return (
    <form className="chosen-position" onSubmit={submit}>
      <h3>{t('pointLookup.chosenPosition.title')}</h3>
      <p>{coordinates}</p>
      <label htmlFor="chosen-position-name">
        {t('pointLookup.chosenPosition.name')}
      </label>
      <input
        id="chosen-position-name"
        type="text"
        value={name}
        onChange={(event) => setEdited(event.target.value)}
        maxLength={60}
      />
      {proposal === null && edited === null && (
        <small role="status">{t('pointLookup.chosenPosition.proposing')}</small>
      )}
      <div className="form-actions">
        <button type="submit" disabled={name.trim() === ''}>
          {t('pointLookup.chosenPosition.confirm')}
        </button>
        <button type="button" onClick={onCancel}>
          {t('pointLookup.cancel')}
        </button>
      </div>
    </form>
  )
}
