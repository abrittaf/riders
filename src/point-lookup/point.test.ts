// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { formatDistance } from './format-distance.ts'
import {
  formatCoordinates,
  pointFromPlace,
  pointFromPosition,
} from './point.ts'

const CACHI = { latitude: -25.1197, longitude: -66.1656 }

describe('un Point', () => {
  it('desde una estación de servicio conserva el nombre y el tipo del lugar', () => {
    const point = pointFromPlace({
      name: 'YPF Cachi',
      position: CACHI,
      type: 'fuel',
      locality: 'Cachi',
    })

    expect(point).toEqual({
      name: 'YPF Cachi',
      position: CACHI,
      source: 'known-place',
      type: 'fuel',
      date: null,
    })
  })

  it('desde una posición tocada no tiene tipo y recuerda su origen', () => {
    expect(pointFromPosition(CACHI, 'Mirador')).toMatchObject({
      source: 'chosen-position',
      type: null,
    })
  })

  it('propone las coordenadas con cuatro decimales en el formato del idioma', () => {
    expect(formatCoordinates(CACHI, 'es-AR')).toBe('-25,1197, -66,1656')
    expect(formatCoordinates(CACHI, 'en')).toBe('-25.1197, -66.1656')
  })
})

describe('distancia para mostrar', () => {
  it.each([
    [850, '850 m'],
    [12_345, '12,3 km'],
    [1_250_000, '1.250 km'],
  ])('%i metros se muestran como «%s»', (meters, expected) => {
    expect(formatDistance(meters, 'es-AR').replace(/ /g, ' ')).toBe(expected)
  })
})
