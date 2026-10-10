import {
  type GeoPosition,
  type MapAttribution,
  NoRouteError,
  type Route,
  type RouteLeg,
  type RouteProvider,
  type RouteRequest,
  RouteServiceUnavailableError,
} from '../map-platform/index.ts'

/** Un tramo recto entre dos posiciones, con cien metros por cada paso de geometría sintética. */
export function straightLeg(
  from: GeoPosition,
  to: GeoPosition,
  overrides: Partial<RouteLeg> = {},
): RouteLeg {
  const geometry = [
    from,
    {
      latitude: (from.latitude + to.latitude) / 2,
      longitude: (from.longitude + to.longitude) / 2,
    },
    to,
  ]
  return {
    distanceInMeters: 10_000,
    durationInSeconds: 600,
    geometry,
    surfaces: [{ fromIndex: 0, toIndex: 2, surface: 'paved' }],
    ...overrides,
  }
}

/**
 * Motor de ruteo simulado: une cada par consecutivo con un tramo recto y registra las consultas.
 * Se le pueden declarar posiciones sin camino y simular que el servicio no responde.
 */
export class FakeRouteProvider implements RouteProvider {
  readonly attributions: MapAttribution[] = []
  readonly requests: RouteRequest[] = []
  available = true
  /** Posiciones a las que no hay camino: cualquier tramo que llegue a ellas falla. */
  readonly unreachable: GeoPosition[] = []
  /** Si el motor informa qué tramo falló cuando una consulta tiene varios. */
  reportsFailedLeg = true
  legOverrides: (from: GeoPosition, to: GeoPosition) => Partial<RouteLeg> =
    () => ({})

  calculateRoute(request: RouteRequest): Promise<Route> {
    this.requests.push(request)
    if (!this.available) {
      return Promise.reject(new RouteServiceUnavailableError())
    }
    const legs: RouteLeg[] = []
    for (let index = 0; index + 1 < request.waypoints.length; index++) {
      const from = request.waypoints[index]!
      const to = request.waypoints[index + 1]!
      if (this.unreachable.some((p) => samePosition(p, to))) {
        const legIndex =
          request.waypoints.length === 2
            ? 0
            : this.reportsFailedLeg
              ? index
              : null
        return Promise.reject(new NoRouteError(legIndex))
      }
      legs.push(straightLeg(from, to, this.legOverrides(from, to)))
    }
    return Promise.resolve({ legs })
  }
}

function samePosition(a: GeoPosition, b: GeoPosition): boolean {
  return a.latitude === b.latitude && a.longitude === b.longitude
}
