import { expect, test } from '@playwright/test'

test('cambiar el idioma traduce la interfaz sin recargar y la elección persiste al reabrir', async ({
  page,
}) => {
  await page.goto('/')
  await page.evaluate(() => {
    ;(window as Window & { sinRecarga?: boolean }).sinRecarga = true
  })

  await page.getByRole('button', { name: 'Opciones' }).click()
  await page.getByLabel('Idioma').selectOption('en')

  await expect(page.getByRole('dialog', { name: 'Options' })).toBeVisible()
  await expect(page.getByLabel('Language')).toHaveValue('en')
  await expect(page.getByRole('button', { name: 'Close' })).toBeVisible()
  await expect(page.getByText('Opciones')).toHaveCount(0)
  await expect(page.getByText('Idioma')).toHaveCount(0)
  expect(
    await page.evaluate(
      () => (window as Window & { sinRecarga?: boolean }).sinRecarga,
    ),
  ).toBe(true)

  await page.reload()

  await expect(page.getByRole('button', { name: 'Options' })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
})

test.describe('con el celular en un idioma no soportado', () => {
  test.use({ locale: 'fr-FR' })

  test('la interfaz aparece en español (Argentina)', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('button', { name: 'Opciones' })).toBeVisible()
  })
})
