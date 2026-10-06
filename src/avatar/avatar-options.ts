/**
 * Opciones del sistema de avatares de Riders (design.md de rider-onboarding, D5). El avatar se
 * guarda como estas opciones, nunca como imagen; `firestore.rules` valida el mismo vocabulario.
 */
export const helmetTypes = ['full-face', 'modular'] as const
export const helmetColors = ['white', 'black', 'gray'] as const
export const neckwearTypes = [
  'bandana',
  'buff',
  'tube',
  'checkered-flag',
] as const
export const neckwearColors = [
  'blue',
  'green',
  'red',
  'orange',
  'yellow',
  'light-blue',
] as const

export type HelmetType = (typeof helmetTypes)[number]
export type HelmetColor = (typeof helmetColors)[number]
export type NeckwearType = (typeof neckwearTypes)[number]
export type NeckwearColor = (typeof neckwearColors)[number]

export interface AvatarOptions {
  helmetType: HelmetType
  helmetColor: HelmetColor
  neckwear: NeckwearType
  /** La bandera a cuadros lo ignora: siempre va en negro y blanco. */
  neckwearColor: NeckwearColor
  glasses: boolean
  beard: boolean
}

export function isAvatarOptions(value: unknown): value is AvatarOptions {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  return (
    includes(helmetTypes, candidate.helmetType) &&
    includes(helmetColors, candidate.helmetColor) &&
    includes(neckwearTypes, candidate.neckwear) &&
    includes(neckwearColors, candidate.neckwearColor) &&
    typeof candidate.glasses === 'boolean' &&
    typeof candidate.beard === 'boolean'
  )
}

function includes(allowed: readonly string[], value: unknown): boolean {
  return typeof value === 'string' && allowed.includes(value)
}
