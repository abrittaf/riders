import { serverTimestamp } from 'firebase/firestore'
import type { RoadSurface, SurfaceSegment } from '../../map-platform/index.ts'
import type { Point, PointSource } from '../../point-lookup/point.ts'
import {
  type Roadmap,
  type RoadmapDraft,
  type RoadmapLeg,
  totalsOf,
} from '../../roadmap-planning/roadmap.ts'

/** Un Point tal como se guarda: la posición desarmada en dos números. */
interface StoredPoint {
  name: string
  latitude: number
  longitude: number
  source: PointSource
  type: string | null
  date: string | null
}

export const ROADMAPS_COLLECTION = 'roadmaps'

/** Los campos del documento que escribe la app; las fechas de registro las pone el servidor. */
export function roadmapDocumentOf(
  draft: RoadmapDraft,
  ownerId: string,
  isNew: boolean,
): Record<string, unknown> {
  return {
    ownerId,
    name: draft.name.trim(),
    description: draft.description,
    status: 'planning',
    points: draft.points.map((point): StoredPoint => ({
      name: point.name,
      latitude: point.position.latitude,
      longitude: point.position.longitude,
      source: point.source,
      type: point.type,
      date: point.date,
    })),
    legs: draft.legs,
    ...totalsOf(draft.legs),
    ...(isNew ? { createdAt: serverTimestamp() } : {}),
    updatedAt: serverTimestamp(),
  }
}

const SOURCES: PointSource[] = ['known-place', 'chosen-position']
const PLACE_TYPES = ['fuel', 'lodging', 'restaurant', 'point-of-interest']
const SURFACES: RoadSurface[] = ['paved', 'compacted', 'loose', 'unknown']

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function toPoint(value: unknown): Point | null {
  if (!isRecord(value)) return null
  const { name, latitude, longitude, source, type, date } = value
  if (
    typeof name !== 'string' ||
    typeof latitude !== 'number' ||
    typeof longitude !== 'number' ||
    !SOURCES.includes(source as PointSource) ||
    !(type === null || PLACE_TYPES.includes(type as string)) ||
    !(date === null || typeof date === 'string')
  ) {
    return null
  }
  return {
    name,
    position: { latitude, longitude },
    source: source as PointSource,
    type: type as Point['type'],
    date: date as string | null,
  }
}

function toSegment(value: unknown): SurfaceSegment | null {
  if (!isRecord(value)) return null
  const { fromIndex, toIndex, surface } = value
  if (
    typeof fromIndex !== 'number' ||
    typeof toIndex !== 'number' ||
    !SURFACES.includes(surface as RoadSurface)
  ) {
    return null
  }
  return { fromIndex, toIndex, surface: surface as RoadSurface }
}

function toLeg(value: unknown): RoadmapLeg | null {
  if (!isRecord(value)) return null
  const { distanceM, durationS, unpavedM, geometry, surfaces } = value
  if (
    typeof distanceM !== 'number' ||
    typeof durationS !== 'number' ||
    typeof unpavedM !== 'number' ||
    typeof geometry !== 'string' ||
    !Array.isArray(surfaces)
  ) {
    return null
  }
  const segments = surfaces.map(toSegment)
  if (segments.some((segment) => segment === null)) return null
  return {
    distanceM,
    durationS,
    unpavedM,
    geometry,
    surfaces: segments as SurfaceSegment[],
  }
}

/** El Roadmap leído de un documento; `null` si el documento no tiene la forma esperada. */
export function roadmapOf(id: string, data: unknown): Roadmap | null {
  if (!isRecord(data)) return null
  const { ownerId, name, description, status, points, legs } = data
  if (
    typeof ownerId !== 'string' ||
    typeof name !== 'string' ||
    typeof description !== 'string' ||
    status !== 'planning' ||
    !Array.isArray(points) ||
    !Array.isArray(legs)
  ) {
    return null
  }
  const readPoints = points.map(toPoint)
  const readLegs = legs.map(toLeg)
  if (
    readPoints.some((point) => point === null) ||
    readLegs.some((leg) => leg === null)
  ) {
    return null
  }
  const validLegs = readLegs as RoadmapLeg[]
  return {
    id,
    ownerId,
    name,
    description,
    status,
    points: readPoints as Point[],
    legs: validLegs,
    ...totalsOf(validLegs),
  }
}

/** Para ordenar la lista: el instante de la última modificación, o el presente si aún no confirmó el servidor. */
export function updatedAtOf(data: unknown): number {
  if (!isRecord(data)) return 0
  const updatedAt = data['updatedAt']
  return isRecord(updatedAt) && typeof updatedAt['toMillis'] === 'function'
    ? (updatedAt['toMillis'] as () => number)()
    : Date.now()
}
