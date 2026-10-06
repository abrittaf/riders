import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useIsOnline } from '../connectivity/online-context.ts'
import type { GeoPosition, Place, PlaceSearch } from '../map-platform/index.ts'
import { PlaceList } from './PlaceList.tsx'

type SearchState =
  | { status: 'idle' }
  | { status: 'searching' }
  | { status: 'found'; places: Place[] }
  | { status: 'failed' }

/** Búsqueda de lugares por nombre (spec point-lookup): requiere conexión; sin ella queda señalada. */
export function NameSearch({
  placeSearch,
  near,
  onChoose,
}: {
  placeSearch: PlaceSearch
  near: GeoPosition | null
  onChoose: (place: Place) => void
}) {
  const { t } = useTranslation()
  const isOnline = useIsOnline()
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState<SearchState>({ status: 'idle' })

  async function submit(event: FormEvent) {
    event.preventDefault()
    const text = query.trim()
    if (text === '' || !near) return
    setSearch({ status: 'searching' })
    try {
      const places = await placeSearch.searchByName(text, near)
      setSearch({ status: 'found', places })
    } catch {
      setSearch({ status: 'failed' })
    }
  }

  return (
    <div className="name-search">
      <form
        onSubmit={(event) => void submit(event)}
        className="name-search-form"
      >
        <label htmlFor="place-name-query">
          {t('pointLookup.search.label')}
        </label>
        <div className="name-search-row">
          <input
            id="place-name-query"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            disabled={!isOnline}
          />
          <button type="submit" disabled={!isOnline || query.trim() === ''}>
            {t('pointLookup.search.submit')}
          </button>
        </div>
        {!isOnline && (
          <small className="unavailable-offline">
            {t('pointLookup.search.unavailable')}
          </small>
        )}
      </form>
      {search.status === 'searching' && (
        <p role="status">{t('pointLookup.search.searching')}</p>
      )}
      {search.status === 'failed' && (
        <p role="alert">{t('pointLookup.search.failed')}</p>
      )}
      {search.status === 'found' && search.places.length === 0 && (
        <p role="status">{t('pointLookup.search.noMatches')}</p>
      )}
      {search.status === 'found' && search.places.length > 0 && (
        <PlaceList places={search.places} from={near} onChoose={onChoose} />
      )}
    </div>
  )
}
