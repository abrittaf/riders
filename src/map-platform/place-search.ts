import type { GeoPosition } from './geo.ts'
import type { MapAttribution } from './map-provider.ts'
import type { Place } from './place.ts'

/** El buscador de lugares no respondió o respondió con un error: sin conectividad, servidor caído, límite de uso. */
export class PlaceSearchUnavailableError extends Error {
  constructor(options?: ErrorOptions) {
    super('El buscador de lugares no está disponible', options)
    this.name = 'PlaceSearchUnavailableError'
  }
}

/** Busca lugares por nombre y resuelve posiciones a lugares. Único punto de acceso a los geocodificadores. */
export interface PlaceSearch {
  /** Buscador y datos que exigen ser mencionados donde se muestran sus resultados. */
  readonly attributions: readonly MapAttribution[]
  /**
   * Lugares cuyo nombre coincide con `query`, priorizados por cercanía a `near`.
   * @throws PlaceSearchUnavailableError
   */
  searchByName(
    query: string,
    near: GeoPosition,
    signal?: AbortSignal,
  ): Promise<Place[]>
  /**
   * El lugar o la dirección más cercana a una posición, para proponerle un nombre; `null` si no hay
   * nada cerca.
   * @throws PlaceSearchUnavailableError
   */
  findNearestPlace(
    position: GeoPosition,
    signal?: AbortSignal,
  ): Promise<Place | null>
}
