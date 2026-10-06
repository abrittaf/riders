// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  placeNameIn,
  placesInBounds,
  type PoiFeature,
} from './openmaptiles-places.ts'

const CACHI_AREA = { west: -66.2, south: -25.2, east: -66.1, north: -25.0 }

function poi(
  properties: Record<string, unknown>,
  [longitude, latitude]: [number, number],
): PoiFeature {
  return {
    properties,
    geometry: { type: 'Point', coordinates: [longitude, latitude] },
  }
}

describe('lugares de la capa poi de las teselas', () => {
  it('lista los lugares de los tipos pedidos que están dentro de la zona visible', () => {
    const features = [
      poi({ class: 'fuel', name: 'YPF Cachi' }, [-66.16, -25.12]),
      poi({ class: 'lodging', name: 'Hostal del Valle' }, [-66.165, -25.121]),
      poi(
        { class: 'fuel', name: 'Estación fuera de la vista' },
        [-65.4, -24.8],
      ),
      poi({ class: 'school', name: 'Escuela' }, [-66.16, -25.12]),
    ]

    const places = placesInBounds(features, ['fuel'], CACHI_AREA, 'es-AR')

    expect(places).toEqual([
      {
        name: 'YPF Cachi',
        position: { latitude: -25.12, longitude: -66.16 },
        type: 'fuel',
        locality: null,
      },
    ])
  })

  it('agrupa las clases del esquema en los tipos de la app: comida rápida y cafés son restaurantes', () => {
    const features = [
      poi({ class: 'restaurant', name: 'Parrilla' }, [-66.16, -25.12]),
      poi({ class: 'fast_food', name: 'Lomitería' }, [-66.161, -25.12]),
      poi({ class: 'cafe', name: 'Café' }, [-66.162, -25.12]),
      poi({ class: 'museum', name: 'Museo' }, [-66.163, -25.12]),
    ]

    const places = placesInBounds(
      features,
      ['restaurant', 'point-of-interest'],
      CACHI_AREA,
      'es-AR',
    )

    expect(places.map((place) => [place.name, place.type])).toEqual([
      ['Parrilla', 'restaurant'],
      ['Lomitería', 'restaurant'],
      ['Café', 'restaurant'],
      ['Museo', 'point-of-interest'],
    ])
  })

  it('un lugar que viene en dos teselas vecinas aparece una sola vez', () => {
    const feature = poi({ class: 'fuel', name: 'YPF' }, [-66.16, -25.12])

    expect(
      placesInBounds([feature, feature], ['fuel'], CACHI_AREA, 'es-AR'),
    ).toHaveLength(1)
  })

  it('cada lugar se lista con su nombre en el idioma pedido si existe, y con el original si no', () => {
    const features = [
      poi(
        {
          class: 'lodging',
          name: 'Hotel Floripa',
          'name:es': 'Hotel Florianópolis',
        },
        [-66.16, -25.12],
      ),
      poi({ class: 'lodging', name: 'Pousada do Mar' }, [-66.161, -25.12]),
    ]

    const places = placesInBounds(features, ['lodging'], CACHI_AREA, 'es-AR')

    expect(places.map((place) => place.name)).toEqual([
      'Hotel Florianópolis',
      'Pousada do Mar',
    ])
  })

  it('un lugar sin nombre no se lista', () => {
    const features = [poi({ class: 'fuel' }, [-66.16, -25.12])]

    expect(placesInBounds(features, ['fuel'], CACHI_AREA, 'es-AR')).toEqual([])
  })
})

describe('nombre de un lugar según el idioma', () => {
  it('muestra el nombre en español cuando el lugar lo tiene además del original', () => {
    expect(
      placeNameIn(
        { name: 'Rio de Janeiro', 'name:es': 'Río de Janeiro' },
        'es-AR',
      ),
    ).toBe('Río de Janeiro')
  })

  it('muestra el nombre original cuando no hay traducción', () => {
    expect(placeNameIn({ name: 'Florianópolis' }, 'es-AR')).toBe(
      'Florianópolis',
    )
  })
})
