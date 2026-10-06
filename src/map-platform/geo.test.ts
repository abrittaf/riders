// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { boundsCenter, distanceInMeters } from './geo.ts'

describe('distancia entre posiciones', () => {
  it('Salta y Cachi están a unos 84 km en línea recta', () => {
    const distance = distanceInMeters(
      { latitude: -24.7859, longitude: -65.4117 },
      { latitude: -25.1197, longitude: -66.1656 },
    )

    expect(distance / 1000).toBeCloseTo(84.8, 0)
  })

  it('la distancia de una posición a sí misma es cero', () => {
    const cachi = { latitude: -25.1197, longitude: -66.1656 }

    expect(distanceInMeters(cachi, cachi)).toBe(0)
  })
})

describe('centro de una zona', () => {
  it('es el punto medio de sus bordes', () => {
    expect(
      boundsCenter({ west: -66.2, south: -25.2, east: -66.1, north: -25.0 }),
    ).toEqual({ latitude: -25.1, longitude: -66.15 })
  })
})
