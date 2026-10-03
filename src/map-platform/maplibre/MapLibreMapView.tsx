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
import type { MapView, MapViewProps } from '../map-view.ts'
import { tileBounds } from '../tile-math.ts'
import { type TileCoordinates, tileKey } from '../tile-source.ts'
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

function exposeRenderDiagnostics(map: MapLibreMap, container: HTMLElement) {
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
    container.dataset.zoom = String(map.getZoom())
    container.dataset.centerLatitude = String(map.getCenter().lat)
    container.dataset.centerLongitude = String(map.getCenter().lng)
    container.dataset.mapIdle = 'true'
  })
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
    onUnavailableAreaChange,
  }: MapViewProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const mapRef = useRef<MapLibreMap>(null)
    const markerRef = useRef<Marker>(null)
    const styleLanguageRef = useRef(language)
    const unavailableTilesRef = useRef(new Map<string, TileCoordinates>())
    const reportedUnavailableAreaRef = useRef(false)
    const onUnavailableAreaChangeRef = useRef(onUnavailableAreaChange)
    onUnavailableAreaChangeRef.current = onUnavailableAreaChange

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
        exposeRenderDiagnostics(map, container)
      }
      mapRef.current = map

      const unavailableTiles = unavailableTilesRef.current
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
        unsubscribe()
        unavailableTiles.clear()
        markerRef.current = null
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
    }))

    return <div ref={containerRef} className="map-view" data-testid="map" />
  }
}
