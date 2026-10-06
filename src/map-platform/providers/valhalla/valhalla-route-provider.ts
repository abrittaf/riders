import type { GeoPosition } from '../../geo.ts'
import type { MapAttribution } from '../../map-provider.ts'
import { decodePolyline, encodePolyline } from '../../polyline.ts'
import {
  NoRouteError,
  type Route,
  RouteLimitExceededError,
  type RouteProvider,
  type RouteRequest,
  RouteServiceUnavailableError,
  type SurfaceSegment,
} from '../../route-provider.ts'
import type { RequestPacer } from '../request-pacer.ts'
import { roadSurfaceOf } from './valhalla-surfaces.ts'

export interface ValhallaConfig {
  serverUrl: string
  /** Perfil de ruteo; el único con sentido para la app es `motorcycle`. */
  costing: string
}

/** Valhalla codifica las geometrías con seis decimales. */
const VALHALLA_POLYLINE_PRECISION = 6

/**
 * Política de superficie del producto (design.md, D1): `exclude_unpaved` permite empezar y terminar
 * un tramo por camino sin pavimentar pero no atravesarlo por uno; `use_trails` en cero evita huellas.
 */
const PAVED_WHEN_AVAILABLE = { exclude_unpaved: true, use_trails: 0 }

/** Códigos de error de Valhalla que significan que no hay camino entre las posiciones pedidas. */
const NO_ROUTE_ERROR_CODES = new Set([170, 171, 442])
/** La suma de distancias de la consulta supera el máximo configurado en el servidor. */
const DISTANCE_LIMIT_ERROR_CODE = 154
const TOO_MANY_REQUESTS = 429

const SURFACE_ATTRIBUTES = [
  'edge.surface',
  'edge.begin_shape_index',
  'edge.end_shape_index',
]

interface ValhallaLeg {
  summary: { length: number; time: number }
  shape: string
}

interface ValhallaRouteResponse {
  trip: { legs: ValhallaLeg[] }
}

interface ValhallaError {
  error_code?: number
  error?: string
}

interface ValhallaEdge {
  surface?: string
  begin_shape_index: number
  end_shape_index: number
}

interface ValhallaTraceResponse {
  edges?: ValhallaEdge[]
}

type RoutedLeg = Omit<Route['legs'][number], 'surfaces'>

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

function positionsEqual(a: GeoPosition, b: GeoPosition): boolean {
  return a.latitude === b.latitude && a.longitude === b.longitude
}

/**
 * Rutas de Valhalla: una consulta a `/route` con todas las posiciones como paradas, que devuelve un
 * tramo por par consecutivo, y una segunda a `/trace_attributes` sobre la geometría completa para
 * conocer la superficie de cada parte (design.md de roadmap-planning, D1).
 */
export class ValhallaRouteProvider implements RouteProvider {
  readonly attributions: readonly MapAttribution[] = [
    {
      name: 'Valhalla',
      url: 'https://github.com/valhalla/valhalla',
      descriptionKey: 'map.sources.valhalla',
    },
    {
      name: 'FOSSGIS e.V.',
      url: 'https://www.fossgis.de/',
      descriptionKey: 'map.sources.fossgis',
    },
    // Condición de uso de FOSSGIS: atribuir los datos y enlazar a dónde corregir el mapa.
    {
      name: 'OpenStreetMap',
      url: 'https://www.openstreetmap.org/fixthemap',
      descriptionKey: 'map.sources.routeData',
    },
  ]
  private readonly config: ValhallaConfig
  private readonly pacer: RequestPacer
  private readonly fetchFromServer: typeof fetch

  constructor(
    config: ValhallaConfig,
    pacer: RequestPacer,
    fetchFromServer: typeof fetch = (...args) => fetch(...args),
  ) {
    this.config = config
    this.pacer = pacer
    this.fetchFromServer = fetchFromServer
  }

