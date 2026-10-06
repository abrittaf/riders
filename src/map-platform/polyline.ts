import type { GeoPosition } from './geo.ts'

/**
 * Formato de polilínea codificada de Google: cada coordenada se guarda como la diferencia con la
 * anterior, en enteros de base 32 sobre caracteres imprimibles. Valhalla usa seis decimales y
 * el formato original cinco; la precisión se indica en cada llamada.
 */
export type PolylinePrecision = 5 | 6

export function decodePolyline(
  encoded: string,
  precision: PolylinePrecision,
): GeoPosition[] {
  const factor = 10 ** precision
  const positions: GeoPosition[] = []
  let index = 0
  let latitude = 0
  let longitude = 0
  while (index < encoded.length) {
    const [latitudeDelta, afterLatitude] = readValue(encoded, index)
    const [longitudeDelta, afterLongitude] = readValue(encoded, afterLatitude)
    index = afterLongitude
    latitude += latitudeDelta
    longitude += longitudeDelta
    positions.push({
      latitude: latitude / factor,
      longitude: longitude / factor,
    })
  }
  return positions
}

export function encodePolyline(
  positions: readonly GeoPosition[],
  precision: PolylinePrecision,
): string {
  const factor = 10 ** precision
  let encoded = ''
  let previousLatitude = 0
  let previousLongitude = 0
  for (const position of positions) {
    const latitude = Math.round(position.latitude * factor)
    const longitude = Math.round(position.longitude * factor)
    encoded += writeValue(latitude - previousLatitude)
    encoded += writeValue(longitude - previousLongitude)
    previousLatitude = latitude
    previousLongitude = longitude
  }
  return encoded
}

function readValue(encoded: string, start: number): [number, number] {
  let result = 0
  let shift = 0
  let index = start
  let chunk: number
  do {
    chunk = encoded.charCodeAt(index++) - 63
    result |= (chunk & 0x1f) << shift
    shift += 5
  } while (chunk >= 0x20)
  const value = result & 1 ? ~(result >> 1) : result >> 1
  return [value, index]
}

function writeValue(value: number): string {
  let remaining = value < 0 ? ~(value << 1) : value << 1
  let encoded = ''
  while (remaining >= 0x20) {
    encoded += String.fromCharCode((0x20 | (remaining & 0x1f)) + 63)
    remaining >>= 5
  }
  encoded += String.fromCharCode(remaining + 63)
  return encoded
}
