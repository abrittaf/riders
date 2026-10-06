import type { GeoPosition, Place, PlaceType } from '../map-platform/index.ts'

/** De dónde salió el Point: un lugar conocido del proveedor de mapas o una posición tocada. */
export type PointSource = 'known-place' | 'chosen-position'

/** Un lugar elegido por un Rider (spec point-lookup, «Datos de un Point»). */
export interface Point {
  name: string
  position: GeoPosition
  source: PointSource
  /** Tipo de lugar, conservado cuando viene de un lugar conocido que lo tiene. */
  type: PlaceType | null
  /** Fecha asociada, en formato `AAAA-MM-DD`, sin hora ni zona horaria. */
  date: string | null
}

export function pointFromPlace(place: Place): Point {
  return {
    name: place.name,
    position: place.position,
    source: 'known-place',
    type: place.type,
    date: null,
  }
}

export function pointFromPosition(position: GeoPosition, name: string): Point {
  return { name, position, source: 'chosen-position', type: null, date: null }
}

/** Las coordenadas como nombre provisorio de una posición: «-25,1197, -66,1656». */
export function formatCoordinates(
  position: GeoPosition,
  language: string,
): string {
  const format = new Intl.NumberFormat(language, {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  })
  return `${format.format(position.latitude)}, ${format.format(position.longitude)}`
}
