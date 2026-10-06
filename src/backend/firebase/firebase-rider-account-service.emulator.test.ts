import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  createEmulatedAuth,
  deleteAllEmulatedAccounts,
  listEmulatedAccounts,
  signInWithGoogleAccount,
} from './emulator-test-support.ts'
import { FirebaseRiderAccountService } from './firebase-rider-account-service.ts'

describe('FirebaseRiderAccountService contra el emulador', () => {
  let emulated: ReturnType<typeof createEmulatedAuth>

  beforeEach(async () => {
    await deleteAllEmulatedAccounts()
    emulated = createEmulatedAuth()
  })

  afterEach(() => emulated.dispose())

  it('al ingresar con una cuenta de Google crea el usuario en el emulador y la sesión lo identifica', async () => {
    const service = new FirebaseRiderAccountService(emulated.auth)
    const sessionChanges: string[] = []
    service.subscribe(() =>
      sessionChanges.push(service.currentSession().status),
    )

    await signInWithGoogleAccount(emulated.auth, {
      sub: 'google-123',
      email: 'fernando@example.com',
      name: 'Fernando Pérez',
    })
    await waitFor(() => service.currentSession().status === 'signed-in')

    const session = service.currentSession()
    if (session.status !== 'signed-in') throw new Error('sin sesión')
    expect(session.rider.accountName).toBe('Fernando Pérez')
    const accounts = await listEmulatedAccounts()
    expect(accounts).toHaveLength(1)
    expect(accounts[0]?.localId).toBe(session.rider.id)
    expect(sessionChanges).toContain('signed-in')
  })

  it('al cerrar sesión la sesión queda sin cuenta y el usuario sigue existiendo', async () => {
    const service = new FirebaseRiderAccountService(emulated.auth)
    await signInWithGoogleAccount(emulated.auth, {
      sub: 'google-123',
      email: 'fernando@example.com',
      name: 'Fernando Pérez',
    })
    await waitFor(() => service.currentSession().status === 'signed-in')

    await service.signOut()
    await waitFor(() => service.currentSession().status === 'signed-out')

    expect(await listEmulatedAccounts()).toHaveLength(1)
  })
})

async function waitFor(condition: () => boolean): Promise<void> {
  const deadline = Date.now() + 5000
  while (!condition()) {
    if (Date.now() > deadline) throw new Error('condición no alcanzada')
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
}
