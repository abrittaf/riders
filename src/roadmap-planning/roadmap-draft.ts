import type { Point } from '../point-lookup/point.ts'
import type { Roadmap, RoadmapDraft, RoadmapLeg } from './roadmap.ts'

/**
 * Estado de un tramo mientras se edita: calculado, por calcular (se recalcula solo lo afectado),
 * sin camino posible (spec «Tramo sin camino posible») o con el motor de ruteo no disponible.
 */
export type LegState =
  | { status: 'routed'; leg: RoadmapLeg }
  | { status: 'pending' }
  | { status: 'no-route' }
  | { status: 'unavailable' }

/** Un Point en edición: la clave lo identifica aunque cambie de lugar en la secuencia. */
export interface DraftPoint {
  key: string
  point: Point
}

/** Lo que el Rider está armando; `legs.length` es siempre `points.length - 1` (o cero). */
export interface EditorDraft {
  name: string
  description: string
  points: DraftPoint[]
  legs: LegState[]
}

let nextKey = 0
export function newDraftPoint(point: Point): DraftPoint {
  nextKey += 1
  return { key: `p${nextKey}`, point }
}

export function emptyDraft(): EditorDraft {
  return { name: '', description: '', points: [], legs: [] }
}

export function draftOf(roadmap: Roadmap): EditorDraft {
  return {
    name: roadmap.name,
    description: roadmap.description,
    points: roadmap.points.map(newDraftPoint),
    legs: roadmap.legs.map((leg) => ({ status: 'routed', leg })),
  }
}

/**
 * Los tramos después de reordenar: un tramo se conserva si une los mismos dos Points que antes, en
 * el mismo sentido; cualquier otro par queda por calcular. Así reordenar, insertar o quitar
 * recalcula solo lo afectado (spec «Edición de la secuencia de Points»).
 */
function legsFor(previous: EditorDraft, points: DraftPoint[]): LegState[] {
  const known = new Map<string, LegState>()
  previous.points.forEach((from, index) => {
    const to = previous.points[index + 1]
    const leg = previous.legs[index]
    if (to && leg) known.set(`${from.key}>${to.key}`, leg)
  })
  return points.slice(0, -1).map(
    (from, index) =>
      known.get(`${from.key}>${points[index + 1]!.key}`) ?? {
        status: 'pending',
      },
  )
}

function withPoints(draft: EditorDraft, points: DraftPoint[]): EditorDraft {
  return { ...draft, points, legs: legsFor(draft, points) }
}

export function insertPoint(
  draft: EditorDraft,
  index: number,
  point: Point,
): EditorDraft {
  const points = [...draft.points]
  points.splice(index, 0, newDraftPoint(point))
  return withPoints(draft, points)
}

export function removePoint(draft: EditorDraft, index: number): EditorDraft {
  return withPoints(
    draft,
    draft.points.filter((_, position) => position !== index),
  )
}

/** Mueve el Point de `index` un lugar hacia arriba (`-1`) o hacia abajo (`+1`). */
export function movePoint(
  draft: EditorDraft,
  index: number,
  direction: -1 | 1,
): EditorDraft {
  const target = index + direction
  if (target < 0 || target >= draft.points.length) return draft
  const points = [...draft.points]
  const [moved] = points.splice(index, 1)
  points.splice(target, 0, moved!)
  return withPoints(draft, points)
}

export function setPointDate(
  draft: EditorDraft,
  index: number,
  date: string | null,
): EditorDraft {
  return {
    ...draft,
    points: draft.points.map((entry, position) =>
      position === index
        ? { ...entry, point: { ...entry.point, date } }
        : entry,
    ),
  }
}

/** Los tramos por calcular, agrupados en rangos consecutivos: cada rango es una sola consulta. */
export function pendingLegRanges(
  legs: readonly LegState[],
): { from: number; to: number }[] {
  const ranges: { from: number; to: number }[] = []
  legs.forEach((leg, index) => {
    if (leg.status !== 'pending') return
    const last = ranges.at(-1)
    if (last && last.to === index - 1) last.to = index
    else ranges.push({ from: index, to: index })
  })
  return ranges
}

/** El borrador listo para guardar; `null` mientras falte algún tramo. */
export function roadmapDraftOf(draft: EditorDraft): RoadmapDraft | null {
  const legs: RoadmapLeg[] = []
  for (const state of draft.legs) {
    if (state.status !== 'routed') return null
    legs.push(state.leg)
  }
  return {
    name: draft.name,
    description: draft.description,
    points: draft.points.map((entry) => entry.point),
    legs,
  }
}
