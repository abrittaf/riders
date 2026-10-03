export interface GeoPosition {
  latitude: number
  longitude: number
}

export interface GeoBounds {
  west: number
  south: number
  east: number
  north: number
}

export function boundsIntersect(a: GeoBounds, b: GeoBounds): boolean {
  return (
    a.west < b.east && b.west < a.east && a.south < b.north && b.south < a.north
  )
}
