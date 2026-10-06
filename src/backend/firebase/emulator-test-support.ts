import { deleteApp, initializeApp } from 'firebase/app'
import {
  type Auth,
  connectAuthEmulator,
  GoogleAuthProvider,
  initializeAuth,
  inMemoryPersistence,
  signInWithCredential,
} from 'firebase/auth'
import { emulatorConfig } from '../emulator-config.ts'

const authEmulatorUrl = `http://${emulatorConfig.host}:${emulatorConfig.authPort}`
const accountsUrl = `${authEmulatorUrl}/emulator/v1/projects/${emulatorConfig.projectId}/accounts`

/** Un cliente de Authentication conectado al emulador, sin persistencia entre pruebas. */
export function createEmulatedAuth(): {
  auth: Auth
  dispose: () => Promise<void>
} {
  const app = initializeApp(
    { apiKey: 'demo-api-key', projectId: emulatorConfig.projectId },
    `prueba-${crypto.randomUUID()}`,
  )
  const auth = initializeAuth(app, { persistence: inMemoryPersistence })
  connectAuthEmulator(auth, authEmulatorUrl, { disableWarnings: true })
  return { auth, dispose: () => deleteApp(app) }
}

/** Ingresa como lo haría Google: el emulador acepta un token con los datos de la cuenta. */
export function signInWithGoogleAccount(
  auth: Auth,
  account: { sub: string; email: string; name: string },
) {
  return signInWithCredential(
    auth,
    GoogleAuthProvider.credential(JSON.stringify(account)),
  )
}

export async function deleteAllEmulatedAccounts(): Promise<void> {
  await fetch(accountsUrl, { method: 'DELETE' })
}

export async function listEmulatedAccounts(): Promise<
  { localId: string; email?: string; displayName?: string }[]
> {
  // La API de administración, que el emulador acepta con el token fijo `owner`.
  const response = await fetch(
    `${authEmulatorUrl}/identitytoolkit.googleapis.com/v1/projects/${emulatorConfig.projectId}/accounts:batchGet`,
    { headers: { Authorization: 'Bearer owner' } },
  )
  const body = (await response.json()) as { users?: { localId: string }[] }
  return body.users ?? []
}
