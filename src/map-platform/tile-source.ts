export interface TileCoordinates {
  z: number
  x: number
  y: number
}

export interface Tile {
  /** Tesela vectorial (MVT) sin comprimir. */
  data: ArrayBuffer
  /** Versión de los datos publicada por el proveedor (por ejemplo, la fecha de la compilación). */
  version: string
}

/** La tesela no se pudo obtener: no hay conectividad y no está guardada en el celular. */
export class TileUnavailableError extends Error {
  readonly coordinates: TileCoordinates

  constructor(coordinates: TileCoordinates, options?: ErrorOptions) {
    super(
      `Tesela ${coordinates.z}/${coordinates.x}/${coordinates.y} no disponible`,
      options,
    )
    this.name = 'TileUnavailableError'
    this.coordinates = coordinates
  }
}

/** Obtiene una tesela por z, x, y, con o sin conexión. Único punto de acceso a los proveedores de teselas. */
export interface TileSource {
  /** @throws TileUnavailableError cuando la tesela no puede obtenerse. */
  getTile(coordinates: TileCoordinates, signal?: AbortSignal): Promise<Tile>
}

export function tileKey({ z, x, y }: TileCoordinates): string {
  return `${z}/${x}/${y}`
}
