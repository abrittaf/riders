import { expect, type Page } from '@playwright/test'
import { emulatorConfig } from '../../src/backend/emulator-config.ts'

const authEmulator = `http://${emulatorConfig.host}:${emulatorConfig.authPort}`
const firestoreEmulator = `http://${emulatorConfig.host}:${emulatorConfig.firestorePort}`
const ownerHeaders = { Authorization: 'Bearer owner' }

export interface GoogleTestAccount {
  email: string
  name: string
}

/** Una cuenta distinta por prueba: el emulador conserva las cuentas durante toda la corrida. */
export function newGoogleAccount(name: string): GoogleTestAccount {
  const suffix = Math.random().toString(36).slice(2, 8)
  return { email: `${name.toLowerCase()}-${suffix}@example.com`, name }
}

/** Recorre el ingreso con Google como lo hace un Rider, con la pantalla de cuentas del emulador. */
export async function signInWithGoogle(page: Page, account: GoogleTestAccount) {
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click()
  await page.waitForURL(/\/emulator\/auth\/handler/)
  const knownAccount = page.locator('.js-reuse-account', {
    hasText: account.email,
  })
  if ((await knownAccount.count()) > 0) {
    await knownAccount.first().click()
  } else {
    await page.locator('#add-account-button').click()
    await page.locator('#email-input').fill(account.email)
    await page.locator('#display-name-input').fill(account.name)
    await page.getByRole('button', { name: /sign in with google/i }).click()
  }
  await page.waitForURL(/localhost:4173/)
}

export async function findAccountId(
  account: GoogleTestAccount,
): Promise<string> {
  const response = await fetch(
    `${authEmulator}/identitytoolkit.googleapis.com/v1/projects/${emulatorConfig.projectId}/accounts:lookup`,
    {
      method: 'POST',
      headers: { ...ownerHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: [account.email] }),
    },
  )
  const body = (await response.json()) as { users?: { localId: string }[] }
  const id = body.users?.[0]?.localId
  expect(id, `cuenta ${account.email} en el emulador`).toBeTruthy()
  return id!
}

/** Deja el perfil del Rider guardado, como si ya lo hubiera completado. */
export async function givenCompletedProfile(
  account: GoogleTestAccount,
  displayName: string,
) {
  const id = await findAccountId(account)
  const now = new Date().toISOString()
  const response = await fetch(
    `${firestoreEmulator}/v1/projects/${emulatorConfig.projectId}/databases/(default)/documents/riders/${id}`,
    {
      method: 'PATCH',
      headers: { ...ownerHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          displayName: { stringValue: displayName },
          avatar: {
            mapValue: {
              fields: {
                helmetType: { stringValue: 'full-face' },
                helmetColor: { stringValue: 'white' },
                neckwear: { stringValue: 'bandana' },
                neckwearColor: { stringValue: 'blue' },
                glasses: { booleanValue: false },
                beard: { booleanValue: true },
              },
            },
          },
          createdAt: { timestampValue: now },
          updatedAt: { timestampValue: now },
        },
      }),
    },
  )
  expect(response.ok, 'perfil guardado en el emulador').toBe(true)
}
