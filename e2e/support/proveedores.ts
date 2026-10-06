import type { Page } from '@playwright/test'
import { readFileSync } from 'node:fs'

/** La dirección del buscador real, la de `placeSearch.serverUrl` en `src/config/map-config.ts`. */
const PLACE_SEARCH_SERVER = 'https://photon.komoot.io'

const PHOTON_FIXTURES = new URL(
  '../../src/map-platform/providers/photon/fixtures/',
  import.meta.url,
)

function photonFixture(name: string): string {
  return readFileSync(new URL(`${name}.json`, PHOTON_FIXTURES), 'utf8')
}

/**
 * Proveedor de búsqueda simulado (design.md de roadmap-planning, D9): responde a las direcciones
 * del buscador real con las respuestas grabadas, sin tocar la instancia pública.
 */
export async function simulatePlaceSearch(page: Page) {
  await page.route(`${PLACE_SEARCH_SERVER}/**`, (route) => {
    const url = new URL(route.request().url())
    const fixture =
      url.pathname === '/reverse'
        ? 'reverse-cachi'
        : url.searchParams.get('q') === 'Cachi'
          ? 'search-cachi'
          : 'search-no-match'
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: photonFixture(fixture),
    })
  })
}
