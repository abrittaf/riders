import { type RefObject, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useIsOnline } from '../connectivity/online-context.ts'
import {
  boundsIntersect,
  type GeoPosition,
  MAP_CROSSHAIR_POSITION,
  type MapMarker,
  type MapPlatform,
  type MapViewHandle,
  type MapViewProps,
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
  markers,
  route,
  crosshair = false,
  onLongPress,
}: {
  mapPlatform: Pick<MapPlatform, 'MapView' | 'geolocation' | 'attributions'>
  mapRef: RefObject<MapViewHandle | null>
  offlineRegions: readonly OfflineRegion[]
  markers?: readonly MapMarker[]
  route?: MapViewProps['route']
  /** La mira para elegir una posición del mapa (spec point-lookup). */
  crosshair?: boolean
  onLongPress?: (position: GeoPosition) => void
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
        markers={markers}
        route={route}
        onLongPress={onLongPress}
        onUnavailableAreaChange={(hasUnavailableArea) =>
          setUnavailableArea(
            hasUnavailableArea && mapRef.current
              ? { visibleBounds: mapRef.current.getVisibleBounds() }
              : null,
          )
        }
      />
      {crosshair && (
        <div
          className="map-crosshair"
          data-testid="map-crosshair"
          style={{
            left: `${MAP_CROSSHAIR_POSITION.x * 100}%`,
            top: `${MAP_CROSSHAIR_POSITION.y * 100}%`,
          }}
          aria-hidden
        />
      )}
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
