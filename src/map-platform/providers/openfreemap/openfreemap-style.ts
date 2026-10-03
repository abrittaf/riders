import type { MapStyle } from '../../map-provider.ts'
import liberty from './styles/liberty.json'

/** Estilos publicados por OpenFreeMap de los que la app guarda una copia. */
const PUBLISHED_STYLES: Record<string, MapStyle> = { liberty }

/** Servidor desde el que los estilos publicados referencian sus recursos. */
const PUBLISHED_STYLES_SERVER = 'https://tiles.openfreemap.org'

const VECTOR_SOURCE_ID = 'openmaptiles'

/** Rangos de glifos que cubren los nombres en alfabeto latino. */
const LATIN_GLYPH_RANGES = ['0-255', '256-511', '8192-8447']

interface StyleLayer {
  id: string
  source?: string
  layout?: Record<string, unknown>
  [property: string]: unknown
}

export interface OpenMapTilesStyleInput {
  styleName: string
  serverUrl: string
  language: string
  /** Dirección que el renderizador usa para pedir cada tesela, con `{z}`, `{x}`, `{y}`. */
  tileUrlTemplate: string
  /** Convierte la dirección de un recurso del estilo (glifos, sprites) en la que usa el renderizador. */
  resourceUrl: (url: string) => string
  maxZoom: number
}

function publishedStyle(styleName: string): MapStyle {
  const style = PUBLISHED_STYLES[styleName]
  if (!style) {
    throw new Error(
      `Estilo de OpenFreeMap desconocido: «${styleName}». Disponibles: ${Object.keys(PUBLISHED_STYLES).join(', ')}`,
    )
  }
  return structuredClone(style)
}

function showsFeatureName(textField: unknown): boolean {
  return textField !== undefined && JSON.stringify(textField).includes('"name')
}

function nameInLanguage(language: string): unknown[] {
  const primarySubtag = language.toLowerCase().split('-')[0]
  return [
    'coalesce',
    ['get', `name:${primarySubtag}`],
    ['get', 'name:latin'],
    ['get', 'name'],
  ]
}

function onServer(url: string, serverUrl: string): string {
  return url.replace(PUBLISHED_STYLES_SERVER, serverUrl)
}

/**
 * Estilo del mapa a partir de uno de los publicados por OpenFreeMap (esquema OpenMapTiles):
 * una única fuente vectorial, servida por el `TileSource` de la app, y nombres en el idioma
 * de la interfaz cuando el dato existe.
 */
export function buildOpenMapTilesStyle(
  input: OpenMapTilesStyleInput,
): MapStyle {
  const style = publishedStyle(input.styleName)
  const layers = (style.layers as StyleLayer[])
    .filter(
      (layer) =>
        layer.source === undefined || layer.source === VECTOR_SOURCE_ID,
    )
    .map((layer) =>
      layer.layout && showsFeatureName(layer.layout['text-field'])
        ? {
            ...layer,
            layout: {
              ...layer.layout,
              'text-field': nameInLanguage(input.language),
            },
          }
        : layer,
    )

  return {
    ...style,
    sources: {
      [VECTOR_SOURCE_ID]: {
        type: 'vector',
        tiles: [input.tileUrlTemplate],
        minzoom: 0,
        maxzoom: input.maxZoom,
      },
    },
    glyphs: input.resourceUrl(
      onServer(style.glyphs as string, input.serverUrl),
    ),
    sprite: input.resourceUrl(
      onServer(style.sprite as string, input.serverUrl),
    ),
    layers,
  }
}

/** Glifos e íconos que el estilo necesita para dibujar nombres y lugares sin conexión. */
export function openMapTilesOfflineResourceUrls(input: {
  styleName: string
  serverUrl: string
}): string[] {
  const style = publishedStyle(input.styleName)
  const fontStacks = new Set(
    (style.layers as StyleLayer[]).flatMap((layer) => {
      const fonts = layer.layout?.['text-font']
      return Array.isArray(fonts) ? [fonts.join(',')] : []
    }),
  )
  const glyphsTemplate = onServer(style.glyphs as string, input.serverUrl)
  const glyphUrls = [...fontStacks].flatMap((fontStack) =>
    LATIN_GLYPH_RANGES.map((range) =>
      glyphsTemplate
        .replace('{fontstack}', fontStack)
        .replace('{range}', range),
    ),
  )
  const sprite = onServer(style.sprite as string, input.serverUrl)
  const spriteUrls = ['', '@2x'].flatMap((density) => [
    `${sprite}${density}.json`,
    `${sprite}${density}.png`,
  ])
  return [...glyphUrls, ...spriteUrls]
}

export const OPEN_MAP_TILES_VECTOR_SOURCE_ID = VECTOR_SOURCE_ID
