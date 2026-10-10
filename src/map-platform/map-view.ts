import type { ComponentType, Ref } from 'react'
import type { GeoBounds, GeoPosition } from './geo.ts'
import type { Place, PlaceType } from './place.ts'
import type { SurfaceSegment } from './route-provider.ts'

/** Fracción del ancho y del alto del mapa donde se dibuja la mira para elegir una posición (D6). */
export const MAP_CROSSHAIR_POSITION = { x: 0.5, y: 0.3 }

export interface MapViewHandle {
  /** Deja la posición en el centro del mapa manteniendo el nivel de detalle actual. */
  centerOn(position: GeoPosition): void
  /** Encuadra el mapa para que la zona entre completa, con un margen alrededor. */
  fitBounds(bounds: GeoBounds): void
  getVisibleBounds(): GeoBounds
  /** La posición del mapa bajo un punto dado como fracción del ancho y del alto (0 a 1). */
  positionAt(fraction: { x: number; y: number }): GeoPosition
  zoomIn(levels: number): void
  /** Vuelve a pedir las teselas que no se pudieron obtener (por ejemplo, al recuperar la conectividad). */
  retryUnavailableTiles(): void
  /**
   * Lugares de los tipos pedidos dentro de la zona visible, leídos de las teselas ya cargadas:
   * funciona también sin conexión en una zona descargada. Con el mapa muy alejado no hay lugares.
   */
  placesInView(types: readonly PlaceType[]): Place[]
}

export interface OwnPositionMarker {
  position: GeoPosition
  /** La posición es la última conocida: el celular está buscando señal. */
  isLastKnown: boolean
}

export type MapMarkerKind = 'highlighted-place' | 'point'

/** Un marcador sobre el mapa: un lugar resaltado al elegir por tipo, o un Point numerado de un Roadmap. */
export interface MapMarker {
  id: string
  position: GeoPosition
  kind: MapMarkerKind
  /** Texto dentro del marcador (el número del Point). */
  label?: string
}

/** Un tramo de ruta para dibujar: su geometría y la superficie de cada parte (D1b). */
export interface RouteLegDisplay {
  geometry: readonly GeoPosition[]
  surfaces: readonly SurfaceSegment[]
}

export interface MapViewProps {
  ref?: Ref<MapViewHandle>
  /** Idioma preferido para los nombres del mapa, cuando el dato existe. */
  language: string
  ownPosition: OwnPositionMarker | null
  markers?: readonly MapMarker[]
  /** La ruta de un Roadmap, dibujada por segmentos con el estilo de línea de su superficie. */
  route?: readonly RouteLegDisplay[]
  /** Avisa si en la zona visible hay partes del mapa que no se pudieron obtener. */
  onUnavailableAreaChange?: (hasUnavailableArea: boolean) => void
  /** Toque sostenido sobre el mapa: el gesto para elegir una posición cualquiera. */
  onLongPress?: (position: GeoPosition) => void
}

/**
 * El componente de mapa. Los próximos changes agregan acá capas y marcadores
 * (ruta del Roadmap, posición de otros Riders) sin conocer el renderizador.
 */
export type MapView = ComponentType<MapViewProps>
