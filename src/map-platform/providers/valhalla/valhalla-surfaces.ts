import type { RoadSurface } from '../../route-provider.ts'

/** Las ocho superficies que informa Valhalla, derivadas de `surface` y `tracktype` de OpenStreetMap. */
export type ValhallaSurface =
  | 'paved_smooth'
  | 'paved'
  | 'paved_rough'
  | 'compacted'
  | 'gravel'
  | 'dirt'
  | 'path'
  | 'impassable'

/**
 * Correspondencia de D1b (design.md de roadmap-planning) entre las superficies de Valhalla y las
 * clases que la app dibuja. `impassable` no debería aparecer con el perfil elegido; si aparece, se
 * trata como suelto.
 */
export const VALHALLA_SURFACE_CLASSES: Record<ValhallaSurface, RoadSurface> = {
  paved_smooth: 'paved',
  paved: 'paved',
  paved_rough: 'paved',
  compacted: 'compacted',
  gravel: 'compacted',
  dirt: 'loose',
  path: 'loose',
  impassable: 'loose',
}

export function roadSurfaceOf(valhallaSurface: unknown): RoadSurface {
  return typeof valhallaSurface === 'string' &&
    valhallaSurface in VALHALLA_SURFACE_CLASSES
    ? VALHALLA_SURFACE_CLASSES[valhallaSurface as ValhallaSurface]
    : 'unknown'
}
