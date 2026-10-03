import { type RefObject, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useIsOnline } from '../connectivity/online-context.ts'
import {
  boundsIntersect,
  type MapPlatform,
  type MapViewHandle,
  type OfflineRegion,
  type GeoBounds,
  type OwnPositionMarker,
} from '../map-platform/index.ts'
import { LocationControls } from './LocationControls.tsx'
import { MapAttribution } from './MapAttribution.tsx'
import { useGeolocation } from './use-geolocation.ts'

const UNAVAILABLE_AREA_RETRY_INTERVAL_IN_MS = 3_000

export function MapScreen({
  mapPlatform,
  mapRef,
  offlineRegions,
}: {
  mapPlatform: Pick<MapPlatform, 'MapView' | 'geolocation' | 'attributions'>
  mapRef: RefObject<MapViewHandle | null>
  offlineRegions: readonly OfflineRegion[]
}) {
  const { t, i18n } = useTranslation()
  const isOnline = useIsOnline()
  const location = useGeolocation(mapPlatform.geolocation)
  const [unavailableArea, setUnavailableArea] = useState<{
    visibleBounds: GeoBounds
  } | null>(null)
  const { MapView } = mapPlatform

  useEffect(() => {
    if (isOnline) mapRef.current?.retryUnavailableTiles()
  }, [isOnline, mapRef])

  // Con conexión, una zona que no se pudo obtener (red inestable, servidor caído) se reintenta sola.
  const hasUnavailableArea = unavailableArea !== null
  useEffect(() => {
    if (!isOnline || !hasUnavailableArea) return
    const retry = setInterval(
      () => mapRef.current?.retryUnavailableTiles(),
      UNAVAILABLE_AREA_RETRY_INTERVAL_IN_MS,
    )
    return () => clearInterval(retry)
  }, [isOnline, hasUnavailableArea, mapRef])

  const ownPosition: OwnPositionMarker | null =
    location.permission === 'granted' && location.lastKnownPosition
      ? {
          position: location.lastKnownPosition,
          isLastKnown: location.searchingForSignal,
        }
      : null

  function unavailableAreaNotice(visibleBounds: GeoBounds): string {
    const incompleteRegion = offlineRegions.find(
      (region) =>
        region.status !== 'complete' &&
        boundsIntersect(region.bounds, visibleBounds),
    )
    return incompleteRegion
      ? t('map.incompleteRegion', { name: incompleteRegion.name })
      : t('map.unavailableOffline')
  }

  return (
    <div className="map-screen">
      <MapView
        ref={mapRef}
        language={i18n.language}
        ownPosition={ownPosition}
        onUnavailableAreaChange={(hasUnavailableArea) =>
          setUnavailableArea(
            hasUnavailableArea && mapRef.current
              ? { visibleBounds: mapRef.current.getVisibleBounds() }
              : null,
          )
        }
      />
      {unavailableArea && (
        <p className="map-notice" role="status">
          {unavailableAreaNotice(unavailableArea.visibleBounds)}
        </p>
      )}
      <LocationControls
        geolocation={mapPlatform.geolocation}
        state={location}
        onCenter={() => {
          if (location.lastKnownPosition) {
            mapRef.current?.centerOn(location.lastKnownPosition)
          }
        }}
      />
      <MapAttribution attributions={mapPlatform.attributions} />
    </div>
  )
}
