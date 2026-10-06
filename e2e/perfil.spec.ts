import { type Browser, expect, type Page, test } from '@playwright/test'
import { newGoogleAccount, signInWithGoogle } from './support/cuenta.ts'

const setupDialog = (page: Page) =>
  page.getByRole('dialog', { name: 'Completá tu perfil' })

async function fillProfile(
  page: Page,
  values: { displayName: string; model: string; rangeKm: string },
) {
  const dialog = setupDialog(page)
  await dialog.getByLabel('Nombre visible').fill(values.displayName)
  await dialog.getByLabel('Marca y modelo de la moto').fill(values.model)
  await dialog.getByLabel('Autonomía (km por tanque)').fill(values.rangeKm)
}

test('el perfil incompleto se retoma al reabrir con lo cargado, y al completarlo se vuelve al mapa identificado', async ({
  page,
}) => {
  const account = newGoogleAccount('Fernando')
  await page.goto('/')
  await signInWithGoogle(page, account)
  await expect(setupDialog(page).getByLabel('Nombre visible')).toHaveValue(
    'Fernando',
  )
  await fillProfile(page, {
    displayName: 'Fer',
    model: 'Honda XR 250',
    rangeKm: '',
  })
  await setupDialog(page).getByLabel('Rebatible').check()

  await page.reload()

  const dialog = setupDialog(page)
  await expect(dialog.getByLabel('Nombre visible')).toHaveValue('Fer')
  await expect(dialog.getByLabel('Marca y modelo de la moto')).toHaveValue(
    'Honda XR 250',
  )
  await expect(dialog.getByLabel('Rebatible')).toBeChecked()

  await dialog.getByLabel('Autonomía (km por tanque)').fill('300')
  await dialog.getByRole('button', { name: 'Guardar y seguir' }).click()

  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Fer' })).toBeVisible()
  await expect(page.getByTestId('map')).toBeVisible()
})

test('un cambio en el perfil se refleja en una segunda sesión con la misma cuenta', async ({
  page,
  browser,
}) => {
  const account = newGoogleAccount('Ana')
  await page.goto('/')
  await signInWithGoogle(page, account)
  await fillProfile(page, {
    displayName: 'Ana',
    model: 'BMW GS 310',
    rangeKm: '400',
  })
  await setupDialog(page)
    .getByRole('button', { name: 'Guardar y seguir' })
    .click()
  await expect(page.getByRole('button', { name: 'Ana' })).toBeVisible()

  const other = await openSecondSession(browser, account)
  await other.getByRole('button', { name: 'Ana' }).click()
  await expect(other.getByText('400 km')).toBeVisible()

  await page.getByRole('button', { name: 'Ana' }).click()
  const panel = page.getByRole('dialog', { name: 'Tu cuenta' })
  await panel.getByRole('button', { name: 'Editar perfil' }).click()
  await panel.getByLabel('Nombre visible').fill('Anita')
  await panel.getByLabel('Autonomía (km por tanque)').fill('450')
  await panel.getByRole('button', { name: 'Guardar' }).click()
  await expect(panel.getByText('450 km')).toBeVisible()

  await expect(other.getByText('450 km')).toBeVisible()
  await other
    .getByRole('dialog', { name: 'Tu cuenta' })
    .getByRole('button', { name: 'Cerrar', exact: true })
    .click()
  await expect(other.getByRole('button', { name: 'Anita' })).toBeVisible()
  await other.context().close()
})

async function openSecondSession(
  browser: Browser,
  account: { email: string; name: string },
) {
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.goto('/')
  await signInWithGoogle(page, account)
  return page
}
