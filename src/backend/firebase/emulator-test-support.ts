import { deleteApp, initializeApp } from 'firebase/app'
import {
  type Auth,
  connectAuthEmulator,
  GoogleAuthProvider,
  initializeAuth,
  inMemoryPersistence,
  signInWithCredential,
} from 'firebase/auth'
import {
  connectFirestoreEmulator,
  type Firestore,
  getFirestore,
} from 'firebase/firestore'
import { emulatorConfig } from '../emulator-config.ts'

const authEmulatorUrl = `http://${emulatorConfig.host}:${emulatorConfig.authPort}`
const projectPath = `projects/${emulatorConfig.projectId}`

/** Clientes de Authentication y Firestore conectados al emulador, sin persistencia entre pruebas. */
export function createEmulatedClients(): {
  auth: Auth
  firestore: Firestore
  dispose: () => Promise<void>
} {
  const app = initializeApp(
    { apiKey: 'demo-api-key', projectId: emulatorConfig.projectId },
    `prueba-${crypto.randomUUID()}`,
  )
  const auth = initializeAuth(app, { persistence: inMemoryPersistence })
  connectAuthEmulator(auth, authEmulatorUrl, { disableWarnings: true })
  const firestore = getFirestore(app)
  connectFirestoreEmulator(
    firestore,
    emulatorConfig.host,
    emulatorConfig.firestorePort,
  )
  return { auth, firestore, dispose: () => deleteApp(app) }
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
  await fetch(`${authEmulatorUrl}/emulator/v1/${projectPath}/accounts`, {
    method: 'DELETE',
  })
}

export async function listEmulatedAccounts(): Promise<{ localId: string }[]> {
  // La API de administración, que el emulador acepta con el token fijo `owner`.
  const response = await fetch(
    `${authEmulatorUrl}/identitytoolkit.googleapis.com/v1/${projectPath}/accounts:batchGet`,
    { headers: { Authorization: 'Bearer owner' } },
  )
  const body = (await response.json()) as { users?: { localId: string }[] }
  return body.users ?? []
}
