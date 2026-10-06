import { expect, type Page, test } from '@playwright/test'
import {
  findAccountId,
  newGoogleAccount,
  readStoredDisplayName,
  signInWithGoogle,
} from './support/cuenta.ts'

async function signInAndCompleteProfile(page: Page, displayName: string) {
  const account = newGoogleAccount(displayName)
  await page.goto('/')
  await signInWithGoogle(page, account)
  const dialog = page.getByRole('dialog', { name: 'Completá tu perfil' })
  await dialog.getByLabel('Nombre visible').fill(displayName)
  await dialog.getByLabel('Marca y modelo de la moto').fill('Honda XR 250')
  await dialog.getByLabel('Autonomía (km por tanque)').fill('300')
  await dialog.getByRole('button', { name: 'Guardar y seguir' }).click()
  await expect(page.getByRole('button', { name: displayName })).toBeVisible()
  return account
}

test('un cambio de nombre hecho sin red se ve de inmediato, queda pendiente y se envía al restaurar la red', async ({
  page,
  context,
}) => {
  const account = await signInAndCompleteProfile(page, 'Fer')
  const riderId = await findAccountId(account)
  await page.getByRole('button', { name: 'Fer' }).click()
  const panel = page.getByRole('dialog', { name: 'Tu cuenta' })

  await context.setOffline(true)
  await panel.getByRole('button', { name: 'Editar perfil' }).click()
  await panel.getByLabel('Nombre visible').fill('Fernando')
  await panel.getByRole('button', { name: 'Guardar' }).click()

  await expect(panel.getByText('Fernando', { exact: true })).toBeVisible()
  await expect(panel.getByRole('status')).toContainText(
    'Pendiente de sincronizar',
  )
  expect(await readStoredDisplayName(riderId)).toBe('Fer')

  await context.setOffline(false)

  await expect(panel.getByRole('status')).toHaveCount(0, { timeout: 30_000 })
  await expect.poll(() => readStoredDisplayName(riderId)).toBe('Fernando')
})

test('tras eliminar la cuenta, un nuevo ingreso con la misma cuenta de Google se trata como primer ingreso', async ({
  page,
}) => {
  const account = await signInAndCompleteProfile(page, 'Ana')
  const riderId = await findAccountId(account)
  await page.getByRole('button', { name: 'Ana' }).click()
  const panel = page.getByRole('dialog', { name: 'Tu cuenta' })

  await panel.getByRole('button', { name: 'Eliminar mi cuenta' }).click()
  await panel.getByRole('button', { name: 'Sí, eliminar mi cuenta' }).click()

  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: 'Ingresar', exact: true }),
  ).toBeVisible()
  expect(await readStoredDisplayName(riderId)).toBeNull()

  await signInWithGoogle(page, account)

  await expect(
    page.getByRole('dialog', { name: 'Completá tu perfil' }),
  ).toBeVisible()
  await expect(
    page.getByRole('dialog').getByLabel('Nombre visible'),
  ).toHaveValue('Ana')
})
