// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  buildOpenMapTilesStyle,
  openMapTilesOfflineResourceUrls,
} from './openfreemap-style.ts'

/** Capas del esquema OpenMapTiles: https://openmaptiles.org/schema/ */
const OPEN_MAP_TILES_LAYERS = [
  'aerodrome_label',
  'aeroway',
  'boundary',
  'building',
  'housenumber',
  'landcover',
  'landuse',
  'mountain_peak',
  'park',
  'place',
  'poi',
  'transportation',
  'transportation_name',
  'water',
  'water_name',
  'waterway',
]

interface Layer {
  id: string
  type: string
  source?: string
  'source-layer'?: string
  layout?: Record<string, unknown>
}

function buildStyle(language = 'es-AR') {
  const style = buildOpenMapTilesStyle({
    styleName: 'liberty',
    serverUrl: 'https://tiles.openfreemap.org',
    language,
    tileUrlTemplate: 'riders://tile/{z}/{x}/{y}',
    resourceUrl: (url) => url.replace('https://', 'riders://resource/'),
    maxZoom: 14,
  })
  return {
    style,
    layers: style.layers as Layer[],
    sources: style.sources as Record<string, { tiles?: string[] }>,
  }
}

describe('estilo del mapa', () => {
  it('referencia solo capas presentes en el esquema OpenMapTiles', () => {
    const { layers } = buildStyle()
    const dataLayers = layers.filter((layer) => layer.type !== 'background')

    expect(dataLayers.length).toBeGreaterThan(50)
    for (const layer of dataLayers) {
      expect(OPEN_MAP_TILES_LAYERS, `capa «${layer.id}»`).toContain(
        layer['source-layer'],
      )
    }
  })

  it('usa una única fuente de teselas, la que la app sirve con y sin conexión', () => {
    const { layers, sources } = buildStyle()

    expect(Object.keys(sources)).toEqual(['openmaptiles'])
    expect(sources.openmaptiles?.tiles).toEqual(['riders://tile/{z}/{x}/{y}'])
    expect(
      new Set(layers.flatMap((layer) => (layer.source ? [layer.source] : []))),
    ).toEqual(new Set(['openmaptiles']))
  })

  it('dibuja calles, rutas, nombres y lugares', () => {
    const { layers } = buildStyle()
    const drawnLayers = new Set(layers.map((layer) => layer['source-layer']))

    for (const expected of [
      'transportation',
      'transportation_name',
      'place',
      'poi',
    ]) {
      expect(drawnLayers).toContain(expected)
    }
  })

  it.each([
    ['es-AR', 'name:es'],
    ['en', 'name:en'],
  ])(
    'con la interfaz en %s muestra los nombres en ese idioma cuando el dato existe, y si no el nombre local',
    (language, localizedField) => {
      const { layers } = buildStyle(language)
      const placeLabels = layers.filter(
        (layer) =>
          layer['source-layer'] === 'place' && layer.layout?.['text-field'],
      )

      expect(placeLabels.length).toBeGreaterThan(0)
      for (const layer of placeLabels) {
        expect(layer.layout?.['text-field']).toEqual([
          'coalesce',
          ['get', localizedField],
          ['get', 'name:latin'],
          ['get', 'name'],
        ])
      }
    },
  )

  it('conserva los números de ruta, que no dependen del idioma', () => {
    const { layers } = buildStyle()
    const routeShields = layers.filter((layer) =>
      JSON.stringify(layer.layout?.['text-field'] ?? '').includes('"ref"'),
    )

    expect(routeShields.length).toBeGreaterThan(0)
  })

  it('pide glifos e íconos a través de la app, para poder servirlos sin conexión', () => {
    const { style } = buildStyle()

    expect(style.glyphs).toBe(
      'riders://resource/tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
    )
    expect(style.sprite).toMatch(
      /^riders:\/\/resource\/tiles\.openfreemap\.org\/sprites\//,
    )
  })

  it('rechaza un estilo que la app no tiene', () => {
    expect(() =>
      buildOpenMapTilesStyle({
        styleName: 'inexistente',
        serverUrl: 'https://tiles.openfreemap.org',
        language: 'es-AR',
        tileUrlTemplate: '',
        resourceUrl: (url) => url,
        maxZoom: 14,
      }),
    ).toThrow(/inexistente/)
  })
})

describe('recursos del estilo para uso sin conexión', () => {
  it('incluye los glifos latinos de cada tipografía del estilo y los íconos en ambas densidades', () => {
    const urls = openMapTilesOfflineResourceUrls({
      styleName: 'liberty',
      serverUrl: 'https://mapas.example',
    })

    expect(urls).toContain(
      'https://mapas.example/fonts/Noto Sans Regular/0-255.pbf',
    )
    expect(urls).toContain(
      'https://mapas.example/fonts/Noto Sans Bold/256-511.pbf',
    )
    expect(urls.filter((url) => url.includes('/sprites/'))).toHaveLength(4)
    expect(urls.every((url) => url.startsWith('https://mapas.example/'))).toBe(
      true,
    )
  })
})
