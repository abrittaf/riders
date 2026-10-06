import {
  distanceInMeters,
  type GeoPosition,
  type SurfaceSegment,
} from '../map-platform/index.ts'
import {
  decodeGeometry,
  encodeGeometry,
  type RoadmapDraft,
  type RoadmapLeg,
} from './roadmap.ts'

/** Por encima de esto la geometría se simplifica; el límite de Firestore es 1 MiB (design.md, D4). */
export const MAX_DOCUMENT_SIZE_IN_BYTES = 500 * 1024
const INITIAL_TOLERANCE_IN_METERS = 5
const MAX_TOLERANCE_IN_METERS = 5000

/** Tamaño aproximado del documento: el de su JSON, que es lo que pesa en la base. */
export function documentSizeOf(draft: RoadmapDraft): number {
  return new TextEncoder().encode(JSON.stringify(draft)).length
}

/**
 * Deja el Roadmap por debajo del tamaño máximo simplificando la geometría de sus tramos con
 * tolerancias crecientes. Los límites entre superficies se conservan, así que los segmentos siguen
 * describiendo la misma ruta; distancia, tiempo y metros sin pavimentar no cambian.
 */
export function fitDocumentSize(draft: RoadmapDraft): RoadmapDraft {
  let fitted = draft
  let tolerance = INITIAL_TOLERANCE_IN_METERS
  while (
    documentSizeOf(fitted) > MAX_DOCUMENT_SIZE_IN_BYTES &&
    tolerance <= MAX_TOLERANCE_IN_METERS
  ) {
    fitted = {
      ...draft,
      legs: draft.legs.map((leg) => simplifyLeg(leg, tolerance)),
    }
    tolerance *= 2
  }
  return fitted
}

export function simplifyLeg(
  leg: RoadmapLeg,
  toleranceInMeters: number,
): RoadmapLeg {
  const geometry = decodeGeometry(leg.geometry)
  const boundaries = new Set<number>()
  for (const segment of leg.surfaces) {
    boundaries.add(segment.fromIndex)
    boundaries.add(segment.toIndex)
  }
  const kept = simplifyPolyline(geometry, toleranceInMeters, boundaries)
  const newIndexOf = new Map(
    kept.map((oldIndex, newIndex) => [oldIndex, newIndex]),
  )
  const surfaces: SurfaceSegment[] = leg.surfaces.map((segment) => ({
    ...segment,
    fromIndex: newIndexOf.get(segment.fromIndex)!,
    toIndex: newIndexOf.get(segment.toIndex)!,
  }))
  return {
    ...leg,
    geometry: encodeGeometry(kept.map((index) => geometry[index]!)),
    surfaces,
  }
}

/**
 * Ramer–Douglas–Peucker: devuelve los índices que quedan. Los índices de `mustKeep` se conservan
 * siempre y parten la polilínea en tramos que se simplifican por separado.
 */
export function simplifyPolyline(
  positions: readonly GeoPosition[],
  toleranceInMeters: number,
  mustKeep: ReadonlySet<number> = new Set(),
): number[] {
  if (positions.length <= 2) return positions.map((_, index) => index)
  const anchors = [...new Set([0, positions.length - 1, ...mustKeep])].sort(
    (a, b) => a - b,
  )
  const kept = new Set<number>(anchors)
  for (let index = 0; index + 1 < anchors.length; index++) {
    simplifyRange(
      positions,
      anchors[index]!,
      anchors[index + 1]!,
      toleranceInMeters,
      kept,
    )
  }
  return [...kept].sort((a, b) => a - b)
}

function simplifyRange(
  positions: readonly GeoPosition[],
  first: number,
  last: number,
  tolerance: number,
  kept: Set<number>,
) {
  const pending: [number, number][] = [[first, last]]
  while (pending.length > 0) {
    const [from, to] = pending.pop()!
    if (to - from < 2) continue
    let farthest = -1
    let farthestDistance = 0
    for (let index = from + 1; index < to; index++) {
      const distance = distanceToLine(
        positions[index]!,
        positions[from]!,
        positions[to]!,
      )
      if (distance > farthestDistance) {
        farthestDistance = distance
        farthest = index
      }
    }
    if (farthest !== -1 && farthestDistance > tolerance) {
      kept.add(farthest)
      pending.push([from, farthest], [farthest, to])
    }
  }
}

/** Distancia de un punto al segmento entre otros dos, en metros, sobre un plano local. */
function distanceToLine(
  point: GeoPosition,
  from: GeoPosition,
  to: GeoPosition,
): number {
  const metersPerDegreeLatitude = 111_320
  const metersPerDegreeLongitude =
    metersPerDegreeLatitude * Math.cos((from.latitude * Math.PI) / 180)
  const px = (point.longitude - from.longitude) * metersPerDegreeLongitude
  const py = (point.latitude - from.latitude) * metersPerDegreeLatitude
  const lx = (to.longitude - from.longitude) * metersPerDegreeLongitude
  const ly = (to.latitude - from.latitude) * metersPerDegreeLatitude
  const lengthSquared = lx * lx + ly * ly
  if (lengthSquared === 0) return distanceInMeters(point, from)
  const t = Math.max(0, Math.min(1, (px * lx + py * ly) / lengthSquared))
  const dx = px - t * lx
  const dy = py - t * ly
  return Math.hypot(dx, dy)
}
