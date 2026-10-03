// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { TileSizeEstimator } from './tile-size-estimator.ts'

const ONE_THOUSAND_DETAILED_TILES = new Map([[14, 1000]])

describe('estimación del tamaño de una descarga', () => {
  it('sin teselas medidas usa el tamaño asumido por nivel de detalle', () => {
    const estimator = new TileSizeEstimator()

    expect(estimator.estimateSizeInBytes(ONE_THOUSAND_DETAILED_TILES)).toBe(
      1000 * estimator.averageSizeInBytes(14),
    )
    expect(estimator.averageSizeInBytes(3)).toBeGreaterThan(
      estimator.averageSizeInBytes(14),
    )
  })

  it('suma la estimación de cada nivel de detalle', () => {
    const estimator = new TileSizeEstimator()

    expect(
      estimator.estimateSizeInBytes(
        new Map([
          [13, 10],
          [14, 40],
        ]),
      ),
    ).toBe(
      10 * estimator.averageSizeInBytes(13) +
        40 * estimator.averageSizeInBytes(14),
    )
  })

  it('se acerca al tamaño real a medida que llegan teselas reales', () => {
    const realSizeInBytes = 8_000
    const estimator = new TileSizeEstimator()
    const estimates = [
      estimator.estimateSizeInBytes(ONE_THOUSAND_DETAILED_TILES),
    ]

    for (const tilesReceived of [5, 50, 500]) {
      for (let i = 0; i < tilesReceived; i++)
        estimator.record(14, realSizeInBytes)
      estimates.push(estimator.estimateSizeInBytes(ONE_THOUSAND_DETAILED_TILES))
    }

    const errors = estimates.map((estimate) =>
      Math.abs(estimate - 1000 * realSizeInBytes),
    )
    expect(errors[1]).toBeLessThan(errors[0]!)
    expect(errors[2]).toBeLessThan(errors[1]!)
    expect(errors[3]).toBeLessThan(errors[2]!)
    expect(estimates[3]).toBeLessThan(1000 * realSizeInBytes * 1.1)
  })

  it('lo medido en un nivel de detalle no altera la estimación de los demás', () => {
    const estimator = new TileSizeEstimator()
    const before = estimator.averageSizeInBytes(13)

    estimator.record(14, 1)

    expect(estimator.averageSizeInBytes(13)).toBe(before)
  })

  it('parte de las mediciones de descargas anteriores', () => {
    const estimator = new TileSizeEstimator(
      new Map([[14, { count: 10_000, totalBytes: 10_000 * 5_000 }]]),
    )

    expect(estimator.averageSizeInBytes(14)).toBeCloseTo(5_000, -2)
  })
})
