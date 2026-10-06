// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import type { GeoPosition } from '../../geo.ts'
import { encodePolyline } from '../../polyline.ts'
import {
  NoRouteError,
  RouteLimitExceededError,
  RouteServiceUnavailableError,
  type SurfaceSegment,
} from '../../route-provider.ts'
import { RequestPacer } from '../request-pacer.ts'
import routeNoEdgesNearLocation from './fixtures/route-no-edges-near-location.json'
import routeNoPath from './fixtures/route-no-path.json'
import routeSaltaCachi from './fixtures/route-salta-cachi.json'
import traceSaltaCachi from './fixtures/trace-salta-cachi.json'
import { ValhallaRouteProvider } from './valhalla-route-provider.ts'

const SERVER = 'https://ruteo.example'
const CONFIG = { serverUrl: SERVER, costing: 'motorcycle' }
const SALTA = { latitude: -24.7859, longitude: -65.4117 }
const CACHI = { latitude: -25.1197, longitude: -66.1656 }
const OPEN_SEA = { latitude: -38.2, longitude: -56.5 }

/** Puntos de un tramo sintético: `count` posiciones en línea recta desde `start`. */
function straightLine(start: GeoPosition, count: number): GeoPosition[] {
  return Array.from({ length: count }, (_, index) => ({
    latitude: start.latitude - index * 0.01,
    longitude: start.longitude,
  }))
}

function legOf(geometry: GeoPosition[], lengthKm: number, timeS: number) {
  return {
    summary: { length: lengthKm, time: timeS },
    shape: encodePolyline(geometry, 6),
  }
}

/** Los tramos consecutivos de Valhalla comparten la posición de la parada. */
const LEG_A = straightLine({ latitude: -30, longitude: -60 }, 4)
const LEG_B = straightLine(LEG_A.at(-1)!, 3)
const LEG_C = straightLine(LEG_B.at(-1)!, 5)
const FOUR_POINTS = [LEG_A[0]!, LEG_B[0]!, LEG_C[0]!, LEG_C.at(-1)!]
const THREE_LEGS_ROUTE = {
  trip: {
    legs: [legOf(LEG_A, 3, 180), legOf(LEG_B, 2, 120), legOf(LEG_C, 4, 240)],
  },
}

type Reply = { status: number; body: unknown } | 'offline'

/** Servidor simulado: responde por ruta con lo que se le programa, en orden. */
function simulatedServer(replies: Record<string, Reply[]>) {
  const requests: { path: string; body: unknown }[] = []
  const fetchFromServer = vi.fn(
    (input: RequestInfo | URL, init?: RequestInit) => {
      const path = String(input).replace(SERVER, '')
      requests.push({ path, body: JSON.parse(String(init?.body)) })
      const reply = replies[path]?.shift()
      if (reply === undefined) {
        return Promise.resolve(new Response(null, { status: 500 }))
      }
      if (reply === 'offline') {
        return Promise.reject(new TypeError('Failed to fetch'))
      }
      return Promise.resolve(
        Response.json(reply.body, { status: reply.status }),
      )
    },
  )
  return {
    requests,
    fetchFromServer: fetchFromServer as unknown as typeof fetch,
  }
}

function createProvider(server: ReturnType<typeof simulatedServer>) {
  const immediateClock = { now: () => 0, sleep: () => Promise.resolve() }
  return new ValhallaRouteProvider(
    CONFIG,
    new RequestPacer(1000, immediateClock),
    server.fetchFromServer,
  )
}

function totalByClass(segments: SurfaceSegment[]) {
  const totals: Record<string, number> = {}
  for (const segment of segments) {
    totals[segment.surface] =
      (totals[segment.surface] ?? 0) + (segment.toIndex - segment.fromIndex)
  }
  return totals
}

