import { devices, expect, type Page, test } from '@playwright/test'
import { givenSignedInRider, signInWithGoogle } from './support/cuenta.ts'
import {
  mapLocator,
  readMapNumber,
  waitForMapToSettle,
} from './support/mapa.ts'
import { simulatePlaceSearch, simulateRouting } from './support/proveedores.ts'

const editor = (page: Page) =>
  page.getByRole('dialog', { name: 'Nuevo Roadmap' })
const picker = (page: Page) =>
  page.getByRole('region', { name: 'Elegir un Point' })
const legSummaries = (page: Page) => page.locator('.leg-summary')

/** Agrega un Point buscando `query` y eligiendo, entre las coincidencias de la fixture, la que contiene `match`. */
async function addPoint(
  page: Page,
  query: string,
  match: string,
  insertButton = 'Agregar Point',
) {
  await page.getByRole('button', { name: insertButton }).first().click()
  await picker(page).getByLabel('Nombre del lugar').fill(query)
  await picker(page).getByRole('button', { name: 'Buscar' }).click()
  await picker(page)
    .getByRole('listitem')
    .filter({ hasText: match })
    .first()
    .getByRole('button', { name: 'Elegir' })
    .click()
}

/** Salida de todas las pruebas: la estación YPF de Chicoana. */
const departure = (page: Page) => addPoint(page, 'YPF', 'Chicoana')

async function openNewRoadmap(page: Page) {
  await givenSignedInRider(page, 'Fer')
  await page.getByRole('button', { name: 'Roadmaps' }).click()
  await page.getByRole('button', { name: 'Nuevo Roadmap' }).click()
  await expect(editor(page)).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  await simulatePlaceSearch(page)
  await simulateRouting(page)
})

test.describe('cálculo de la ruta', () => {
  test('con dos Points el camino se dibuja y cada tramo muestra distancia y tiempo, con los totales', async ({
    page,
  }) => {
    await openNewRoadmap(page)

    // Chicoana → La Merced: todo pavimento.
    await departure(page)
    await addPoint(page, 'YPF', 'La Merced')

    await expect(legSummaries(page)).toHaveCount(1)
    await expect(legSummaries(page).first()).toContainText(
      /\d+ km · \d+min · 0 m sin pavimentar/,
    )
    await expect(editor(page).getByText(/^Total:/)).toContainText(
      '0 m sin pavimentar',
    )
    await expect(page.locator('.map-marker-point')).toHaveCount(2)
    await waitForMapToSettle(page)
    await expect(mapLocator(page)).toHaveAttribute(
      'data-route-surfaces',
      'paved',
    )
  })

  test('un tramo sin camino queda señalado, los demás se mantienen, y quitar un Point lo resuelve', async ({
    page,
  }) => {
    await openNewRoadmap(page)

    await departure(page)
    await addPoint(page, 'YPF', 'La Merced')
    await addPoint(page, 'Cachi', 'Cachi Adentro')

    await expect(
      editor(page).getByText(
        'Sin camino entre estos Points: mové o quitá uno de los dos.',
      ),
    ).toBeVisible()
    await expect(legSummaries(page)).toHaveCount(1)

    await editor(page).getByRole('button', { name: 'Guardar' }).click()
    await expect(
      editor(page).getByText(/Hay un tramo sin camino/),
    ).toBeVisible()

    await editor(page).getByRole('button', { name: 'Quitar' }).last().click()

    await expect(editor(page).getByText(/Sin camino/)).toHaveCount(0)
    await expect(legSummaries(page)).toHaveCount(1)
  })

  test('sin conexión, mover un Point deja el tramo sin calcular con la explicación, y no se puede guardar', async ({
    page,
  }) => {
    await openNewRoadmap(page)
    await editor(page).getByLabel('Nombre').fill('Ida')
    await departure(page)
    await addPoint(page, 'YPF', 'La Merced')
    await expect(legSummaries(page)).toHaveCount(1)

    await page.context().setOffline(true)
    await editor(page).getByRole('button', { name: 'Bajar' }).first().click()

    await expect(legSummaries(page)).toHaveCount(0)
    await expect(
      editor(page).getByText('Calcular la ruta requiere conexión'),
    ).toBeVisible()
    await expect(
      editor(page).getByRole('button', { name: 'Guardar' }),
    ).toBeDisabled()
    await expect(
      editor(page).getByText('Guardar requiere conexión'),
    ).toBeVisible()

    await page.context().setOffline(false)

    await expect(legSummaries(page)).toHaveCount(1)
  })
})