  async calculateRoute(
    request: RouteRequest,
    signal?: AbortSignal,
  ): Promise<Route> {
    if (request.waypoints.length < 2) {
      throw new Error('Una ruta necesita al menos dos posiciones')
    }
    const legs = await this.routeLegs(request.waypoints, signal)
    const surfaces = await this.surfacesOf(legs, signal)
    return {
      legs: legs.map((leg, index) => ({ ...leg, surfaces: surfaces[index]! })),
    }
  }

  private async routeLegs(
    waypoints: readonly GeoPosition[],
    signal?: AbortSignal,
  ): Promise<RoutedLeg[]> {
    try {
      return await this.requestLegs(waypoints, signal)
    } catch (error) {
      // El servidor limita la distancia de cada consulta, no del viaje: los tramos de un viaje largo
      // se piden de a uno. Si un solo tramo supera el límite, no hay forma de calcularlo.
      const exceedsDistance =
        error instanceof RouteLimitExceededError && error.limit === 'distance'
      if (!exceedsDistance || waypoints.length === 2) throw error
      return this.requestLegsOneByOne(waypoints, signal)
    }
  }

  private async requestLegsOneByOne(
    waypoints: readonly GeoPosition[],
    signal?: AbortSignal,
  ): Promise<RoutedLeg[]> {
    const legs: RoutedLeg[] = []
    for (let index = 0; index < waypoints.length - 1; index++) {
      try {
        legs.push(
          ...(await this.requestLegs(
            waypoints.slice(index, index + 2),
            signal,
          )),
        )
      } catch (error) {
        if (error instanceof NoRouteError) {
          throw new NoRouteError(index, { cause: error.cause })
        }
        throw error
      }
    }
    return legs
  }

  private async requestLegs(
    waypoints: readonly GeoPosition[],
    signal?: AbortSignal,
  ): Promise<RoutedLeg[]> {
    const response = await this.post(
      '/route',
      {
        locations: waypoints.map((position) => ({
          lat: position.latitude,
          lon: position.longitude,
          type: 'break',
        })),
        costing: this.config.costing,
        costing_options: { [this.config.costing]: PAVED_WHEN_AVAILABLE },
        units: 'kilometers',
        directions_type: 'none',
      },
      signal,
    )
    if (!response.ok) {
      throw await this.routeErrorOf(response, waypoints.length)
    }
    const body = (await response.json()) as ValhallaRouteResponse
    return body.trip.legs.map((leg) => ({
      distanceInMeters: Math.round(leg.summary.length * 1000),
      durationInSeconds: Math.round(leg.summary.time),
      geometry: decodePolyline(leg.shape, VALHALLA_POLYLINE_PRECISION),
    }))
  }

  private async routeErrorOf(
    response: Response,
    waypointCount: number,
  ): Promise<Error> {
    if (response.status === TOO_MANY_REQUESTS) {
      return new RouteLimitExceededError('request-rate')
    }
    const body = await response.json().catch(() => ({}))
    const { error_code: code, error: message } = body as ValhallaError
    const cause = new Error(`Valhalla ${response.status}: ${code} ${message}`)
    if (code !== undefined && NO_ROUTE_ERROR_CODES.has(code)) {
      return new NoRouteError(waypointCount === 2 ? 0 : null, { cause })
    }
    if (code === DISTANCE_LIMIT_ERROR_CODE) {
      return new RouteLimitExceededError('distance', { cause })
    }
    return new RouteServiceUnavailableError({ cause })
  }

  /**
   * Una sola consulta de atributos para todos los tramos: se encadenan sus geometrías (los tramos
   * consecutivos comparten la posición de la parada) y se reparten los segmentos por tramo. Si la
   * consulta falla, la ruta vale igual y toda su superficie queda sin dato (design.md, Risks).
   */
  private async surfacesOf(
    legs: RoutedLeg[],
    signal?: AbortSignal,
  ): Promise<SurfaceSegment[][]> {
    const { positions, legRanges } = chainGeometries(legs)
    let segments: SurfaceSegment[]
    try {
      segments = await this.requestSurfaces(positions, signal)
    } catch (error) {
      if (isAbort(error)) throw error
      segments = []
    }
    return legRanges.map(({ from, to }) =>
      cutSegments(fillGaps(segments, from, to), from, to),
    )
  }

