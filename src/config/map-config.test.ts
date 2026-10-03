// @vitest-environment node
import { describe, expect, it } from 'vitest'
import providerDocument from '../../docs/proveedor-de-mapa.md?raw'
import { mapConfig } from './map-config.ts'

describe('docs/proveedor-de-mapa.md', () => {
  it.each([
    ['el proveedor de teselas', `| \`${mapConfig.tileProvider}\` |`],
    ['la dirección del servidor', `| \`${mapConfig.openFreeMap.serverUrl}\` |`],
    ['el conjunto de teselas', `| \`${mapConfig.openFreeMap.tileSetName}\` |`],
    ['el estilo', `| \`${mapConfig.openFreeMap.styleName}\` |`],
    [
      'el límite de teselas por zona',
      `| ${mapConfig.offlineRegions.maxTilesPerRegion} `,
    ],
    [
      'las descargas simultáneas',
      `| ${mapConfig.offlineRegions.downloadConcurrency} |`,
    ],
    [
      'la dirección del TileJSON',
      `${mapConfig.openFreeMap.serverUrl}/${mapConfig.openFreeMap.tileSetName}`,
    ],
  ])('describe %s igual que la configuración de la app', (_, expected) => {
    expect(providerDocument).toContain(expected)
  })

  it('la app usa por defecto el proveedor documentado', () => {
    expect(mapConfig.tileProvider).toBe('openfreemap')
  })
})
