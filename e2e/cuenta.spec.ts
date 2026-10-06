import { expect, test } from '@playwright/test'
import {
  givenCompletedProfile,
  newGoogleAccount,
  signInWithGoogle,
} from './support/cuenta.ts'
import { mapLocator } from './support/mapa.ts'

test('sin cuenta, el mapa, la posición propia y las zonas descargadas funcionan y la acción de ingresar está visible', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['geolocation'])
  await context.setGeolocation({ latitude: -34.6037, longitude: -58.3816 })
  await page.goto('/')

  await expect(mapLocator(page)).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Ingresar', exact: true }),
  ).toBeVisible()
  // Con el permiso ya concedido, la app muestra la posición sin que haya que pedirla.
  await expect(
    page.getByRole('button', { name: 'Centrar en mi posición' }),
  ).toBeEnabled()
  await page.getByRole('button', { name: 'Zonas sin conexión' }).click()
  await expect(
    page.getByRole('dialog', { name: 'Zonas descargadas' }),
  ).toBeVisible()
})

test('si el ingreso falla al volver de Google, la app avisa, queda sin sesión y permite reintentar', async ({
  page,
}) => {
  // El intercambio final con el servidor de identidad falla: el ingreso no se completa.
  await page.route('**/accounts:signInWithIdp*', (route) => route.abort())
  await page.goto('/')

  await signInWithGoogle(page, newGoogleAccount('Fallido'))

  await expect(page.getByRole('alert')).toContainText(
    'El ingreso no se completó. Podés volver a intentarlo.',
  )
  await expect(
    page.getByRole('button', { name: 'Ingresar', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Volver a ingresar' }),
  ).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('sin conectividad, ingresar queda señalado como no disponible y explica que requiere conexión', async ({
  page,
  context,
}) => {
  await page.goto('/')
  await expect(
    page.getByRole('button', { name: 'Ingresar', exact: true }),
  ).toBeEnabled()

  await context.setOffline(true)

  await expect(
    page.getByRole('button', { name: 'Ingresar', exact: true }),
  ).toBeDisabled()
  await expect(page.getByText('Ingresar requiere conexión')).toBeVisible()
})

test('tras cerrar sesión la app vuelve al estado sin cuenta y al reingresar el perfil está intacto', async ({
  page,
}) => {
  const account = newGoogleAccount('Fernando')
  await page.goto('/')
  await signInWithGoogle(page, account)
  await expect(
    page.getByRole('dialog', { name: 'Completá tu perfil' }),
  ).toBeVisible()
  await givenCompletedProfile(account, 'Fer')
  await expect(page.getByRole('button', { name: 'Fer' })).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)

  await page.getByRole('button', { name: 'Fer' }).click()
  await page.getByRole('button', { name: 'Cerrar sesión' }).click()

  await expect(
    page.getByRole('button', { name: 'Ingresar', exact: true }),
  ).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)

  await signInWithGoogle(page, account)

  await expect(page.getByRole('button', { name: 'Fer' })).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})