test.describe('superficie de los tramos', () => {
  test('un Point con acceso solo sin pavimentar: el tramo llega igual, informa sus km sin pavimentar y se dibuja discontinuo', async ({
    page,
  }) => {
    await openNewRoadmap(page)

    await departure(page)
    await addPoint(page, 'Cachi', 'El Tipal')

    await expect(legSummaries(page).first()).toContainText(
      /[1-9][\d.,]* km sin pavimentar/,
    )
    await waitForMapToSettle(page)
    await expect(mapLocator(page)).toHaveAttribute(
      'data-route-surfaces',
      'compacted,paved',
    )
  })

  test('una parte sin dato de superficie se señala y se dibuja con punto y raya', async ({
    page,
  }) => {
    await openNewRoadmap(page)

    await departure(page)
    await addPoint(page, 'Cachi', 'Rosario de la Frontera')

    await expect(legSummaries(page).first()).toContainText(
      'con partes sin dato de superficie',
    )
    await expect(legSummaries(page).first()).toContainText('0 m sin pavimentar')
    await waitForMapToSettle(page)
    await expect(mapLocator(page)).toHaveAttribute(
      'data-route-surfaces',
      'paved,unknown',
    )
  })

  test('la referencia de estilos explica cada estilo de línea', async ({
    page,
  }) => {
    await openNewRoadmap(page)
    await departure(page)
    await addPoint(page, 'YPF', 'La Merced')
    await expect(legSummaries(page)).toHaveCount(1)

    await editor(page)
      .getByRole('button', { name: 'Referencia de estilos' })
      .click()

    const legend = editor(page).getByLabel('Referencia de estilos de la ruta')
    await expect(legend).toContainText('Pavimento línea continua')
    await expect(legend).toContainText('Consolidado línea discontinua')
    await expect(legend).toContainText('Suelto línea punteada')
    await expect(legend).toContainText('Sin dato punto y raya')
  })
})

/** Crea y guarda un Roadmap Chicoana → La Merced con el nombre dado, y vuelve a la lista. */
async function givenSavedRoadmap(page: Page, name: string) {
  await page.getByRole('button', { name: 'Roadmaps' }).click()
  await page.getByRole('button', { name: 'Nuevo Roadmap' }).click()
  await editor(page).getByLabel('Nombre').fill(name)
  await departure(page)
  await addPoint(page, 'YPF', 'La Merced')
  await expect(legSummaries(page)).toHaveCount(1)
  await editor(page).getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByRole('dialog', { name })).toBeVisible()
}

test.describe('lista y detalle', () => {
  test('sin Roadmaps explica qué es un Roadmap y ofrece crear el primero', async ({
    page,
  }) => {
    await givenSignedInRider(page, 'Fer')
    await page.getByRole('button', { name: 'Roadmaps' }).click()

    const list = page.getByRole('dialog', { name: 'Roadmaps' })
    await expect(
      list.getByRole('heading', { name: 'Todavía no tenés ningún Roadmap' }),
    ).toBeVisible()
    await expect(
      list.getByRole('button', { name: 'Nuevo Roadmap' }),
    ).toBeEnabled()
  })

  test('el Roadmap guardado aparece en la lista con distancia, tiempo y Points, y al abrirlo el mapa se encuadra sobre la ruta', async ({
    page,
  }) => {
    await givenSignedInRider(page, 'Fer')
    await givenSavedRoadmap(page, 'Ida a La Merced')
    await page
      .getByRole('dialog', { name: 'Ida a La Merced' })
      .getByRole('button', { name: 'Cerrar' })
      .click()

    const item = page.getByRole('button', { name: /Ida a La Merced/ })
    await expect(item).toContainText(/\d+ km · \d+min · 2 Points/)
    await item.click()

    const detail = page.getByRole('dialog', { name: 'Ida a La Merced' })
    await expect(detail.getByText(/^Total:/)).toBeVisible()
    await expect(page.locator('.map-marker-point')).toHaveCount(2)
    await waitForMapToSettle(page)
    await expect(mapLocator(page)).toHaveAttribute(
      'data-route-surfaces',
      'paved',
    )
    // Chicoana (-25.10) y La Merced (-24.96) quedan dentro de la vista.
    const latitude = await readMapNumber(page, 'data-center-latitude')
    expect(latitude).toBeGreaterThan(-25.2)
    expect(latitude).toBeLessThan(-24.9)
  })
})

