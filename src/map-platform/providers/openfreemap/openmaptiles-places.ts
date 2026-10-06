import type { GeoBounds, GeoPosition } from '../../geo.ts'
import type { Place, PlaceType } from '../../place.ts'

/** Capa del esquema OpenMapTiles con los lugares con nombre (estaciones, hoteles, restaurantes, atractivos). */
export const POI_SOURCE_LAYER = 'poi'

/**
 * Qué clases de la capa `poi` corresponden a cada tipo de lugar de la app. Las clases del esquema
 * agrupan etiquetas de OpenStreetMap (`class` = `lodging` cubre hotel, motel, hostel…).
 */
const PLACE_TYPES_BY_CLASS: Record<string, PlaceType> = {
  fuel: 'fuel',
  lodging: 'lodging',
  restaurant: 'restaurant',
  fast_food: 'restaurant',
  cafe: 'restaurant',
  attraction: 'point-of-interest',
  museum: 'point-of-interest',
  monument: 'point-of-interest',
  castle: 'point-of-interest',
  park: 'point-of-interest',
  place_of_worship: 'point-of-interest',
  art_gallery: 'point-of-interest',
  zoo: 'point-of-interest',
  stadium: 'point-of-interest',
}

/** Lo que `map-platform` lee de cada elemento de la capa `poi`; el renderizador entrega más. */
export interface PoiFeature {
  properties: Record<string, unknown>
  geometry: { type: string; coordinates: unknown }
}

export function placeTypeOfClass(poiClass: unknown): PlaceType | null {
  return typeof poiClass === 'string'
    ? (PLACE_TYPES_BY_CLASS[poiClass] ?? null)
    : null
}

/** Nombre en el idioma pedido cuando el dato existe; el original si no. */
export function placeNameIn(
  properties: Record<string, unknown>,
  language: string,
): string | null {
  const primarySubtag = language.toLowerCase().split('-')[0]
  const translated = properties[`name:${primarySubtag}`]
  if (typeof translated === 'string' && translated !== '') return translated
  const original = properties['name']
  return typeof original === 'string' && original !== '' ? original : null
}

function positionOf(feature: PoiFeature): GeoPosition | null {
  if (feature.geometry.type !== 'Point') return null
  const [longitude, latitude] = feature.geometry.coordinates as number[]
  return latitude === undefined || longitude === undefined
    ? null
    : { latitude, longitude }
}

function isWithin(position: GeoPosition, bounds: GeoBounds): boolean {
  return (
    position.longitude >= bounds.west &&
    position.longitude <= bounds.east &&
    position.latitude >= bounds.south &&
    position.latitude <= bounds.north
  )
}

/**
 * Los lugares de los tipos pedidos dentro de `bounds`, a partir de los elementos de la capa `poi`
 * de las teselas cargadas. Un mismo lugar puede venir en dos teselas vecinas: se deja uno.
 */
export function placesInBounds(
  features: readonly PoiFeature[],
  types: readonly PlaceType[],
  bounds: GeoBounds,
  language: string,
): Place[] {
  const places = new Map<string, Place>()
  for (const feature of features) {
    const type = placeTypeOfClass(feature.properties['class'])
    if (type === null || !types.includes(type)) continue
    const name = placeNameIn(feature.properties, language)
    const position = positionOf(feature)
    if (name === null || position === null || !isWithin(position, bounds)) {
      continue
    }
    const key = `${type}|${name}|${position.latitude}|${position.longitude}`
    if (!places.has(key)) {
      places.set(key, { name, position, type, locality: null })
    }
  }
  return [...places.values()]
}
