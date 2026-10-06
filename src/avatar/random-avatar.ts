import {
  type AvatarOptions,
  helmetColors,
  helmetTypes,
  neckwearColors,
  neckwearTypes,
} from './avatar-options.ts'

function pick<T>(values: readonly T[], random: () => number): T {
  const index = Math.min(
    values.length - 1,
    Math.floor(random() * values.length),
  )
  return values[index] as T
}

/** Una combinación válida al azar, para que el Rider arranque con algo que puede aceptar tal cual. */
export function proposeRandomAvatar(
  random: () => number = Math.random,
): AvatarOptions {
  return {
    helmetType: pick(helmetTypes, random),
    helmetColor: pick(helmetColors, random),
    neckwear: pick(neckwearTypes, random),
    neckwearColor: pick(neckwearColors, random),
    glasses: random() < 0.5,
    beard: random() < 0.5,
  }
}
