import type { GeoPosition } from './geo.ts'

/** Tipos de lugar que la app distingue; el resto de los lugares con nombre del mapa son puntos de interés. */
export type PlaceType = 'fuel' | 'lodging' | 'restaurant' | 'point-of-interest'

/** Un lugar conocido del proveedor de mapas. */
export interface Place {
  /** En español cuando el proveedor lo tiene; en su idioma de origen si no. */
  name: string
  position: GeoPosition
  /** `null` cuando el proveedor no lo clasifica en ninguno de los tipos de la app. */
  type: PlaceType | null
  /** Localidad a la que pertenece, cuando se conoce. */
  locality: string | null
}
