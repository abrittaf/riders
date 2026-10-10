import { useEffect, useState } from 'react'
import type { RoadmapService } from '../backend/index.ts'
import type { Roadmap } from './roadmap.ts'

const NO_ROADMAPS: Roadmap[] = []

/**
 * Los Roadmaps del Rider identificado, al día con cada cambio; `null` mientras llega la primera
 * lista. Sin Rider identificado no hay suscripción y la lista es vacía.
 */
export function useRoadmaps(
  service: RoadmapService,
  riderId: string | null,
): Roadmap[] | null {
  const [received, setReceived] = useState<{
    riderId: string
    roadmaps: Roadmap[]
  } | null>(null)
  useEffect(() => {
    if (riderId === null) return
    return service.subscribeToOwn((roadmaps) =>
      setReceived({ riderId, roadmaps }),
    )
  }, [service, riderId])
  if (riderId === null) return NO_ROADMAPS
  return received?.riderId === riderId ? received.roadmaps : null
}
