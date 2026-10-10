// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { Point } from '../point-lookup/point.ts'
import { FakeRouteProvider } from '../test-support/fake-route-provider.ts'
import { routePendingLegs } from './leg-routing.ts'
import {
  draftOf,
  type EditorDraft,
  emptyDraft,
  insertPoint,
  type LegState,
  movePoint,
  pendingLegRanges,
  removePoint,
  roadmapDraftOf,
  setPointDate,
} from './roadmap-draft.ts'
import type { Roadmap, RoadmapLeg } from './roadmap.ts'

function point(name: string, latitude = -25): Point {
  return {
    name,
    position: { latitude, longitude: -66 },
    source: 'known-place',
    type: null,
    date: null,
  }
}

const routed = (name: string): LegState => ({
  status: 'routed',
  leg: {
    distanceM: 1,
    durationS: 1,
    unpavedM: 0,
    geometry: name,
    surfaces: [],
  },
})

function names(draft: EditorDraft) {
  return draft.points.map((entry) => entry.point.name)
}

function legStatuses(draft: EditorDraft) {
  return draft.legs.map((leg) =>
    leg.status === 'routed' ? `routed:${leg.leg.geometry}` : leg.status,
  )
}

/** Un borrador de tres Points con sus dos tramos ya calculados. */
function routedDraft(): EditorDraft {
  let draft = emptyDraft()
  draft = insertPoint(draft, 0, point('Salta', -24.8))
  draft = insertPoint(draft, 1, point('Cachi', -25.1))
  draft = insertPoint(draft, 2, point('Cafayate', -26.1))
  return { ...draft, legs: [routed('salta-cachi'), routed('cachi-cafayate')] }
}

describe('secuencia de Points del borrador', () => {
  it('insertar en el medio reemplaza el tramo anterior por dos tramos por calcular', () => {
    const draft = insertPoint(routedDraft(), 1, point('Chicoana'))

    expect(names(draft)).toEqual(['Salta', 'Chicoana', 'Cachi', 'Cafayate'])
    expect(legStatuses(draft)).toEqual([
      'pending',
      'pending',
      'routed:cachi-cafayate',
    ])
  })

  it('agregar al final deja por calcular solo el tramo nuevo', () => {
    const draft = insertPoint(routedDraft(), 3, point('Tolombón'))

    expect(legStatuses(draft)).toEqual([
      'routed:salta-cachi',
      'routed:cachi-cafayate',
      'pending',
    ])
  })

  it('quitar un Point intermedio une sus dos tramos en uno por calcular', () => {
    const draft = removePoint(routedDraft(), 1)

    expect(names(draft)).toEqual(['Salta', 'Cafayate'])
    expect(legStatuses(draft)).toEqual(['pending'])
  })

  it('quitar la llegada conserva los tramos que quedan', () => {
    const draft = removePoint(routedDraft(), 2)

    expect(legStatuses(draft)).toEqual(['routed:salta-cachi'])
  })

  it('mover un Point recalcula los tramos que cambian y conserva los que unen el mismo par', () => {
    let draft = insertPoint(routedDraft(), 3, point('Tolombón'))
    draft = {
      ...draft,
      legs: [...draft.legs.slice(0, 2), routed('cafayate-tolombon')],
    }

    const moved = movePoint(draft, 3, -1)

    expect(names(moved)).toEqual(['Salta', 'Cachi', 'Tolombón', 'Cafayate'])
    expect(legStatuses(moved)).toEqual([
      'routed:salta-cachi',
      'pending',
      'pending',
    ])
  })

  it('no mueve más allá de los extremos', () => {
    const draft = routedDraft()

    expect(movePoint(draft, 0, -1)).toBe(draft)
    expect(movePoint(draft, 2, 1)).toBe(draft)
  })

  it('poner, cambiar y quitar la fecha de un Point no toca los tramos', () => {
    let draft = setPointDate(routedDraft(), 1, '2026-11-20')
    expect(draft.points[1]!.point.date).toBe('2026-11-20')

    draft = setPointDate(draft, 1, '2026-11-21')
    expect(draft.points[1]!.point.date).toBe('2026-11-21')

    draft = setPointDate(draft, 1, null)
    expect(draft.points[1]!.point.date).toBeNull()
    expect(legStatuses(draft)).toEqual([
      'routed:salta-cachi',
      'routed:cachi-cafayate',
    ])
  })

  it('el borrador de un Roadmap guardado tiene todos sus tramos calculados', () => {
    const leg: RoadmapLeg = {
      distanceM: 5,
      durationS: 5,
      unpavedM: 0,
      geometry: 'g',
      surfaces: [],
    }
    const roadmap: Roadmap = {
      id: 'r',
      ownerId: 'o',
      status: 'planning',
      name: 'Ida',
      description: '',
      points: [point('A'), point('B')],
      legs: [leg],
      totalDistanceM: 5,
      totalDurationS: 5,
    }

    const draft = draftOf(roadmap)

    expect(legStatuses(draft)).toEqual(['routed:g'])
    expect(roadmapDraftOf(draft)).toEqual({
      name: 'Ida',
      description: '',
      points: roadmap.points,
      legs: [leg],
    })
  })

  it('con un tramo sin calcular no hay nada para guardar', () => {
    expect(roadmapDraftOf(insertPoint(routedDraft(), 1, point('X')))).toBeNull()
  })

  it('agrupa los tramos por calcular en rangos consecutivos', () => {
    expect(
      pendingLegRanges([
        { status: 'pending' },
        { status: 'pending' },
        routed('a'),
        { status: 'pending' },
      ]),
    ).toEqual([
      { from: 0, to: 1 },
      { from: 3, to: 3 },
    ])
  })
})

