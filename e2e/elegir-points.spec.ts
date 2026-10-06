import { expect, type Page, test } from '@playwright/test'
import { givenSignedInRider } from './support/cuenta.ts'
import {
  BUENOS_AIRES,
  mapLocator,
  openMapAt,
  waitForMapToSettle,
} from './support/mapa.ts'
import { simulatePlaceSearch } from './support/proveedores.ts'

const picker = (page: Page) =>
  page.getByRole('region', { name: 'Elegir un Point' })
const pointSequence = (page: Page) =>
  page.getByRole('list', { name: 'Points del Roadmap' })

async function openPointPicker(page: Page) {
  await page.getByRole('button', { name: 'Roadmaps' }).click()
  await page.getByRole('button', { name: 'Agregar Point' }).click()
  await expect(picker(page)).toBeVisible()
}

async function longPressMapCenter(page: Page) {
  const box = (await mapLocator(page).boundingBox())!
  // El tercio superior del mapa queda libre de la hoja de edición.
  const point = { x: box.x + box.width / 2, y: box.y + box.height / 4 }
  const touch = await page.context().newCDPSession(page)
  await touch.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ ...point, id: 1 }],
  })
  await page.waitForTimeout(700)
  await touch.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  })
}

test.beforeEach(async ({ page }) => {
  await simulatePlaceSearch(page)
})

test.describe('buscar por nombre', () => {
  test('con conexión lista las coincidencias con tipo, localidad y distancia, y la elegida queda como Point', async ({
    page,
  }) => {
    await givenSignedInRider(page, 'Fer')
    await openPointPicker(page)

    await picker(page).getByLabel('Nombre del lugar').fill('Cachi')
    await picker(page).getByRole('button', { name: 'Buscar' }).click()

    const items = picker(page).getByRole('listitem')
    await expect(items).toHaveCount(5)
    await expect(items.filter({ hasText: 'Cachi Adentro' })).toContainText(
      /Cachi · [\d.,]+\skm/,
    )
    await items.filter({ hasText: 'Cachi Adentro' }).getByRole('button').click()

    await expect(pointSequence(page)).toContainText('Cachi Adentro')
  })

  test('sin coincidencias lo indica y sugiere tocar el mapa', async ({
    page,
  }) => {
    await givenSignedInRider(page, 'Fer')
    await openPointPicker(page)

    await picker(page).getByLabel('Nombre del lugar').fill('xqzvwyjk')
    await picker(page).getByRole('button', { name: 'Buscar' }).click()

    await expect(picker(page).getByRole('status')).toHaveText(
      /No encontramos ningún lugar con ese nombre. Mantené el dedo sobre el mapa/,
    )
  })

  test('sin conexión la búsqueda está señalada como no disponible y las otras formas siguen ofrecidas', async ({
    page,
  }) => {
    await givenSignedInRider(page, 'Fer')
    await openPointPicker(page)

    await page.context().setOffline(true)

    await expect(picker(page).getByLabel('Nombre del lugar')).toBeDisabled()
    await expect(
      picker(page).getByText('La búsqueda por nombre requiere conexión'),
    ).toBeVisible()
    await expect(
      picker(page).getByRole('tab', { name: 'Lugares por tipo' }),
    ).toBeEnabled()
    await expect(
      picker(page).getByText(/mantener el dedo sobre el mapa/),
    ).toBeVisible()
  })
})

