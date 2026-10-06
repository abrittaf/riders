import type { AvatarOptions } from './avatar-options.ts'

/** Combinaciones representativas para las capturas de referencia de Playwright (galería y prueba). */
export const representativeAvatars: Record<string, AvatarOptions> = {
  'integral-blanco-panuelo-azul': {
    helmetType: 'full-face',
    helmetColor: 'white',
    neckwear: 'bandana',
    neckwearColor: 'blue',
    glasses: false,
    beard: false,
  },
  'integral-negro-buff-verde-gafas': {
    helmetType: 'full-face',
    helmetColor: 'black',
    neckwear: 'buff',
    neckwearColor: 'green',
    glasses: true,
    beard: false,
  },
  'integral-gris-cilindro-amarillo-barba': {
    helmetType: 'full-face',
    helmetColor: 'gray',
    neckwear: 'tube',
    neckwearColor: 'yellow',
    glasses: false,
    beard: true,
  },
  'rebatible-blanco-panuelo-rojo': {
    helmetType: 'modular',
    helmetColor: 'white',
    neckwear: 'bandana',
    neckwearColor: 'red',
    glasses: false,
    beard: false,
  },
  'rebatible-negro-bandera-gafas-barba': {
    helmetType: 'modular',
    helmetColor: 'black',
    neckwear: 'checkered-flag',
    neckwearColor: 'blue',
    glasses: true,
    beard: true,
  },
  'rebatible-gris-buff-celeste': {
    helmetType: 'modular',
    helmetColor: 'gray',
    neckwear: 'buff',
    neckwearColor: 'light-blue',
    glasses: false,
    beard: false,
  },
}
