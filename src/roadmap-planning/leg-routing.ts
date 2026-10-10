import { NoRouteError, type RouteProvider } from '../map-platform/index.ts'
import {
  type DraftPoint,
  type LegState,
  pendingLegRanges,
} from './roadmap-draft.ts'
import { roadmapLegOf } from './roadmap.ts'

/**
 * Calcula los tramos pendientes de un borrador: una consulta por rango de tramos consecutivos
 * (design.md, D1). Si una consulta de varios tramos no encuentra camino y el motor no dice en
 * cuál, se piden de a uno para ubicarlo. Devuelve los estados nuevos de cada tramo, por índice.
 */
export async function routePendingLegs(
  points: readonly DraftPoint[],
  legs: readonly LegState[],
  routeProvider: RouteProvider,
  signal?: AbortSignal,
): Promise<Map<number, LegState>> {
  const results = new Map<number, LegState>()
  for (const range of pendingLegRanges(legs)) {
    await routeRange(
      points,
      routeProvider,
      range.from,
      range.to,
      results,
      signal,
    )
  }
  return results
}

async function routeRange(
  points: readonly DraftPoint[],
  routeProvider: RouteProvider,
  from: number,
  to: number,
  results: Map<number, LegState>,
  signal?: AbortSignal,
) {
  const waypoints = points
    .slice(from, to + 2)
    .map((entry) => entry.point.position)
  try {
    const route = await routeProvider.calculateRoute(
      { waypoints, preference: 'paved-when-available' },
      signal,
    )
    route.legs.forEach((leg, offset) => {
      results.set(from + offset, { status: 'routed', leg: roadmapLegOf(leg) })
    })
  } catch (error) {
    if (signal?.aborted) throw error
    if (!(error instanceof NoRouteError)) {
      for (let index = from; index <= to; index++) {
        results.set(index, { status: 'unavailable' })
      }
      return
    }
    if (from === to) {
      results.set(from, { status: 'no-route' })
    } else if (error.legIndex !== null) {
      const failed = from + error.legIndex
      results.set(failed, { status: 'no-route' })
      if (failed > from) {
        await routeRange(
          points,
          routeProvider,
          from,
          failed - 1,
          results,
          signal,
        )
      }
      if (failed < to) {
        await routeRange(points, routeProvider, failed + 1, to, results, signal)
      }
    } else {
      for (let index = from; index <= to; index++) {
        await routeRange(points, routeProvider, index, index, results, signal)
      }
    }
  }
}