describe('rutas de Valhalla', () => {
  it('pide la ruta de dos Points con el perfil de motocicleta y la política de superficie fija, sin indicaciones de giro', async () => {
    const server = simulatedServer({
      '/route': [{ status: 200, body: routeSaltaCachi }],
      '/trace_attributes': [{ status: 200, body: traceSaltaCachi }],
    })

    const route = await createProvider(server).calculateRoute({
      waypoints: [SALTA, CACHI],
      preference: 'paved-when-available',
    })

    expect(server.requests[0]).toEqual({
      path: '/route',
      body: {
        locations: [
          { lat: SALTA.latitude, lon: SALTA.longitude, type: 'break' },
          { lat: CACHI.latitude, lon: CACHI.longitude, type: 'break' },
        ],
        costing: 'motorcycle',
        costing_options: {
          motorcycle: { exclude_unpaved: true, use_trails: 0 },
        },
        units: 'kilometers',
        directions_type: 'none',
      },
    })
    expect(route.legs).toHaveLength(1)
    const leg = route.legs[0]!
    expect(leg.distanceInMeters).toBe(167273)
    expect(leg.durationInSeconds).toBe(18547)
    expect(leg.geometry).toHaveLength(3076)
    expect(leg.geometry[0]).toEqual({
      latitude: -24.785874,
      longitude: -65.412022,
    })
    expect(leg.geometry.at(-1)!.latitude).toBeCloseTo(CACHI.latitude, 2)
  })

  it('consulta la superficie de la geometría devuelta y la informa por segmento en las clases de la app', async () => {
    const server = simulatedServer({
      '/route': [{ status: 200, body: routeSaltaCachi }],
      '/trace_attributes': [{ status: 200, body: traceSaltaCachi }],
    })

    const route = await createProvider(server).calculateRoute({
      waypoints: [SALTA, CACHI],
      preference: 'paved-when-available',
    })

    expect(server.requests[1]).toMatchObject({
      path: '/trace_attributes',
      body: {
        encoded_polyline: routeSaltaCachi.trip.legs[0]!.shape,
        costing: 'motorcycle',
        shape_match: 'walk_or_snap',
        filters: {
          attributes: [
            'edge.surface',
            'edge.begin_shape_index',
            'edge.end_shape_index',
          ],
          action: 'include',
        },
      },
    })
    const { surfaces } = route.legs[0]!
    // La Cuesta del Obispo es el único ripio del camino: pavimento, consolidado, pavimento.
    expect(surfaces.map((segment) => segment.surface)).toEqual([
      'paved',
      'compacted',
      'paved',
    ])
    expect(surfaces[0]!.fromIndex).toBe(0)
    expect(surfaces.at(-1)!.toIndex).toBe(3075)
    expect(surfaces[0]!.toIndex).toBe(surfaces[1]!.fromIndex)
  })

  it('una ruta de cuatro Points se pide en una sola consulta y su superficie en otra, repartida por tramo', async () => {
    const server = simulatedServer({
      '/route': [{ status: 200, body: THREE_LEGS_ROUTE }],
      '/trace_attributes': [
        {
          status: 200,
          body: {
            edges: [
              { surface: 'paved', begin_shape_index: 0, end_shape_index: 2 },
              {
                surface: 'paved_rough',
                begin_shape_index: 2,
                end_shape_index: 4,
              },
              { surface: 'gravel', begin_shape_index: 4, end_shape_index: 7 },
              { surface: 'dirt', begin_shape_index: 7, end_shape_index: 9 },
            ],
          },
        },
      ],
    })

    const route = await createProvider(server).calculateRoute({
      waypoints: FOUR_POINTS,
      preference: 'paved-when-available',
    })

    expect(server.requests.map((request) => request.path)).toEqual([
      '/route',
      '/trace_attributes',
    ])
    // Las geometrías encadenadas no repiten la parada compartida: 4 + 2 + 4 posiciones.
    expect(server.requests[1]!.body).toMatchObject({
      encoded_polyline: encodePolyline(
        [...LEG_A, ...LEG_B.slice(1), ...LEG_C.slice(1)],
        6,
      ),
    })
    expect(route.legs.map((leg) => leg.geometry.length)).toEqual([4, 3, 5])
    expect(route.legs.map((leg) => leg.surfaces)).toEqual([
      [{ fromIndex: 0, toIndex: 3, surface: 'paved' }],
      [
        { fromIndex: 0, toIndex: 1, surface: 'paved' },
        { fromIndex: 1, toIndex: 2, surface: 'compacted' },
      ],
      [
        { fromIndex: 0, toIndex: 2, surface: 'compacted' },
        { fromIndex: 2, toIndex: 4, surface: 'loose' },
      ],
    ])
  })

  it('cuando no hay camino entre los dos Points pedidos, informa el tramo', async () => {
    const server = simulatedServer({
      '/route': [{ status: 400, body: routeNoPath }],
    })

    const request = createProvider(server).calculateRoute({
      waypoints: [SALTA, CACHI],
      preference: 'paved-when-available',
    })

    await expect(request).rejects.toThrow(NoRouteError)
    await expect(request).rejects.toMatchObject({ legIndex: 0 })
  })

  it('un Point sin caminos cerca (en el mar) también es un tramo sin camino', async () => {
    const server = simulatedServer({
      '/route': [{ status: 400, body: routeNoEdgesNearLocation }],
    })

    await expect(
      createProvider(server).calculateRoute({
        waypoints: [SALTA, OPEN_SEA],
        preference: 'paved-when-available',
      }),
    ).rejects.toThrow(NoRouteError)
  })

  it('con más de dos Points en una sola consulta no sabe qué tramo no tiene camino', async () => {
    const server = simulatedServer({
      '/route': [{ status: 400, body: routeNoPath }],
    })

    await expect(
      createProvider(server).calculateRoute({
        waypoints: FOUR_POINTS,
        preference: 'paved-when-available',
      }),
    ).rejects.toMatchObject({ name: 'NoRouteError', legIndex: null })
  })

  it('si la consulta única supera la distancia máxima del servidor, pide los tramos de a uno', async () => {
    const tooLong = {
      error_code: 154,
      error: 'Path distance exceeds the max distance limit: 1500000 meters',
    }
    const server = simulatedServer({
      '/route': [
        { status: 400, body: tooLong },
        { status: 200, body: { trip: { legs: [legOf(LEG_A, 3, 180)] } } },
        { status: 200, body: { trip: { legs: [legOf(LEG_B, 2, 120)] } } },
        { status: 200, body: { trip: { legs: [legOf(LEG_C, 4, 240)] } } },
      ],
      '/trace_attributes': [{ status: 200, body: { edges: [] } }],
    })

    const route = await createProvider(server).calculateRoute({
      waypoints: FOUR_POINTS,
      preference: 'paved-when-available',
    })

    expect(server.requests.filter((r) => r.path === '/route')).toHaveLength(4)
    expect(route.legs.map((leg) => leg.distanceInMeters)).toEqual([
      3000, 2000, 4000,
    ])
  })

  it('al pedir los tramos de a uno, el que no tiene camino se informa con su índice', async () => {
    const tooLong = {
      error_code: 154,
      error: 'Path distance exceeds the max distance limit',
    }
    const server = simulatedServer({
      '/route': [
        { status: 400, body: tooLong },
        { status: 200, body: { trip: { legs: [legOf(LEG_A, 3, 180)] } } },
        { status: 400, body: routeNoPath },
      ],
    })

    await expect(
      createProvider(server).calculateRoute({
        waypoints: FOUR_POINTS,
        preference: 'paved-when-available',
      }),
    ).rejects.toMatchObject({ name: 'NoRouteError', legIndex: 1 })
  })

  it('un solo tramo más largo que el máximo del servidor no se puede calcular', async () => {
    const tooLong = {
      error_code: 154,
      error: 'Path distance exceeds the max distance limit',
    }
    const server = simulatedServer({
      '/route': [{ status: 400, body: tooLong }],
    })

    await expect(
      createProvider(server).calculateRoute({
        waypoints: [SALTA, CACHI],
        preference: 'paved-when-available',
      }),
    ).rejects.toThrow(RouteLimitExceededError)
  })

  it('un Point alcanzable solo por camino sin pavimentar: el final del tramo queda como consolidado o suelto', async () => {
    const server = simulatedServer({
      '/route': [
        { status: 200, body: { trip: { legs: [legOf(LEG_C, 4, 240)] } } },
      ],
      '/trace_attributes': [
        {
          status: 200,
          body: {
            edges: [
              {
                surface: 'paved_smooth',
                begin_shape_index: 0,
                end_shape_index: 3,
              },
              {
                surface: 'compacted',
                begin_shape_index: 3,
                end_shape_index: 4,
              },
            ],
          },
        },
      ],
    })

    const route = await createProvider(server).calculateRoute({
      waypoints: [LEG_C[0]!, LEG_C.at(-1)!],
      preference: 'paved-when-available',
    })

    expect(totalByClass(route.legs[0]!.surfaces)).toEqual({
      paved: 3,
      compacted: 1,
    })
  })

  it('una parte de la geometría sin dato de superficie se informa como sin dato, sin contarla en otra clase', async () => {
    const server = simulatedServer({
      '/route': [
        { status: 200, body: { trip: { legs: [legOf(LEG_C, 4, 240)] } } },
      ],
      '/trace_attributes': [
        {
          status: 200,
          body: {
            edges: [
              { surface: 'paved', begin_shape_index: 0, end_shape_index: 1 },
              { begin_shape_index: 1, end_shape_index: 2 },
              { surface: 'paved', begin_shape_index: 3, end_shape_index: 4 },
            ],
          },
        },
      ],
    })

    const route = await createProvider(server).calculateRoute({
      waypoints: [LEG_C[0]!, LEG_C.at(-1)!],
      preference: 'paved-when-available',
    })

    expect(route.legs[0]!.surfaces).toEqual([
      { fromIndex: 0, toIndex: 1, surface: 'paved' },
      { fromIndex: 1, toIndex: 3, surface: 'unknown' },
      { fromIndex: 3, toIndex: 4, surface: 'paved' },
    ])
  })

  it('si la consulta de superficie falla, la ruta vale igual con toda su superficie sin dato', async () => {
    const server = simulatedServer({
      '/route': [{ status: 200, body: THREE_LEGS_ROUTE }],
      '/trace_attributes': [{ status: 503, body: {} }],
    })

    const route = await createProvider(server).calculateRoute({
      waypoints: FOUR_POINTS,
      preference: 'paved-when-available',
    })

    expect(route.legs.map((leg) => leg.distanceInMeters)).toEqual([
      3000, 2000, 4000,
    ])
    expect(route.legs.map((leg) => leg.surfaces)).toEqual([
      [{ fromIndex: 0, toIndex: 3, surface: 'unknown' }],
      [{ fromIndex: 0, toIndex: 2, surface: 'unknown' }],
      [{ fromIndex: 0, toIndex: 4, surface: 'unknown' }],
    ])
  })

  it.each([
    ['sin conectividad', 'offline' as const],
    [
      'con un error del servidor',
      { status: 500, body: 'Internal Server Error' },
    ],
  ])('informa el servicio como no disponible %s', async (_, reply) => {
    const server = simulatedServer({ '/route': [reply] })

    await expect(
      createProvider(server).calculateRoute({
        waypoints: [SALTA, CACHI],
        preference: 'paved-when-available',
      }),
    ).rejects.toThrow(RouteServiceUnavailableError)
  })

  it('informa cuando el servidor rechaza la consulta por exceso de consultas', async () => {
    const server = simulatedServer({ '/route': [{ status: 429, body: {} }] })

    await expect(
      createProvider(server).calculateRoute({
        waypoints: [SALTA, CACHI],
        preference: 'paved-when-available',
      }),
    ).rejects.toMatchObject({
      name: 'RouteLimitExceededError',
      limit: 'request-rate',
    })
  })

  it('espacia sus consultas al servidor según la condición de uso de una por segundo', async () => {
    let now = 0
    const sleep = vi.fn((ms: number) => {
      now += ms
      return Promise.resolve()
    })
    const server = simulatedServer({
      '/route': [{ status: 200, body: THREE_LEGS_ROUTE }],
      '/trace_attributes': [{ status: 200, body: { edges: [] } }],
    })
    const provider = new ValhallaRouteProvider(
      CONFIG,
      new RequestPacer(1000, { now: () => now, sleep }),
      server.fetchFromServer,
    )

    await provider.calculateRoute({
      waypoints: FOUR_POINTS,
      preference: 'paved-when-available',
    })

    expect(sleep.mock.calls).toEqual([[1000, undefined]])
  })

  it('una consulta cancelada no se informa como servicio no disponible', async () => {
    const abort = new AbortController()
    const fetchAborted = vi.fn(() =>
      Promise.reject(new DOMException('Cancelada', 'AbortError')),
    ) as unknown as typeof fetch
    const provider = new ValhallaRouteProvider(
      CONFIG,
      new RequestPacer(1000, { now: () => 0, sleep: () => Promise.resolve() }),
      fetchAborted,
    )

    const request = provider.calculateRoute(
      { waypoints: [SALTA, CACHI], preference: 'paved-when-available' },
      abort.signal,
    )

    await expect(request).rejects.toMatchObject({ name: 'AbortError' })
  })
})

describe('espaciado de consultas', () => {
  it('la primera consulta sale en el acto y las siguientes esperan el intervalo, también si se piden a la vez', async () => {
    const waits: number[] = []
    const pacer = new RequestPacer(1000, {
      now: () => 0,
      sleep: (ms) => {
        waits.push(ms)
        return Promise.resolve()
      },
    })

    await Promise.all([
      pacer.waitForTurn(),
      pacer.waitForTurn(),
      pacer.waitForTurn(),
    ])

    expect(waits).toEqual([1000, 2000])
  })

  it('pasado el intervalo, la consulta siguiente no espera', async () => {
    let now = 0
    const sleep = vi.fn(() => Promise.resolve())
    const pacer = new RequestPacer(1000, { now: () => now, sleep })

    await pacer.waitForTurn()
    now = 5000
    await pacer.waitForTurn()

    expect(sleep).not.toHaveBeenCalled()
  })
})
