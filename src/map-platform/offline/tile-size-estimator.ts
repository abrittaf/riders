export interface ObservedTileSizes {
  count: number
  totalBytes: number
}

const KILOBYTE = 1024

/** Tamaño típico de una tesela sin comprimir por nivel de detalle, antes de haber medido ninguna. */
function assumedAverageSizeInBytes(z: number): number {
  if (z <= 5) return 400 * KILOBYTE
  if (z <= 9) return 250 * KILOBYTE
  if (z <= 11) return 150 * KILOBYTE
  if (z === 12) return 90 * KILOBYTE
  if (z === 13) return 60 * KILOBYTE
  return 40 * KILOBYTE
}

/** Cuántas teselas reales pesa el tamaño asumido: con pocas mediciones domina lo asumido, con muchas lo medido. */
const ASSUMED_SIZE_WEIGHT_IN_TILES = 10

/**
 * Estima cuánto ocupa una descarga: cantidad de teselas por un tamaño promedio por nivel de
 * detalle, que se calibra con las teselas que el celular ya descargó.
 */
export class TileSizeEstimator {
  private readonly observed: Map<number, ObservedTileSizes>

  constructor(
    observed: ReadonlyMap<number, ObservedTileSizes> = new Map<
      number,
      ObservedTileSizes
    >(),
  ) {
    this.observed = new Map(observed)
  }

  record(z: number, sizeInBytes: number): void {
    const previous = this.observed.get(z) ?? { count: 0, totalBytes: 0 }
    this.observed.set(z, {
      count: previous.count + 1,
      totalBytes: previous.totalBytes + sizeInBytes,
    })
  }

  averageSizeInBytes(z: number): number {
    const observed = this.observed.get(z) ?? { count: 0, totalBytes: 0 }
    return (
      (assumedAverageSizeInBytes(z) * ASSUMED_SIZE_WEIGHT_IN_TILES +
        observed.totalBytes) /
      (ASSUMED_SIZE_WEIGHT_IN_TILES + observed.count)
    )
  }

  estimateSizeInBytes(tileCountsByZoom: ReadonlyMap<number, number>): number {
    let total = 0
    for (const [z, tileCount] of tileCountsByZoom) {
      total += tileCount * this.averageSizeInBytes(z)
    }
    return Math.round(total)
  }
}
