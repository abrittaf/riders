import type { ComponentType, Ref } from 'react'
import type { GeoBounds, GeoPosition } from './geo.ts'

export interface MapViewHandle {
  /** Deja la posición en el centro del mapa manteniendo el nivel de detalle actual. */
  centerOn(position: GeoPosition): void
  getVisibleBounds(): GeoBounds
  zoomIn(levels: number): void
  /** Vuelve a pedir las teselas que no se pudieron obtener (por ejemplo, al recuperar la conectividad). */
  retryUnavailableTiles(): void
}

export interface OwnPositionMarker {
  position: GeoPosition
  /** La posición es la última conocida: el celular está buscando señal. */
  isLastKnown: boolean
}

export interface MapViewProps {
  ref?: Ref<MapViewHandle>
  /** Idioma preferido para los nombres del mapa, cuando el dato existe. */
  language: string
  ownPosition: OwnPositionMarker | null
  /** Avisa si en la zona visible hay partes del mapa que no se pudieron obtener. */
  onUnavailableAreaChange?: (hasUnavailableArea: boolean) => void
}

/**
 * El componente de mapa. Los próximos changes agregan acá capas y marcadores
 * (ruta del Roadmap, posición de otros Riders) sin conocer el renderizador.
 */
export type MapView = ComponentType<MapViewProps>
