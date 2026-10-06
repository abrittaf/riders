// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { Point } from '../point-lookup/point.ts'
import {
  decodeGeometry,
  duplicateDraftOf,
  type Roadmap,
  roadmapLegOf,
  totalsOf,
  unpavedMetersOf,
  validatePoints,
  validateRoadmapName,
} from './roadmap.ts'

/** Posiciones cada ~1,11 km hacia el sur sobre el mismo meridiano (0,01° de latitud). */
function straightSouth(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    latitude: -25 - index * 0.01,
    longitude: -66,
  }))
}

function point(name: string, date: string | null = null): Point {
  return {
    name,
    position: { latitude: -25, longitude: -66 },
    source: 'known-place',
    type: null,
    date,
  }
}

describe('nombre del Roadmap', () => {
  it.each([
    ['', 'empty'],
    ['   ', 'empty'],
    ['A', 'too-short'],
    ['x'.repeat(61), 'too-long'],
  ])('«%s» no vale: %s', (name, expected) => {
    expect(validateRoadmapName(name)).toBe(expected)
  })

  it('acepta de 2 a 60 caracteres, sin contar espacios de los bordes', () => {
    expect(validateRoadmapName(' Ida a Cachi ')).toBeNull()
    expect(validateRoadmapName('x'.repeat(60))).toBeNull()
  })
})

describe('Points del Roadmap', () => {
  it('hacen falta al menos dos', () => {
    expect(validatePoints([point('Salta')])).toBe('too-few')
    expect(validatePoints([point('Salta'), point('Cachi')])).toBeNull()
  })

  it('más de cincuenta no se aceptan', () => {
    expect(validatePoints(Array.from({ length: 51 }, () => point('P')))).toBe(
      'too-many',
    )
  })
})

describe('kilómetros sin pavimentar de un tramo', () => {
  const geometry = straightSouth(11) // diez pasos de ~1,11 km

  it('suma la longitud de los segmentos consolidados y sueltos', () => {
    const unpaved = unpavedMetersOf(geometry, [
      { fromIndex: 0, toIndex: 5, surface: 'paved' },
      { fromIndex: 5, toIndex: 8, surface: 'compacted' },
      { fromIndex: 8, toIndex: 10, surface: 'loose' },
    ])

    expect(unpaved / 1000).toBeCloseTo(5.56, 1)
  })

  it('no cuenta lo que no tiene dato de superficie', () => {
    const unpaved = unpavedMetersOf(geometry, [
      { fromIndex: 0, toIndex: 5, surface: 'unknown' },
      { fromIndex: 5, toIndex: 10, surface: 'paved' },
    ])

    expect(unpaved).toBe(0)
  })

  it('un tramo todo pavimentado informa 0 km sin pavimentar', () => {
    expect(
      unpavedMetersOf(geometry, [
        { fromIndex: 0, toIndex: 10, surface: 'paved' },
      ]),
    ).toBe(0)
  })
})

describe('un tramo calculado se guarda con su geometría codificada', () => {
  it('conserva distancia, tiempo, superficie y la geometría al decodificarla', () => {
    const geometry = straightSouth(4)
    const leg = roadmapLegOf({
      distanceInMeters: 3340,
      durationInSeconds: 200,
      geometry,
      surfaces: [{ fromIndex: 0, toIndex: 3, surface: 'compacted' }],
    })

    expect(leg).toMatchObject({ distanceM: 3340, durationS: 200 })
    expect(leg.unpavedM / 1000).toBeCloseTo(3.34, 1)
    expect(decodeGeometry(leg.geometry)).toEqual(geometry)
  })

  it('los totales suman distancia y tiempo de todos los tramos', () => {
    expect(
      totalsOf([
        {
          distanceM: 1000,
          durationS: 60,
          unpavedM: 0,
          geometry: '',
          surfaces: [],
        },
        {
          distanceM: 2500,
          durationS: 150,
          unpavedM: 0,
          geometry: '',
          surfaces: [],
        },
      ]),
    ).toEqual({ totalDistanceM: 3500, totalDurationS: 210 })
  })
})

describe('duplicar un Roadmap', () => {
  const original: Roadmap = {
    id: 'r1',
    ownerId: 'ana',
    status: 'planning',
    name: 'Ida a Cachi',
    description: 'Por la Cuesta del Obispo',
    points: [point('Salta', '2026-11-20'), point('Cachi', '2026-11-21')],
    legs: [
      {
        distanceM: 167273,
        durationS: 18547,
        unpavedM: 15686,
        geometry: 'abc',
        surfaces: [{ fromIndex: 0, toIndex: 10, surface: 'paved' }],
      },
    ],
    totalDistanceM: 167273,
    totalDurationS: 18547,
  }

  it('copia nombre con sufijo, descripción, Points y ruta, sin las fechas', () => {
    const copy = duplicateDraftOf(original, '(copia)')

    expect(copy.name).toBe('Ida a Cachi (copia)')
    expect(copy.description).toBe(original.description)
    expect(copy.points.map((p) => [p.name, p.date])).toEqual([
      ['Salta', null],
      ['Cachi', null],
    ])
    expect(copy.legs).toEqual(original.legs)
  })

  it('el duplicado es independiente: cambiarlo no toca al original', () => {
    const copy = duplicateDraftOf(original, '(copia)')

    copy.points[0]!.name = 'Otra salida'
    copy.legs[0]!.surfaces[0]!.surface = 'loose'

    expect(original.points[0]!.name).toBe('Salta')
    expect(original.legs[0]!.surfaces[0]!.surface).toBe('paved')
  })

  it('el nombre con sufijo no supera el máximo', () => {
    const copy = duplicateDraftOf(
      { ...original, name: 'x'.repeat(60) },
      '(copia)',
    )

    expect(copy.name).toHaveLength(60)
  })
})
