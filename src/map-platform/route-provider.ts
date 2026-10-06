import type { GeoPosition } from './geo.ts'
import type { MapAttribution } from './map-provider.ts'

/**
 * Superficie de una parte de un tramo, en las clases de D1b (design.md de roadmap-planning):
 * pavimento, consolidado (ripio, grava compactada), suelto (tierra, arena, huella) y sin dato.
 */
export type RoadSurface = 'paved' | 'compacted' | 'loose' | 'unknown'

/** Una parte de la geometría de un tramo con una misma superficie: desde `fromIndex` hasta `toIndex` (inclusive). */
export interface SurfaceSegment {
  fromIndex: number
  toIndex: number
  surface: RoadSurface
}

/** El camino entre dos posiciones consecutivas de la ruta. */
export interface RouteLeg {
  distanceInMeters: number
  durationInSeconds: number
  /** Geometría del camino, de la posición de salida a la de llegada. */
  geometry: GeoPosition[]
  /**
   * Cubren toda la geometría en orden; dos segmentos consecutivos comparten el punto de unión.
   * `unknown` donde el proveedor no informa superficie.
   */
  surfaces: SurfaceSegment[]
}

export interface Route {
  /** Un tramo por cada par de posiciones consecutivas pedidas. */
  legs: RouteLeg[]
}

/**
 * Política de superficie del producto, única y sin opciones para el Rider: pavimento siempre que
 * exista; sin pavimentar solo al inicio o al final de un tramo, para llegar a una posición que no
 * tiene otro acceso. El proveedor la traduce a sus parámetros.
 */
export type RoadPreference = 'paved-when-available'

export interface RouteRequest {
  /** Dos o más posiciones, en el orden del viaje. */
  waypoints: readonly GeoPosition[]
  preference: RoadPreference
}

/** No hay camino entre dos posiciones consecutivas. */
export class NoRouteError extends Error {
  /** Índice del tramo sin camino (0 es el que une la primera y la segunda posición), si el proveedor lo informa. */
  readonly legIndex: number | null

  constructor(legIndex: number | null, options?: ErrorOptions) {
    super(
      legIndex === null
        ? 'No hay camino entre las posiciones pedidas'
        : `No hay camino en el tramo ${legIndex}`,
      options,
    )
    this.name = 'NoRouteError'
    this.legIndex = legIndex
  }
}

/** El motor de ruteo no respondió o respondió con un error: sin conectividad, servidor caído. */
export class RouteServiceUnavailableError extends Error {
  constructor(options?: ErrorOptions) {
    super('El motor de ruteo no está disponible', options)
    this.name = 'RouteServiceUnavailableError'
  }
}

/** Qué límite del motor de ruteo rechazó la consulta: la cantidad de consultas o la distancia de un tramo. */
export type RouteLimit = 'request-rate' | 'distance'

/** El motor de ruteo rechazó la consulta por superar uno de sus límites de uso. */
export class RouteLimitExceededError extends Error {
  readonly limit: RouteLimit

  constructor(limit: RouteLimit, options?: ErrorOptions) {
    super(
      limit === 'request-rate'
        ? 'Se superó el límite de consultas del motor de ruteo'
        : 'Un tramo supera la distancia máxima que acepta el motor de ruteo',
      options,
    )
    this.name = 'RouteLimitExceededError'
    this.limit = limit
  }
}

/** Calcula el camino entre posiciones. Único punto de acceso a los motores de ruteo. */
export interface RouteProvider {
  /** Motor y datos que exigen ser mencionados donde se muestra una ruta. */
  readonly attributions: readonly MapAttribution[]
  /** @throws NoRouteError | RouteServiceUnavailableError | RouteLimitExceededError */
  calculateRoute(request: RouteRequest, signal?: AbortSignal): Promise<Route>
}
