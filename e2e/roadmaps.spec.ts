import { expect, type Page, test } from '@playwright/test'
import { givenSignedInRider } from './support/cuenta.ts'
import { mapLocator, waitForMapToSettle } from './support/mapa.ts'
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
