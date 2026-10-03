import { expect, type Locator, type Page } from '@playwright/test'

export const BUENOS_AIRES = { latitude: -34.6037, longitude: -58.3816 }

export function mapLocator(page: Page): Locator {
  return page.getByTestId('map')
}

export async function openMapAt(
  page: Page,
  view: { zoom: number; latitude: number; longitude: number },
) {
  await page.goto(`/#${view.zoom}/${view.latitude}/${view.longitude}`)
  await waitForMapToSettle(page)
}

/** Espera a que el mapa termine de moverse y de dibujar lo que tenga disponible. */
export async function waitForMapToSettle(page: Page) {
  await expect(mapLocator(page)).toBeVisible()
  await expect(mapLocator(page)).toHaveAttribute('data-map-idle', 'true', {
    timeout: 30_000,
  })
}

export async function readMapNumber(
  page: Page,
  attribute:
    | 'data-rendered-roads'
    | 'data-rendered-road-names'
    | 'data-rendered-place-names'
    | 'data-zoom'
    | 'data-center-latitude'
    | 'data-center-longitude',
): Promise<number> {
  return Number(await mapLocator(page).getAttribute(attribute))
}