  private async requestSurfaces(
    positions: GeoPosition[],
    signal?: AbortSignal,
  ): Promise<SurfaceSegment[]> {
    const response = await this.post(
      '/trace_attributes',
      {
        encoded_polyline: encodePolyline(
          positions,
          VALHALLA_POLYLINE_PRECISION,
        ),
        costing: this.config.costing,
        shape_match: 'walk_or_snap',
        filters: { attributes: SURFACE_ATTRIBUTES, action: 'include' },
      },
      signal,
    )
    if (!response.ok) {
      throw new Error(`Valhalla ${response.status} al pedir la superficie`)
    }
    const body = (await response.json()) as ValhallaTraceResponse
    return mergeAdjacent(
      (body.edges ?? []).map((edge) => ({
        fromIndex: edge.begin_shape_index,
        toIndex: edge.end_shape_index,
        surface: roadSurfaceOf(edge.surface),
      })),
    )
  }

  private async post(
    path: string,
    body: unknown,
    signal?: AbortSignal,
  ): Promise<Response> {
    await this.pacer.waitForTurn(signal)
    try {
      return await this.fetchFromServer(`${this.config.serverUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal,
      })
    } catch (error) {
      if (isAbort(error)) throw error
      throw new RouteServiceUnavailableError({ cause: error })
    }
  }
}

function chainGeometries(legs: RoutedLeg[]): {
  positions: GeoPosition[]
  legRanges: { from: number; to: number }[]
} {
  const positions: GeoPosition[] = []
  const legRanges: { from: number; to: number }[] = []
  for (const leg of legs) {
    const last = positions.at(-1)
    const first = leg.geometry[0]
    const sharesJunction = last && first && positionsEqual(last, first)
    const from = sharesJunction ? positions.length - 1 : positions.length
    positions.push(...(sharesJunction ? leg.geometry.slice(1) : leg.geometry))
    legRanges.push({ from, to: Math.max(from, positions.length - 1) })
  }
  return { positions, legRanges }
}

function mergeAdjacent(segments: SurfaceSegment[]): SurfaceSegment[] {
  const merged: SurfaceSegment[] = []
  for (const segment of segments) {
    const previous = merged.at(-1)
    if (
      previous &&
      previous.surface === segment.surface &&
      previous.toIndex === segment.fromIndex
    ) {
      previous.toIndex = segment.toIndex
    } else {
      merged.push({ ...segment })
    }
  }
  return merged
}

/** Completa con "sin dato" las partes de [from, to] que ningún segmento cubre. */
function fillGaps(
  segments: SurfaceSegment[],
  from: number,
  to: number,
): SurfaceSegment[] {
  const filled: SurfaceSegment[] = []
  let covered = from
  for (const segment of segments) {
    if (segment.toIndex <= covered) continue
    if (segment.fromIndex > covered) {
      filled.push({
        fromIndex: covered,
        toIndex: segment.fromIndex,
        surface: 'unknown',
      })
    }
    filled.push(segment)
    covered = segment.toIndex
  }
  if (covered < to || filled.length === 0) {
    filled.push({ fromIndex: covered, toIndex: to, surface: 'unknown' })
  }
  return mergeAdjacent(filled)
}

/** Recorta los segmentos al rango de un tramo y los expresa en índices propios del tramo. */
function cutSegments(
  segments: SurfaceSegment[],
  from: number,
  to: number,
): SurfaceSegment[] {
  // Un tramo de una sola posición (salida y llegada en el mismo lugar) tiene un único segmento vacío.
  if (from === to) return [{ fromIndex: 0, toIndex: 0, surface: 'unknown' }]
  const cut: SurfaceSegment[] = []
  for (const segment of segments) {
    const fromIndex = Math.max(segment.fromIndex, from)
    const toIndex = Math.min(segment.toIndex, to)
    if (toIndex <= fromIndex) continue
    cut.push({
      fromIndex: fromIndex - from,
      toIndex: toIndex - from,
      surface: segment.surface,
    })
  }
  return cut
}
