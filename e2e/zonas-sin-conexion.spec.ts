import { expect, type Page, test } from '@playwright/test'
import {
  BUENOS_AIRES,
  mapLocator,
  openMapAt,
  readMapNumber,
  waitForMapToSettle,
} from './support/mapa.ts'

const CACHI = { latitude: -25.12, longitude: -66.165 }
const UNAVAILABLE_NOTICE = 'Esta zona del mapa no está disponible sin conexión.'

// Con el enrutamiento de peticiones activo, Playwright desactiva la caché HTTP del navegador:
// sin red, lo único que queda del mapa es lo que la app guardó en el celular.
test.beforeEach(async ({ page }) => {
  await page.route('https://tiles.openfreemap.org/**', (route) =>
    route.continue(),
  )
})

async function openRegionsPanel(page: Page) {
  await page.getByRole('button', { name: 'Zonas sin conexión' }).click()
  return page.getByRole('dialog', { name: 'Zonas descargadas' })
}

async function downloadVisibleRegion(page: Page, name: string) {
  const panel = await openRegionsPanel(page)
  await panel
    .getByRole('button', { name: 'Descargar la zona visible en el mapa' })
    .click()
  await expect(panel.getByText(/Tamaño estimado: /)).toBeVisible()
  await panel.getByLabel('Nombre de la zona').fill(name)
  await panel.getByRole('button', { name: 'Confirmar descarga' }).click()
  await expect(
    panel.getByRole('listitem').filter({ hasText: name }).getByRole('status'),
  ).toHaveText('Disponible sin conexión', { timeout: 60_000 })
  return panel
}

async function reopenWithoutNetwork(page: Page) {
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.context().setOffline(true)
  await page.reload()
  await waitForMapToSettle(page)
}

test('tras descargar una zona y cortar la red, el mapa se dibuja completo dentro de ella y vacío con aviso fuera de ella', async ({
  page,
}) => {
  await openMapAt(page, { zoom: 14, ...CACHI })
  const roadsWithNetwork = await readMapNumber(page, 'data-rendered-roads')
  const panel = await downloadVisibleRegion(page, 'Cachi')
  await panel.getByRole('button', { name: 'Cerrar' }).click()

  await reopenWithoutNetwork(page)

  await expect(page.getByText('Sin conexión', { exact: true })).toBeVisible()
  // El conteo se lee cuando el mapa queda quieto, pero puede faltarle el último dibujado: se reintenta.
  await expect
    .poll(() => readMapNumber(page, 'data-rendered-roads'))
    .toBe(roadsWithNetwork)
  await expect
    .poll(() => readMapNumber(page, 'data-rendered-place-names'))
    .toBeGreaterThan(0)
  await expect(page.getByText(UNAVAILABLE_NOTICE)).toHaveCount(0)

  await openMapAt(page, { zoom: 14, ...BUENOS_AIRES })

  await expect(page.getByText(UNAVAILABLE_NOTICE)).toBeVisible()
  expect(await readMapNumber(page, 'data-rendered-road-names')).toBe(0)

  // El resto del mapa sigue respondiendo: al volver a la zona descargada, el aviso desaparece.
  await openMapAt(page, { zoom: 14, ...CACHI })
  await expect(page.getByText(UNAVAILABLE_NOTICE)).toHaveCount(0)
  await expect
    .poll(() => readMapNumber(page, 'data-rendered-roads'))
    .toBe(roadsWithNetwork)
})

test('al recuperar la conectividad el mapa completa la zona que no estaba disponible', async ({
  page,
  context,
}) => {
  await openMapAt(page, { zoom: 14, ...CACHI })
  await page.evaluate(() => navigator.serviceWorker.ready)
  await context.setOffline(true)
  await openMapAt(page, { zoom: 14, ...BUENOS_AIRES })
  await expect(page.getByText(UNAVAILABLE_NOTICE)).toBeVisible()

  await context.setOffline(false)

  await expect(page.getByText(UNAVAILABLE_NOTICE)).toHaveCount(0)
  await expect
    .poll(() => readMapNumber(page, 'data-rendered-roads'))
    .toBeGreaterThan(0)
})

test('sin zonas descargadas, la lista explica para qué sirve descargarlas y cómo hacerlo', async ({
  page,
}) => {
  await openMapAt(page, { zoom: 14, ...CACHI })

  const panel = await openRegionsPanel(page)

  await expect(
    panel.getByRole('heading', { name: 'Todavía no descargaste ninguna zona' }),
  ).toBeVisible()
  await expect(
    panel.getByText('te permite ver su mapa cuando no tenés conexión'),
  ).toBeVisible()
  await expect(panel.getByRole('listitem')).toHaveCount(0)
})

test('al borrar una zona desaparece de la lista, se libera su espacio y su mapa deja de estar disponible sin conexión', async ({
  page,
}) => {
  await openMapAt(page, { zoom: 14, ...CACHI })
  const panel = await downloadVisibleRegion(page, 'Cachi')
  const zone = panel.getByRole('listitem').filter({ hasText: 'Cachi' })
  await expect(zone).toContainText('descargada el')
  await expect(panel.getByText(/Tus zonas ocupan 0\sMB\./)).toHaveCount(0)

  await zone.getByRole('button', { name: 'Borrar' }).click()
  await zone.getByRole('button', { name: 'Sí, borrar' }).click()

  await expect(panel.getByRole('listitem')).toHaveCount(0)
  await expect(panel.getByText(/Tus zonas ocupan 0\sMB\./)).toBeVisible()
  await expect(
    panel.getByRole('heading', { name: 'Todavía no descargaste ninguna zona' }),
  ).toBeVisible()
  await panel.getByRole('button', { name: 'Cerrar' }).click()

  await reopenWithoutNetwork(page)

  await expect(page.getByText(UNAVAILABLE_NOTICE)).toBeVisible()
  await expect(mapLocator(page)).toHaveAttribute('data-rendered-roads', '0')
})
