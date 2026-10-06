import {
  Map as MapLibreMap,
  Marker,
  setWorkerUrl,
  type StyleSpecification,
} from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useEffect, useImperativeHandle, useRef } from 'react'
import { boundsIntersect, type GeoBounds, type GeoPosition } from '../geo.ts'
import type { MapProvider } from '../map-provider.ts'
import type { MapMarker, MapView, MapViewProps } from '../map-view.ts'
import type { Place, PlaceType } from '../place.ts'
import {
  placesInBounds,
  POI_SOURCE_LAYER,
} from '../providers/openfreemap/openmaptiles-places.ts'
import { tileBounds } from '../tile-math.ts'
import { type TileCoordinates, tileKey } from '../tile-source.ts'
import { watchLongPress } from './long-press.ts'
import type { MapLibreResourceProtocol } from './maplibre-resource-protocol.ts'

export interface MapLibreMapViewDependencies {
  provider: MapProvider
  protocol: MapLibreResourceProtocol
  vectorSourceId: string
  initialView: { center: GeoPosition; zoom: number }
  /** Publica en el DOM qué se dibujó, para las pruebas de flujo completo. */
  exposeRenderDiagnostics: boolean
}

function visibleBounds(map: MapLibreMap): GeoBounds {
  const bounds = map.getBounds()
  return {
    west: bounds.getWest(),
    south: bounds.getSouth(),
    east: bounds.getEast(),
    north: bounds.getNorth(),
  }
}

function queryPlacesInView(
  map: MapLibreMap,
  vectorSourceId: string,
  types: readonly PlaceType[],
  language: string,
): Place[] {
  if (!map.getSource(vectorSourceId)) return []
  const features = map.querySourceFeatures(vectorSourceId, {
    sourceLayer: POI_SOURCE_LAYER,
  })
  return placesInBounds(features, types, visibleBounds(map), language)
}

function exposeRenderDiagnostics(
  map: MapLibreMap,
  container: HTMLElement,
  vectorSourceId: string,
  language: () => string,
) {
  map.on('movestart', () => {
    container.dataset.mapIdle = 'false'
  })
  map.on('idle', () => {
    const rendered = map.queryRenderedFeatures()
    const countIn = (sourceLayer: string) =>
      String(
        rendered.filter((feature) => feature.sourceLayer === sourceLayer)
          .length,
      )
    container.dataset.renderedRoads = countIn('transportation')
    container.dataset.renderedRoadNames = countIn('transportation_name')
    container.dataset.renderedPlaceNames = countIn('place')
    container.dataset.fuelPlacesInView = JSON.stringify(
      queryPlacesInView(map, vectorSourceId, ['fuel'], language()).map(
        (place) => place.name,
      ),
    )
    container.dataset.zoom = String(map.getZoom())
    container.dataset.centerLatitude = String(map.getCenter().lat)
    container.dataset.centerLongitude = String(map.getCenter().lng)
    container.dataset.mapIdle = 'true'
  })
}

function createMarker(marker: MapMarker): Marker {
  const element = document.createElement('div')
  element.className = `map-marker map-marker-${marker.kind}`
  element.textContent = marker.label ?? ''
  return new Marker({ element })
}

/** Deja en el mapa exactamente los marcadores pedidos: crea los nuevos, mueve los que siguen y saca el resto. */
function syncMarkers(
  map: MapLibreMap,
  shown: Map<string, { marker: Marker; kind: string; label?: string }>,
  wanted: readonly MapMarker[],
) {
  const wantedIds = new Set(wanted.map((marker) => marker.id))
  for (const [id, { marker }] of shown) {
    if (!wantedIds.has(id)) {
      marker.remove()
      shown.delete(id)
    }
  }
  for (const marker of wanted) {
    const existing = shown.get(marker.id)
    const lngLat: [number, number] = [
      marker.position.longitude,
      marker.position.latitude,
    ]
    if (
      existing &&
      existing.kind === marker.kind &&
      existing.label === marker.label
    ) {
      existing.marker.setLngLat(lngLat)
      continue
    }
    existing?.marker.remove()
    const created = createMarker(marker).setLngLat(lngLat).addTo(map)
    shown.set(marker.id, {
      marker: created,
      kind: marker.kind,
      label: marker.label,
    })
  }
}

function createOwnPositionMarker(): Marker {
  const element = document.createElement('div')
  element.className = 'own-position-marker'
  return new Marker({ element })
}

