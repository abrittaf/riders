import type { ComponentType, Ref } from 'react'
import type { GeoBounds, GeoPosition } from './geo.ts'
import type { Place, PlaceType } from './place.ts'

export interface MapViewHandle {
  /** Deja la posición en el centro del mapa manteniendo el nivel de detalle actual. */
  centerOn(position: GeoPosition): void
  getVisibleBounds(): GeoBounds
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

export interface MapViewProps {
  ref?: Ref<MapViewHandle>
  /** Idioma preferido para los nombres del mapa, cuando el dato existe. */
  language: string
  ownPosition: OwnPositionMarker | null
  markers?: readonly MapMarker[]
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
