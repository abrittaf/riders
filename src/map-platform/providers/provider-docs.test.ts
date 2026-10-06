// @vitest-environment node
import { describe, expect, it } from 'vitest'
import searchDocument from '../../../docs/proveedor-de-busqueda.md?raw'
import routingDocument from '../../../docs/proveedor-de-ruteo.md?raw'
import spanishTexts from '../../i18n/locales/es-AR.json'
import type { MapAttribution } from '../map-provider.ts'
import { PhotonPlaceSearch } from './photon/photon-place-search.ts'
import { RequestPacer } from './request-pacer.ts'
import { ValhallaRouteProvider } from './valhalla/valhalla-route-provider.ts'
import { mapConfig } from '../../config/map-config.ts'

function spanishText(key: string): string {
  const text = key
    .split('.')
    .reduce<unknown>(
      (node, part) => (node as Record<string, unknown>)[part],
      spanishTexts,
    )
  if (typeof text !== 'string') throw new Error(`Falta el texto «${key}»`)
  return text
}

/** La fila de la tabla «Atribución que muestra la app» que corresponde a una fuente. */
function documentedAttributionRow(attribution: MapAttribution): string {
  return `| ${attribution.name} | ${attribution.url} | ${spanishText(attribution.descriptionKey)} |`
}

describe('docs/proveedor-de-ruteo.md', () => {
  it.each([
    ['la dirección del servidor', `| \`${mapConfig.routing.serverUrl}\` |`],
    ['el perfil', `| \`${mapConfig.routing.costing}\` |`],
    [
      'el intervalo entre consultas',
      `| ${mapConfig.routing.minIntervalBetweenRequestsInMs} ms |`,
    ],
  ])('describe %s igual que la configuración de la app', (_, expected) => {
    expect(routingDocument).toContain(expected)
  })

  it('documenta exactamente la atribución que muestra la app', () => {
    const provider = new ValhallaRouteProvider(
      mapConfig.routing,
      new RequestPacer(0),
    )

    for (const attribution of provider.attributions) {
      expect(routingDocument).toContain(documentedAttributionRow(attribution))
    }
  })

  it('la atribución del ruteo enlaza a dónde corregir el mapa, como exige FOSSGIS', () => {
    const provider = new ValhallaRouteProvider(
      mapConfig.routing,
      new RequestPacer(0),
    )

    expect(
      provider.attributions.map((attribution) => attribution.url),
    ).toContain('https://www.openstreetmap.org/fixthemap')
  })
})

describe('docs/proveedor-de-busqueda.md', () => {
  it.each([
    ['la dirección del servidor', `| \`${mapConfig.placeSearch.serverUrl}\` |`],
    ['los resultados por búsqueda', `| ${mapConfig.placeSearch.maxResults} |`],
    [
      'el intervalo entre consultas',
      `| ${mapConfig.placeSearch.minIntervalBetweenRequestsInMs} ms |`,
    ],
  ])('describe %s igual que la configuración de la app', (_, expected) => {
    expect(searchDocument).toContain(expected)
  })

  it('documenta exactamente la atribución que muestra la app', () => {
    const search = new PhotonPlaceSearch(
      mapConfig.placeSearch,
      new RequestPacer(0),
    )

    for (const attribution of search.attributions) {
      expect(searchDocument).toContain(documentedAttributionRow(attribution))
    }
  })
})
