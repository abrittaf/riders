import type { PlaceType } from '../../place.ts'

/**
 * Qué etiquetas de OpenStreetMap (`osm_key`=`osm_value` en Photon) corresponden a cada tipo de
 * lugar de la app. Un lugar con nombre que no figura acá queda sin tipo (una localidad, una calle).
 */
const PLACE_TYPES_BY_TAG: Record<
  string,
  Record<string, PlaceType> | PlaceType
> = {
  amenity: {
    fuel: 'fuel',
    restaurant: 'restaurant',
    fast_food: 'restaurant',
    food_court: 'restaurant',
    cafe: 'restaurant',
    place_of_worship: 'point-of-interest',
  },
  tourism: {
    hotel: 'lodging',
    motel: 'lodging',
    hostel: 'lodging',
    guest_house: 'lodging',
    apartment: 'lodging',
    chalet: 'lodging',
    camp_site: 'lodging',
    alpine_hut: 'lodging',
    attraction: 'point-of-interest',
    viewpoint: 'point-of-interest',
    museum: 'point-of-interest',
    artwork: 'point-of-interest',
    information: 'point-of-interest',
  },
  natural: {
    peak: 'point-of-interest',
    volcano: 'point-of-interest',
    spring: 'point-of-interest',
    hot_spring: 'point-of-interest',
    waterfall: 'point-of-interest',
    cave_entrance: 'point-of-interest',
  },
  leisure: {
    park: 'point-of-interest',
    nature_reserve: 'point-of-interest',
  },
  historic: 'point-of-interest',
}

export function placeTypeOfTag(
  key: string | undefined,
  value: string | undefined,
): PlaceType | null {
  if (key === undefined || value === undefined) return null
  const byValue = PLACE_TYPES_BY_TAG[key]
  if (byValue === undefined) return null
  return typeof byValue === 'string' ? byValue : (byValue[value] ?? null)
}