test.describe('elegir por tipo', () => {
  test('lista las estaciones de servicio visibles, las resalta en el mapa y la elegida conserva el tipo', async ({
    page,
  }) => {
    await givenSignedInRider(page, 'Fer')
    await openMapAt(page, { zoom: 14, ...BUENOS_AIRES })
    await openPointPicker(page)

    await picker(page).getByRole('tab', { name: 'Lugares por tipo' }).click()
    await picker(page)
      .getByRole('button', { name: 'Estación de servicio' })
      .click()

    const items = picker(page).getByRole('listitem')
    await expect(items.first()).toContainText(
      /Estación de servicio · [\d.,]+\s(m|km)/,
    )
    const shown = await items.count()
    await expect(page.locator('.map-marker-highlighted-place')).toHaveCount(
      shown,
    )

    await items.first().getByRole('button', { name: 'Elegir' }).click()

    await expect(pointSequence(page)).toContainText('Estación de servicio')
    await expect(page.locator('.map-marker-highlighted-place')).toHaveCount(0)
  })

  test('sin lugares del tipo en la vista sugiere alejar el mapa', async ({
    page,
  }) => {
    await givenSignedInRider(page, 'Fer')
    // Zoom alejado: las teselas de ese nivel no traen lugares.
    await openMapAt(page, { zoom: 5, ...BUENOS_AIRES })
    await openPointPicker(page)

    await picker(page).getByRole('tab', { name: 'Lugares por tipo' }).click()
    await picker(page).getByRole('button', { name: 'Alojamiento' }).click()

    await expect(picker(page).getByRole('status')).toHaveText(
      'No hay alojamientos en la zona visible. Alejá el mapa o desplazalo.',
    )
  })

  test('sin red, dentro de una zona descargada, lista los lugares igual que con conexión', async ({
    page,
  }) => {
    await page.route('https://tiles.openfreemap.org/**', (route) =>
      route.continue(),
    )
    await givenSignedInRider(page, 'Fer')
    await openMapAt(page, { zoom: 14, ...BUENOS_AIRES })
    await page.getByRole('button', { name: 'Zonas sin conexión' }).click()
    const regions = page.getByRole('dialog', { name: 'Zonas descargadas' })
    await regions
      .getByRole('button', { name: 'Descargar la zona visible en el mapa' })
      .click()
    await regions.getByLabel('Nombre de la zona').fill('Centro')
    await regions.getByRole('button', { name: 'Confirmar descarga' }).click()
    await expect(
      regions
        .getByRole('listitem')
        .filter({ hasText: 'Centro' })
        .getByRole('status'),
    ).toHaveText('Disponible sin conexión', { timeout: 60_000 })
    await regions.getByRole('button', { name: 'Cerrar' }).click()
    await page.evaluate(() => navigator.serviceWorker.ready)

    await page.context().setOffline(true)
    await page.reload()
    await waitForMapToSettle(page)
    await openPointPicker(page)
    await picker(page).getByRole('tab', { name: 'Lugares por tipo' }).click()
    await picker(page)
      .getByRole('button', { name: 'Estación de servicio' })
      .click()

    await expect(picker(page).getByRole('listitem').first()).toContainText(
      'Estación de servicio',
    )
  })
})

test.describe('posición con toque sostenido', () => {
  test('con conexión propone el nombre del lugar más cercano y se puede cambiar antes de confirmar', async ({
    page,
  }) => {
    await givenSignedInRider(page, 'Fer')
    await openMapAt(page, { zoom: 12, ...BUENOS_AIRES })
    await openPointPicker(page)

    await longPressMapCenter(page)

    const nameField = page.getByLabel('Nombre del Point')
    await expect(nameField).toHaveValue('Sarmiento')
    await nameField.fill('Punto de encuentro')
    await page.getByRole('button', { name: 'Confirmar' }).click()

    await expect(pointSequence(page)).toContainText('Punto de encuentro')
  })

  test('sin conexión propone las coordenadas como nombre', async ({ page }) => {
    await givenSignedInRider(page, 'Fer')
    await openMapAt(page, { zoom: 12, ...BUENOS_AIRES })
    await openPointPicker(page)
    await page.context().setOffline(true)

    await longPressMapCenter(page)

    await expect(page.getByLabel('Nombre del Point')).toHaveValue(
      /^-3\d,\d{4}, -5\d,\d{4}$/,
    )
    await page.getByRole('button', { name: 'Confirmar' }).click()

    await expect(pointSequence(page)).toContainText(/-3\d,\d{4}, -5\d,\d{4}/)
  })
})
