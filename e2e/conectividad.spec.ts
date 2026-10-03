import { expect, test } from '@playwright/test'

test('el indicador aparece al cortar la red y desaparece al restaurarla sin recargar', async ({
  page,
  context,
}) => {
  await page.goto('/')
  await page.evaluate(() => {
    ;(window as Window & { sinRecarga?: boolean }).sinRecarga = true
  })
  const indicator = page.getByText('Sin conexión', { exact: true })
  await expect(indicator).toHaveCount(0)

  await context.setOffline(true)
  await expect(indicator).toBeVisible()

  await context.setOffline(false)
  await expect(indicator).toHaveCount(0)
  expect(
    await page.evaluate(
      () => (window as Window & { sinRecarga?: boolean }).sinRecarga,
    ),
  ).toBe(true)
})

test('sin conexión, las acciones que la necesitan quedan señaladas como no disponibles y el resto sigue usable', async ({
  page,
  context,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Zonas sin conexión' }).click()
  const download = page.getByRole('button', {
    name: 'Descargar la zona visible en el mapa',
  })
  await expect(download).toBeEnabled()

  await context.setOffline(true)

  await expect(download).toBeDisabled()
  await expect(page.getByText('No disponible sin conexión')).toBeVisible()
  await page.getByRole('button', { name: 'Cerrar' }).click()
  await page.getByRole('button', { name: 'Opciones' }).click()
  await expect(page.getByLabel('Idioma')).toBeEnabled()
  await page.getByRole('button', { name: 'Cerrar' }).click()

  await context.setOffline(false)

  await page.getByRole('button', { name: 'Zonas sin conexión' }).click()
  await expect(download).toBeEnabled()
  await expect(page.getByText('No disponible sin conexión')).toHaveCount(0)
})