export function createMapLibreMapView(
  dependencies: MapLibreMapViewDependencies,
): MapView {
  setWorkerUrl(workerUrl)
  const { provider, protocol, vectorSourceId, initialView } = dependencies

  return function MapLibreMapView({
    ref,
    language,
    ownPosition,
    markers = [],
    onUnavailableAreaChange,
    onLongPress,
  }: MapViewProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const mapRef = useRef<MapLibreMap>(null)
    const markerRef = useRef<Marker>(null)
    const shownMarkersRef = useRef(
      new Map<string, { marker: Marker; kind: string; label?: string }>(),
    )
    const styleLanguageRef = useRef(language)
    const unavailableTilesRef = useRef(new Map<string, TileCoordinates>())
    const reportedUnavailableAreaRef = useRef(false)
    const onUnavailableAreaChangeRef = useRef(onUnavailableAreaChange)
    onUnavailableAreaChangeRef.current = onUnavailableAreaChange
    const onLongPressRef = useRef(onLongPress)
    onLongPressRef.current = onLongPress

    function reportUnavailableArea() {
      const map = mapRef.current
      if (!map) return
      const displayedTileZoom = Math.min(
        Math.max(Math.floor(map.getZoom()), 0),
        provider.maxZoom,
      )
      const visible = visibleBounds(map)
      const hasUnavailableArea = [...unavailableTilesRef.current.values()].some(
        (tile) =>
          tile.z === displayedTileZoom &&
          boundsIntersect(tileBounds(tile), visible),
      )
      if (hasUnavailableArea !== reportedUnavailableAreaRef.current) {
        reportedUnavailableAreaRef.current = hasUnavailableArea
        onUnavailableAreaChangeRef.current?.(hasUnavailableArea)
      }
    }

    useEffect(() => {
      const container = containerRef.current!
      const map = new MapLibreMap({
        container,
        style: provider.buildStyle(
          styleLanguageRef.current,
        ) as unknown as StyleSpecification,
        center: [initialView.center.longitude, initialView.center.latitude],
        zoom: initialView.zoom,
        attributionControl: false,
        // La posición del mapa queda en la dirección de la página: al recargar se vuelve al mismo lugar.
        hash: true,
        dragRotate: false,
        touchPitch: false,
      })
      map.touchZoomRotate.disableRotation()
      map.keyboard.disableRotation()
      // Una tesela que no se pudo obtener no es un error de la app: se informa como zona no disponible.
      // MapLibre no vuelve a dibujar tras ese fallo; se lo pedimos para que el mapa quede en reposo.
      map.on('error', () => map.triggerRepaint())
      map.on('moveend', reportUnavailableArea)
      if (dependencies.exposeRenderDiagnostics) {
        exposeRenderDiagnostics(
          map,
          container,
          vectorSourceId,
          () => styleLanguageRef.current,
        )
      }
      mapRef.current = map
      const stopWatchingLongPress = watchLongPress(container, (point) => {
        const { lat, lng } = map.unproject([point.x, point.y])
        const position = { latitude: lat, longitude: lng }
        if (dependencies.exposeRenderDiagnostics) {
          container.dataset.longPressPosition = `${lat},${lng}`
        }
        onLongPressRef.current?.(position)
      })

      const unavailableTiles = unavailableTilesRef.current
      const shownMarkers = shownMarkersRef.current
      const unsubscribe = protocol.subscribeToTileOutcomes(
        (coordinates, outcome) => {
          if (outcome === 'unavailable') {
            unavailableTiles.set(tileKey(coordinates), coordinates)
          } else {
            unavailableTiles.delete(tileKey(coordinates))
          }
          reportUnavailableArea()
        },
      )

      return () => {
        stopWatchingLongPress()
        unsubscribe()
        unavailableTiles.clear()
        markerRef.current = null
        shownMarkers.clear()
        mapRef.current = null
        map.remove()
      }
    }, [])

    useEffect(() => {
      if (styleLanguageRef.current === language) return
      styleLanguageRef.current = language
      mapRef.current?.setStyle(
        provider.buildStyle(language) as unknown as StyleSpecification,
      )
    }, [language])

    useEffect(() => {
      const map = mapRef.current
      if (!map) return
      if (ownPosition === null) {
        markerRef.current?.remove()
        markerRef.current = null
        return
      }
      markerRef.current ??= createOwnPositionMarker()
      markerRef.current
        .setLngLat([
          ownPosition.position.longitude,
          ownPosition.position.latitude,
        ])
        .addTo(map)
      markerRef.current
        .getElement()
        .classList.toggle('is-last-known', ownPosition.isLastKnown)
    }, [ownPosition])

    useEffect(() => {
      const map = mapRef.current
      if (map) syncMarkers(map, shownMarkersRef.current, markers)
    }, [markers])

    useImperativeHandle(ref, () => ({
      centerOn(position) {
        mapRef.current?.easeTo({
          center: [position.longitude, position.latitude],
        })
      },
      getVisibleBounds() {
        return visibleBounds(mapRef.current!)
      },
      zoomIn(levels) {
        const map = mapRef.current
        map?.zoomTo(map.getZoom() + levels)
      },
      retryUnavailableTiles() {
        const map = mapRef.current
        const unavailableTiles = [...unavailableTilesRef.current.values()]
        if (!map || unavailableTiles.length === 0) return
        unavailableTilesRef.current.clear()
        // Hay que nombrar las teselas: sin la lista, MapLibre deja las que fallaron esperando una
        // carga que nunca ocurre (maplibre-gl 6.11, `VectorTileSource.loadTile`).
        if (map.getSource(vectorSourceId)) {
          map.refreshTiles(vectorSourceId, unavailableTiles)
        }
        reportUnavailableArea()
      },
      placesInView(types) {
        const map = mapRef.current
        if (!map) return []
        return queryPlacesInView(
          map,
          vectorSourceId,
          types,
          styleLanguageRef.current,
        )
      },
    }))

    return <div ref={containerRef} className="map-view" data-testid="map" />
  }
}