describe('cálculo de los tramos pendientes', () => {
  it('pide una sola consulta por rango de tramos consecutivos y calcula solo los pendientes', async () => {
    const provider = new FakeRouteProvider()
    let draft = insertPoint(routedDraft(), 1, point('Chicoana', -25))
    draft = insertPoint(draft, 4, point('Tolombón', -26.2))

    const results = await routePendingLegs(draft.points, draft.legs, provider)

    expect(provider.requests.map((r) => r.waypoints.length)).toEqual([3, 2])
    expect([...results.keys()]).toEqual([0, 1, 3])
    expect(results.get(0)!.status).toBe('routed')
  })

  it('un tramo sin camino queda señalado y los demás del rango se calculan igual', async () => {
    const provider = new FakeRouteProvider()
    provider.unreachable.push(point('Isla', -27).position)
    let draft = emptyDraft()
    for (const p of [
      point('A', -24),
      point('B', -25),
      point('Isla', -27),
      point('C', -28),
    ]) {
      draft = insertPoint(draft, draft.points.length, p)
    }

    const results = await routePendingLegs(draft.points, draft.legs, provider)

    expect([0, 1, 2].map((i) => results.get(i)!.status)).toEqual([
      'routed',
      'no-route',
      'routed',
    ])
  })

  it('si el motor no dice qué tramo falló, los pide de a uno para ubicarlo', async () => {
    const provider = new FakeRouteProvider()
    provider.reportsFailedLeg = false
    provider.unreachable.push(point('Isla', -27).position)
    let draft = emptyDraft()
    for (const p of [point('A', -24), point('B', -25), point('Isla', -27)]) {
      draft = insertPoint(draft, draft.points.length, p)
    }

    const results = await routePendingLegs(draft.points, draft.legs, provider)

    expect(provider.requests.map((r) => r.waypoints.length)).toEqual([3, 2, 2])
    expect([0, 1].map((i) => results.get(i)!.status)).toEqual([
      'routed',
      'no-route',
    ])
  })

  it('con el motor no disponible, los tramos quedan señalados como no disponibles', async () => {
    const provider = new FakeRouteProvider()
    provider.available = false
    const draft = insertPoint(
      insertPoint(emptyDraft(), 0, point('A')),
      1,
      point('B', -26),
    )

    const results = await routePendingLegs(draft.points, draft.legs, provider)

    expect(results.get(0)!.status).toBe('unavailable')
  })
})
