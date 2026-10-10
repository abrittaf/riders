import type { Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import {
  decodePolyline,
  encodePolyline,
} from '../../src/map-platform/polyline.ts'

/** La dirección del buscador real, la de `placeSearch.serverUrl` en `src/config/map-config.ts`. */
const PLACE_SEARCH_SERVER = 'https://photon.komoot.io'

const PHOTON_FIXTURES = new URL(
  '../../src/map-platform/providers/photon/fixtures/',
  import.meta.url,
)

function photonFixture(name: string): string {
  return readFileSync(new URL(`${name}.json`, PHOTON_FIXTURES), 'utf8')
}

/**
 * Proveedor de búsqueda simulado (design.md de roadmap-planning, D9): responde a las direcciones
 * del buscador real con las respuestas grabadas, sin tocar la instancia pública.
 */
export async function simulatePlaceSearch(page: Page) {
  await page.route(`${PLACE_SEARCH_SERVER}/**`, (route) => {
    const url = new URL(route.request().url())
    const query = url.searchParams.get('q')
    const fixture =
      url.pathname === '/reverse'
        ? 'reverse-cachi'
        : query === 'Cachi'
          ? 'search-cachi'
          : query === 'YPF'
            ? 'search-fuel'
            : 'search-no-match'
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: photonFixture(fixture),
    })
  })
}

/** La dirección del motor de ruteo real, la de `routing.serverUrl` en `src/config/map-config.ts`. */
const ROUTING_SERVER = 'https://valhalla1.openstreetmap.de'

/** Posiciones de las fixtures de Photon con un papel en el ruteo simulado. */
export const SIMULATED_ROUTING = {
  /** «Cachi Adentro»: no hay camino hasta ahí. */
  unreachableLatitude: -25.1003444,
  /** La calle «Cachi» de El Tipal: se llega por un tramo final sin pavimentar. */
  unpavedAccessLatitude: -24.76052,
  /** La calle «Cachi» de Rosario de la Frontera: una parte sin dato de superficie. */
  unknownSurfaceLatitude: -25.7769699,
}

interface Location {
  lat: number
  lon: number
}

function straightShape(from: Location, to: Location): Location[] {
  return Array.from({ length: 5 }, (_, index) => ({
    lat: from.lat + ((to.lat - from.lat) * index) / 4,
    lon: from.lon + ((to.lon - from.lon) * index) / 4,
  }))
}

function distanceKm(from: Location, to: Location): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180
  const dLat = toRadians(to.lat - from.lat)
  const dLon = toRadians(to.lon - from.lon)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(from.lat)) *
      Math.cos(toRadians(to.lat)) *
      Math.sin(dLon / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(h))
}

function near(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.0001
}

/**
 * Motor de ruteo simulado (design.md, D9): une cada par de posiciones con una recta, con la
 * forma de respuesta de Valhalla, y reproduce los casos de las fixtures grabadas: sin camino,
 * tramo final sin pavimentar y parte sin dato de superficie.
 */
export async function simulateRouting(page: Page) {
  await page.route(`${ROUTING_SERVER}/**`, async (route) => {
    const url = new URL(route.request().url())
    const body = route.request().postDataJSON() as {
      locations?: Location[]
      encoded_polyline?: string
    }
    if (url.pathname === '/route') {
      const locations = body.locations ?? []
      const legs = []
      for (let index = 0; index + 1 < locations.length; index++) {
        const from = locations[index]!
        const to = locations[index + 1]!
        if (near(to.lat, SIMULATED_ROUTING.unreachableLatitude)) {
          return route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({
              error_code: 442,
              error: 'No path could be found for input',
              status_code: 400,
              status: 'Bad Request',
            }),
          })
        }
        const length = distanceKm(from, to)
        legs.push({
          summary: { length, time: (length / 60) * 3600 },
          shape: encodePolyline(
            straightShape(from, to).map((p) => ({
              latitude: p.lat,
              longitude: p.lon,
            })),
            6,
          ),
        })
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ trip: { legs } }),
      })
    }
    const shape = decodePolyline(body.encoded_polyline ?? '', 6)
    const last = shape.at(-1)
    const edges = []
    for (let index = 0; index + 1 < shape.length; index++) {
      const edge: Record<string, unknown> = {
        surface: 'paved_smooth',
        begin_shape_index: index,
        end_shape_index: index + 1,
      }
      const isLastEdge = index + 2 === shape.length
      if (
        last &&
        isLastEdge &&
        near(last.latitude, SIMULATED_ROUTING.unpavedAccessLatitude)
      ) {
        edge['surface'] = 'compacted'
      }
      if (
        last &&
        index === 1 &&
        near(last.latitude, SIMULATED_ROUTING.unknownSurfaceLatitude)
      ) {
        delete edge['surface']
      }
      edges.push(edge)
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ units: 'kilometers', edges }),
    })
  })
}