test.describe('edición, borrado y duplicación', () => {
  test('un Roadmap borrado con confirmación desaparece también en una segunda sesión con la misma cuenta', async ({
    page,
    browser,
  }) => {
    const account = await givenSignedInRider(page, 'Fer')
    await givenSavedRoadmap(page, 'Para borrar')

    const detail = page.getByRole('dialog', { name: 'Para borrar' })
    await detail.getByRole('button', { name: 'Borrar' }).click()
    await page.getByRole('button', { name: 'Sí, borrar' }).click()
    await expect(
      page
        .getByRole('dialog', { name: 'Roadmaps' })
        .getByRole('button', { name: /Para borrar/ }),
    ).toHaveCount(0)

    const secondSession = await browser.newContext({
      ...devices['Pixel 7'],
      locale: 'es-AR',
    })
    const secondPage = await secondSession.newPage()
    await simulatePlaceSearch(secondPage)
    await simulateRouting(secondPage)
    await secondPage.goto('/')
    await signInWithGoogle(secondPage, account)
    await expect(secondPage.getByRole('button', { name: 'Fer' })).toBeVisible()
    await secondPage.getByRole('button', { name: 'Roadmaps' }).click()

    await expect(
      secondPage.getByRole('heading', {
        name: 'Todavía no tenés ningún Roadmap',
      }),
    ).toBeVisible()
    await secondSession.close()
  })

  test('duplicar abre un Roadmap nuevo sin fechas, listo para editar, y el original queda intacto', async ({
    page,
  }) => {
    await givenSignedInRider(page, 'Fer')
    await page.getByRole('button', { name: 'Roadmaps' }).click()
    await page.getByRole('button', { name: 'Nuevo Roadmap' }).click()
    await editor(page).getByLabel('Nombre').fill('Original')
    await departure(page)
    await addPoint(page, 'YPF', 'La Merced')
    await editor(page).getByLabel('Fecha').last().fill('2026-11-20')
    await expect(legSummaries(page)).toHaveCount(1)
    await editor(page).getByRole('button', { name: 'Guardar' }).click()
    const original = page.getByRole('dialog', { name: 'Original' })
    await expect(original.getByText(/20 nov 2026/)).toBeVisible()

    await original.getByRole('button', { name: 'Duplicar' }).click()

    const copy = page.getByRole('dialog', { name: 'Original (copia)' })
    await expect(copy).toBeVisible()
    await expect(copy.getByText(/20 nov 2026/)).toHaveCount(0)
    await expect(copy.getByText(/^Total:/)).toBeVisible()
    await copy.getByRole('button', { name: 'Editar' }).click()
    const copyEditor = page.getByRole('dialog', { name: 'Editar Roadmap' })
    await expect(copyEditor.getByLabel('Nombre')).toHaveValue(
      'Original (copia)',
    )
    await copyEditor.getByRole('button', { name: 'Cerrar' }).click()
    await copy.getByRole('button', { name: 'Cerrar' }).click()
    const list = page.getByRole('dialog', { name: 'Roadmaps' })
    await expect(list.getByRole('button', { name: /^Original/ })).toHaveCount(2)
    await expect(
      list.getByRole('button', { name: /Original \(copia\)/ }),
    ).toHaveCount(1)
  })
})

test.describe('sin conexión', () => {
  test('un Roadmap abierto antes se muestra sin red dentro de una zona descargada, con ruta y totales, y las acciones que requieren conexión quedan señaladas', async ({
    page,
  }) => {
    await page.route('https://tiles.openfreemap.org/**', (route) =>
      route.continue(),
    )
    await givenSignedInRider(page, 'Fer')
    await givenSavedRoadmap(page, 'Valle de Lerma')
    await page
      .getByRole('dialog', { name: 'Valle de Lerma' })
      .getByRole('button', { name: 'Cerrar' })
      .click()
    await page
      .getByRole('dialog', { name: 'Roadmaps' })
      .getByRole('button', { name: 'Cerrar' })
      .click()
    await page.getByRole('button', { name: 'Zonas sin conexión' }).click()
    const regions = page.getByRole('dialog', { name: 'Zonas descargadas' })
    await regions
      .getByRole('button', { name: 'Descargar la zona visible en el mapa' })
      .click()
    await regions.getByLabel('Nombre de la zona').fill('Lerma')
    await regions.getByRole('button', { name: 'Confirmar descarga' }).click()
    await expect(
      regions
        .getByRole('listitem')
        .filter({ hasText: 'Lerma' })
        .getByRole('status'),
    ).toHaveText('Disponible sin conexión', { timeout: 60_000 })
    await regions.getByRole('button', { name: 'Cerrar' }).click()
    await page.evaluate(() => navigator.serviceWorker.ready)

    await page.context().setOffline(true)
    await page.reload()
    await waitForMapToSettle(page)
    await page.getByRole('button', { name: 'Roadmaps' }).click()
    await page.getByRole('button', { name: /Valle de Lerma/ }).click()

    const detail = page.getByRole('dialog', { name: 'Valle de Lerma' })
    await expect(detail.getByText(/^Total:/)).toContainText(/\d+ km · \d+min/)
    await expect(legSummaries(page)).toHaveCount(1)
    await expect(page.locator('.map-marker-point')).toHaveCount(2)
    await waitForMapToSettle(page)
    await expect(mapLocator(page)).toHaveAttribute(
      'data-route-surfaces',
      'paved',
    )
    for (const name of ['Editar', 'Duplicar', 'Borrar']) {
      await expect(detail.getByRole('button', { name })).toBeDisabled()
    }
    await expect(detail.getByText('Requiere conexión').first()).toBeVisible()
  })
})
