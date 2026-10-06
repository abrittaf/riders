// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { decodePolyline, encodePolyline } from './polyline.ts'

describe('polilíneas codificadas', () => {
  it('decodifica el ejemplo de la especificación de Google (cinco decimales)', () => {
    expect(decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@', 5)).toEqual([
      { latitude: 38.5, longitude: -120.2 },
      { latitude: 40.7, longitude: -120.95 },
      { latitude: 43.252, longitude: -126.453 },
    ])
  })

  it('codifica el ejemplo de la especificación de Google igual que la referencia', () => {
    expect(
      encodePolyline(
        [
          { latitude: 38.5, longitude: -120.2 },
          { latitude: 40.7, longitude: -120.95 },
          { latitude: 43.252, longitude: -126.453 },
        ],
        5,
      ),
    ).toBe('_p~iF~ps|U_ulLnnqC_mqNvxq`@')
  })

  it('conserva seis decimales al codificar y decodificar, como exige Valhalla', () => {
    const positions = [
      { latitude: -24.785901, longitude: -65.411703 },
      { latitude: -24.786012, longitude: -65.411598 },
      { latitude: -25.119713, longitude: -66.165601 },
    ]

    expect(decodePolyline(encodePolyline(positions, 6), 6)).toEqual(positions)
  })

  it('una cadena vacía es una geometría sin posiciones', () => {
    expect(decodePolyline('', 6)).toEqual([])
    expect(encodePolyline([], 6)).toBe('')
  })
})
