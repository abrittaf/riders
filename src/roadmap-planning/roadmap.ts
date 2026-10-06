import {
  decodePolyline,
  distanceInMeters,
  encodePolyline,
  type GeoPosition,
  type RouteLeg,
  type SurfaceSegment,
} from '../map-platform/index.ts'
import type { Point } from '../point-lookup/point.ts'

export const ROADMAP_NAME_MIN_LENGTH = 2
export const ROADMAP_NAME_MAX_LENGTH = 60
export const ROADMAP_DESCRIPTION_MAX_LENGTH = 500
export const ROADMAP_MIN_POINTS = 2
/** Un Roadmap con más Points que esto ya no se arma en un celular; las reglas lo rechazan. */
export const ROADMAP_MAX_POINTS = 50

/** Las polilíneas guardadas usan la misma precisión que el motor de ruteo. */
export const ROADMAP_GEOMETRY_PRECISION = 6

/** `roadmap-convening` agrega los estados siguientes (convocado, en curso, finalizado). */
export type RoadmapStatus = 'planning'

/** El camino entre dos Points consecutivos, tal como se guarda con el Roadmap (design.md, D4). */
export interface RoadmapLeg {
  distanceM: number
  durationS: number
  /** Metros de consolidado más suelto; «sin dato» no cuenta. */
  unpavedM: number
  /** Polilínea codificada de la geometría. */
  geometry: string
  surfaces: SurfaceSegment[]
}

/** Lo que el Rider arma y la app calcula; sin identidad ni fechas de registro. */
export interface RoadmapDraft {
  name: string
  description: string
  points: Point[]
  /** Un tramo por par de Points consecutivos. */
  legs: RoadmapLeg[]
}

export interface Roadmap extends RoadmapDraft {
  id: string
  ownerId: string
  status: RoadmapStatus
  totalDistanceM: number
  totalDurationS: number
}

export type RoadmapNameError = 'empty' | 'too-short' | 'too-long'

export function validateRoadmapName(name: string): RoadmapNameError | null {
  const trimmed = name.trim()
  if (trimmed === '') return 'empty'
  if (trimmed.length < ROADMAP_NAME_MIN_LENGTH) return 'too-short'
  if (trimmed.length > ROADMAP_NAME_MAX_LENGTH) return 'too-long'
  return null
}

export function validateDescription(description: string): 'too-long' | null {
  return description.length > ROADMAP_DESCRIPTION_MAX_LENGTH ? 'too-long' : null
}

export type PointsError = 'too-few' | 'too-many'

export function validatePoints(points: readonly Point[]): PointsError | null {
  if (points.length < ROADMAP_MIN_POINTS) return 'too-few'
  if (points.length > ROADMAP_MAX_POINTS) return 'too-many'
  return null
}

export function totalsOf(legs: readonly RoadmapLeg[]): {
  totalDistanceM: number
  totalDurationS: number
} {
  return {
    totalDistanceM: legs.reduce((sum, leg) => sum + leg.distanceM, 0),
    totalDurationS: legs.reduce((sum, leg) => sum + leg.durationS, 0),
  }
}

/** Longitud de la geometría entre dos índices, sumando los pasos de la polilínea. */
function lengthBetween(
  geometry: readonly GeoPosition[],
  fromIndex: number,
  toIndex: number,
): number {
  let length = 0
  for (let index = fromIndex; index < toIndex; index++) {
    const from = geometry[index]
    const to = geometry[index + 1]
    if (from && to) length += distanceInMeters(from, to)
  }
  return length
}

/** Metros sin pavimentar de un tramo: la longitud de sus segmentos consolidados y sueltos. */
export function unpavedMetersOf(
  geometry: readonly GeoPosition[],
  surfaces: readonly SurfaceSegment[],
): number {
  return Math.round(
    surfaces
      .filter(
        (segment) =>
          segment.surface === 'compacted' || segment.surface === 'loose',
      )
      .reduce(
        (sum, segment) =>
          sum + lengthBetween(geometry, segment.fromIndex, segment.toIndex),
        0,
      ),
  )
}

/** Un tramo calculado por el motor de ruteo, en la forma en que se guarda. */
export function roadmapLegOf(leg: RouteLeg): RoadmapLeg {
  return {
    distanceM: leg.distanceInMeters,
    durationS: leg.durationInSeconds,
    unpavedM: unpavedMetersOf(leg.geometry, leg.surfaces),
    geometry: encodeGeometry(leg.geometry),
    surfaces: leg.surfaces,
  }
}

export function decodeGeometry(geometry: string): GeoPosition[] {
  return decodePolyline(geometry, ROADMAP_GEOMETRY_PRECISION)
}

export function encodeGeometry(positions: readonly GeoPosition[]): string {
  return encodePolyline(positions, ROADMAP_GEOMETRY_PRECISION)
}

/**
 * La base de un Roadmap nuevo a partir de otro (spec «Duplicación de un Roadmap»): mismos Points y
 * ruta, sin las fechas asociadas, con un nombre que lo distingue. Es una copia: nada queda compartido.
 */
export function duplicateDraftOf(
  roadmap: Roadmap,
  nameSuffix: string,
): RoadmapDraft {
  const name = `${roadmap.name} ${nameSuffix}`.slice(0, ROADMAP_NAME_MAX_LENGTH)
  return structuredClone({
    name,
    description: roadmap.description,
    points: roadmap.points.map((point) => ({ ...point, date: null })),
    legs: roadmap.legs,
  })
}
