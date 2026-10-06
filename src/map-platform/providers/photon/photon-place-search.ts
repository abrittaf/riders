import type { GeoPosition } from '../../geo.ts'
import type { MapAttribution } from '../../map-provider.ts'
import type { Place } from '../../place.ts'
import {
  type PlaceSearch,
  PlaceSearchUnavailableError,
} from '../../place-search.ts'
import type { RequestPacer } from '../request-pacer.ts'
import { placeTypeOfTag } from './photon-place-types.ts'

export interface PhotonConfig {
  serverUrl: string
  maxResults: number
}

interface PhotonFeature {
  geometry: { coordinates: [number, number] }
  properties: {
    name?: string
    osm_key?: string
    osm_value?: string
    type?: string
    street?: string
    housenumber?: string
    city?: string
    locality?: string
    county?: string
    state?: string
    country?: string
  }
}

interface PhotonResponse {
  features?: PhotonFeature[]
}

/** Resultados que son una división administrativa: su "localidad" es la provincia o el país. */
const ADMINISTRATIVE_TYPES = new Set(['city', 'county', 'state', 'country'])

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

/**
 * Búsqueda de lugares con Photon (design.md de roadmap-planning, D2). Sin parámetro de idioma, la
 * instancia pública devuelve el nombre original de cada lugar: no indexa el español.
 */
export class PhotonPlaceSearch implements PlaceSearch {
  readonly attributions: readonly MapAttribution[] = [
    {
      name: 'Photon',
      url: 'https://photon.komoot.io/',
      descriptionKey: 'map.sources.photon',
    },
  ]
  private readonly config: PhotonConfig
  private readonly pacer: RequestPacer
  private readonly fetchFromServer: typeof fetch

  constructor(
    config: PhotonConfig,
    pacer: RequestPacer,
    fetchFromServer: typeof fetch = (...args) => fetch(...args),
  ) {
    this.config = config
    this.pacer = pacer
    this.fetchFromServer = fetchFromServer
  }

  async searchByName(
    query: string,
    near: GeoPosition,
    signal?: AbortSignal,
  ): Promise<Place[]> {
    const features = await this.get(
      '/api',
      {
        q: query,
        lat: near.latitude,
        lon: near.longitude,
        limit: this.config.maxResults,
      },
      signal,
    )
    return features.map(toPlace).filter((place) => place !== null)
  }

  async findNearestPlace(
    position: GeoPosition,
    signal?: AbortSignal,
  ): Promise<Place | null> {
    const features = await this.get(
      '/reverse',
      { lat: position.latitude, lon: position.longitude, limit: 1 },
      signal,
    )
    return features.map(toPlace).find((place) => place !== null) ?? null
  }

  private async get(
    path: string,
    parameters: Record<string, string | number>,
    signal?: AbortSignal,
  ): Promise<PhotonFeature[]> {
    const url = new URL(`${this.config.serverUrl}${path}`)
    for (const [name, value] of Object.entries(parameters)) {
      url.searchParams.set(name, String(value))
    }
    await this.pacer.waitForTurn(signal)
    let response: Response
    try {
      response = await this.fetchFromServer(url, { signal })
    } catch (error) {
      if (isAbort(error)) throw error
      throw new PlaceSearchUnavailableError({ cause: error })
    }
    if (!response.ok) {
      throw new PlaceSearchUnavailableError({
        cause: new Error(`Photon ${response.status} al pedir ${url.pathname}`),
      })
    }
    const body = (await response.json()) as PhotonResponse
    return body.features ?? []
  }
}

function toPlace(feature: PhotonFeature): Place | null {
  const { properties } = feature
  const name = nameOf(properties)
  if (name === null) return null
  const [longitude, latitude] = feature.geometry.coordinates
  return {
    name,
    position: { latitude, longitude },
    type: placeTypeOfTag(properties.osm_key, properties.osm_value),
    locality: localityOf(properties),
  }
}

/** Un lugar sin nombre propio (una casa, una calle) se nombra con su dirección. */
function nameOf(properties: PhotonFeature['properties']): string | null {
  if (properties.name) return properties.name
  if (properties.street) {
    return properties.housenumber
      ? `${properties.street} ${properties.housenumber}`
      : properties.street
  }
  return null
}

function localityOf(properties: PhotonFeature['properties']): string | null {
  if (
    properties.type !== undefined &&
    ADMINISTRATIVE_TYPES.has(properties.type)
  ) {
    return properties.state ?? properties.country ?? null
  }
  return (
    properties.city ??
    properties.locality ??
    properties.county ??
    properties.state ??
    null
  )
}
