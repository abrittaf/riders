import type { GeoPosition, Place, PlaceSearch } from '../map-platform/index.ts'
import { PlaceSearchUnavailableError } from '../map-platform/index.ts'

/** Buscador simulado: responde con los lugares que se le cargan y registra lo que se le pidió. */
export class FakePlaceSearch implements PlaceSearch {
  readonly attributions = []
  results: Place[] = []
  nearest: Place | null = null
  available = true
  readonly queries: { query: string; near: GeoPosition }[] = []

  searchByName(query: string, near: GeoPosition): Promise<Place[]> {
    this.queries.push({ query, near })
    if (!this.available) {
      return Promise.reject(new PlaceSearchUnavailableError())
    }
    return Promise.resolve(this.results)
  }

  findNearestPlace(): Promise<Place | null> {
    if (!this.available) {
      return Promise.reject(new PlaceSearchUnavailableError())
    }
    return Promise.resolve(this.nearest)
  }
}

export function place(overrides: Partial<Place> & { name: string }): Place {
  return {
    position: { latitude: -25.12, longitude: -66.16 },
    type: null,
    locality: null,
    ...overrides,
  }
}
