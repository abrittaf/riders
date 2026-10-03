import type { GeoBounds } from './geo.ts'
import type { TileCoordinates } from './tile-source.ts'

const MAX_MERCATOR_LATITUDE = 85.0511

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function tileColumn(longitude: number, z: number): number {
  const tilesPerSide = 2 ** z
  return clamp(
    Math.floor(((longitude + 180) / 360) * tilesPerSide),
    0,
    tilesPerSide - 1,
  )
}

function tileRow(latitude: number, z: number): number {
  const tilesPerSide = 2 ** z
  const radians =
    (clamp(latitude, -MAX_MERCATOR_LATITUDE, MAX_MERCATOR_LATITUDE) * Math.PI) /
    180
  const mercatorY =
    (1 - Math.log(Math.tan(radians) + 1 / Math.cos(radians)) / Math.PI) / 2
  return clamp(Math.floor(mercatorY * tilesPerSide), 0, tilesPerSide - 1)
}

export interface TileRange {
  z: number
  minX: number
  maxX: number
  minY: number
  maxY: number
}

export function tileRangeCovering(bounds: GeoBounds, z: number): TileRange {
  return {
    z,
    minX: tileColumn(bounds.west, z),
    maxX: tileColumn(bounds.east, z),
    minY: tileRow(bounds.north, z),
    maxY: tileRow(bounds.south, z),
  }
}

export function tileCountInRange(range: TileRange): number {
  return (range.maxX - range.minX + 1) * (range.maxY - range.minY + 1)
}

export interface ZoomLevels {
  minZoom: number
  maxZoom: number
}

/** Cantidad de teselas que cubren el rectángulo, por nivel de detalle. */
export function tileCountsByZoom(
  bounds: GeoBounds,
  { minZoom, maxZoom }: ZoomLevels,
): Map<number, number> {
  const counts = new Map<number, number>()
  for (let z = minZoom; z <= maxZoom; z++) {
    counts.set(z, tileCountInRange(tileRangeCovering(bounds, z)))
  }
  return counts
}

export function totalTileCount(bounds: GeoBounds, zoomLevels: ZoomLevels) {
  return [...tileCountsByZoom(bounds, zoomLevels).values()].reduce(
    (total, count) => total + count,
    0,
  )
}

/** Teselas que cubren el rectángulo en todos los niveles de detalle, de menor a mayor detalle. */
export function* tilesCovering(
  bounds: GeoBounds,
  { minZoom, maxZoom }: ZoomLevels,
): Generator<TileCoordinates> {
  for (let z = minZoom; z <= maxZoom; z++) {
    const range = tileRangeCovering(bounds, z)
    for (let x = range.minX; x <= range.maxX; x++) {
      for (let y = range.minY; y <= range.maxY; y++) {
        yield { z, x, y }
      }
    }
  }
}

export function tileBounds({ z, x, y }: TileCoordinates): GeoBounds {
  const tilesPerSide = 2 ** z
  const longitudeOf = (column: number) => (column / tilesPerSide) * 360 - 180
  const latitudeOf = (row: number) =>
    (Math.atan(Math.sinh(Math.PI * (1 - (2 * row) / tilesPerSide))) * 180) /
    Math.PI
  return {
    west: longitudeOf(x),
    east: longitudeOf(x + 1),
    north: latitudeOf(y),
    south: latitudeOf(y + 1),
  }
}

/** Rectángulo con el mismo centro y la mitad de ancho y de alto: lo que se ve al acercar el mapa un nivel. */
export function zoomedInBounds(bounds: GeoBounds): GeoBounds {
  const centerLongitude = (bounds.west + bounds.east) / 2
  const centerLatitude = (bounds.south + bounds.north) / 2
  const quarterWidth = (bounds.east - bounds.west) / 4
  const quarterHeight = (bounds.north - bounds.south) / 4
  return {
    west: centerLongitude - quarterWidth,
    east: centerLongitude + quarterWidth,
    south: centerLatitude - quarterHeight,
    north: centerLatitude + quarterHeight,
  }
}
