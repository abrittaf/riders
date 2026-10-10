import {
  boundsOf,
  type GeoBounds,
  type MapMarker,
  type RouteLegDisplay,
} from '../map-platform/index.ts'
import type { Point } from '../point-lookup/point.ts'
import { decodeGeometry, type RoadmapLeg } from './roadmap.ts'

/** Lo que el mapa dibuja de un Roadmap: la ruta por segmentos y los Points numerados. */
export interface RoadmapMapDisplay {
  route: RouteLegDisplay[]
  markers: MapMarker[]
  /** Encuadre de la ruta completa (o de los Points, si todavía no hay ruta); `null` sin Points. */
  bounds: GeoBounds | null
}

export const EMPTY_MAP_DISPLAY: RoadmapMapDisplay = {
  route: [],
  markers: [],
  bounds: null,
}

export function roadmapMapDisplay(
  points: readonly Point[],
  legs: readonly (RoadmapLeg | null)[],
): RoadmapMapDisplay {
  const route = legs
    .filter((leg): leg is RoadmapLeg => leg !== null)
    .map((leg) => ({
      geometry: decodeGeometry(leg.geometry),
      surfaces: leg.surfaces,
    }))
  const markers = points.map((point, index) => ({
    id: `point-${index}`,
    position: point.position,
    kind: 'point' as const,
    label: String(index + 1),
  }))
  const positions = [
    ...points.map((point) => point.position),
    ...route.flatMap((leg) => leg.geometry),
  ]
  return { route, markers, bounds: boundsOf(positions) }
}
