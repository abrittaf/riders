import { expect, test } from '@playwright/test'

test('la app, ya cargada una vez, abre completa sin red', async ({
  page,
  context,
}) => {
  await page.goto('/')
  await page.evaluate(() => navigator.serviceWorker.ready)

  await context.setOffline(true)
  await page.reload()

  await expect(page.getByRole('heading', { name: 'Riders' })).toBeVisible()
  await page.getByRole('button', { name: 'Opciones' }).click()
  await expect(page.getByLabel('Idioma')).toBeVisible()
})

test('la primera apertura sin conexión explica que hace falta conectarse', async ({
  page,
}) => {
  // Sin red ni caché: llega el documento, pero ningún recurso de la app puede cargarse.
  await page.route('**/*', (route) =>
    route.request().resourceType() === 'document'
      ? route.continue()
      : route.abort('internetdisconnected'),
  )

  await page.goto('/')

  await expect(
    page.getByRole('heading', {
      name: 'Riders necesita conexión la primera vez',
    }),
  ).toBeVisible()
  await expect(
    page.getByText('Después de esa primera apertura, Riders va a abrir'),
  ).toBeVisible()
})

test('el aviso de primera apertura no aparece cuando la app carga bien', async ({
  page,
}) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Riders' })).toBeVisible()
  await expect(page.locator('#first-open-offline')).toBeHidden()
})
