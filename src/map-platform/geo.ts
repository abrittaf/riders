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

export function boundsCenter(bounds: GeoBounds): GeoPosition {
  return {
    latitude: (bounds.south + bounds.north) / 2,
    longitude: (bounds.west + bounds.east) / 2,
  }
}

const EARTH_RADIUS_IN_METERS = 6_371_000

/** Distancia en línea recta sobre la esfera terrestre (fórmula del haversine). */
export function distanceInMeters(a: GeoPosition, b: GeoPosition): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180
  const latitudeDelta = toRadians(b.latitude - a.latitude)
  const longitudeDelta = toRadians(b.longitude - a.longitude)
  const h =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(a.latitude)) *
      Math.cos(toRadians(b.latitude)) *
      Math.sin(longitudeDelta / 2) ** 2
  return 2 * EARTH_RADIUS_IN_METERS * Math.asin(Math.sqrt(h))
}
