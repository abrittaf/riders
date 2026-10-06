// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { GeoPosition } from '../map-platform/index.ts'
import {
  documentSizeOf,
  fitDocumentSize,
  MAX_DOCUMENT_SIZE_IN_BYTES,
  simplifyLeg,
  simplifyPolyline,
} from './fit-document-size.ts'
import {
  decodeGeometry,
  encodeGeometry,
  type RoadmapDraft,
  type RoadmapLeg,
} from './roadmap.ts'

/**
 * Un camino sintético hacia el sur que serpentea: `count` posiciones cada `stepInMeters`, con un
 * vaivén lateral de hasta `wobbleInMeters`, para que simplificarlo requiera tolerancia real.
 */
function windingRoad(
  count: number,
  stepInMeters: number,
  wobbleInMeters: number,
): GeoPosition[] {
  const degreesPerMeter = 1 / 111_320
  return Array.from({ length: count }, (_, index) => ({
    latitude: -25 - index * stepInMeters * degreesPerMeter,
    longitude:
      -66 + Math.sin(index / 3) * wobbleInMeters * degreesPerMeter * 1.1,
  }))
}

function legOf(
  geometry: GeoPosition[],
  surfaces: RoadmapLeg['surfaces'],
): RoadmapLeg {
  return {
    distanceM: 1,
    durationS: 1,
    unpavedM: 0,
    geometry: encodeGeometry(geometry),
    surfaces,
  }
}

describe('simplificación de una polilínea', () => {
  it('quita los puntos que se apartan menos que la tolerancia de la recta entre sus vecinos', () => {
    const road = windingRoad(50, 20, 3)

    expect(simplifyPolyline(road, 10)).toEqual([0, 49])
    expect(simplifyPolyline(road, 1).length).toBeGreaterThan(2)
  })

  it('conserva siempre los índices obligatorios', () => {
    const road = windingRoad(50, 20, 3)

    expect(simplifyPolyline(road, 10, new Set([17, 30]))).toEqual([
      0, 17, 30, 49,
    ])
  })
})

describe('simplificación de un tramo', () => {
  it('conserva los límites entre superficies y los expresa en los índices nuevos', () => {
    const leg = legOf(windingRoad(50, 20, 3), [
      { fromIndex: 0, toIndex: 20, surface: 'paved' },
      { fromIndex: 20, toIndex: 49, surface: 'compacted' },
    ])

    const simplified = simplifyLeg(leg, 10)

    const geometry = decodeGeometry(simplified.geometry)
    expect(geometry).toHaveLength(3)
    expect(simplified.surfaces).toEqual([
      { fromIndex: 0, toIndex: 1, surface: 'paved' },
      { fromIndex: 1, toIndex: 2, surface: 'compacted' },
    ])
    expect(geometry[1]).toEqual(decodeGeometry(leg.geometry)[20])
  })
})

describe('tamaño del documento del Roadmap', () => {
  it('un Roadmap sintético de 3.000 km con geometría densa queda por debajo del umbral sin perder la superficie', () => {
    // 150.000 posiciones cada 20 m: 3.000 km, bastante más de 500 KiB codificados.
    const road = windingRoad(150_000, 20, 40)
    const draft: RoadmapDraft = {
      name: 'Travesía',
      description: '',
      points: [],
      legs: [
        legOf(road, [
          { fromIndex: 0, toIndex: 100_000, surface: 'paved' },
          { fromIndex: 100_000, toIndex: 149_999, surface: 'loose' },
        ]),
      ],
    }
    expect(documentSizeOf(draft)).toBeGreaterThan(MAX_DOCUMENT_SIZE_IN_BYTES)

    const fitted = fitDocumentSize(draft)

    expect(documentSizeOf(fitted)).toBeLessThan(MAX_DOCUMENT_SIZE_IN_BYTES)
    const geometry = decodeGeometry(fitted.legs[0]!.geometry)
    const [paved, loose] = fitted.legs[0]!.surfaces
    expect(paved!.toIndex).toBe(loose!.fromIndex)
    expect(loose!.toIndex).toBe(geometry.length - 1)
    expect(geometry[paved!.toIndex]).toEqual(
      decodeGeometry(encodeGeometry([road[100_000]!]))[0],
    )
  })

  it('un Roadmap chico se guarda tal cual', () => {
    const draft: RoadmapDraft = {
      name: 'Ida a Cachi',
      description: '',
      points: [],
      legs: [
        legOf(windingRoad(3000, 50, 20), [
          { fromIndex: 0, toIndex: 2999, surface: 'paved' },
        ]),
      ],
    }

    expect(fitDocumentSize(draft)).toBe(draft)
  })
})
