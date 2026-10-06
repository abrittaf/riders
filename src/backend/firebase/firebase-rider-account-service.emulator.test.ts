import {
  doc,
  getDocFromServer,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { AvatarOptions } from '../../avatar/avatar-options.ts'
import type { RiderSession } from '../rider-account-service.ts'
import {
  createEmulatedClients,
  deleteAllEmulatedAccounts,
  listEmulatedAccounts,
  signInWithGoogleAccount,
} from './emulator-test-support.ts'
import { FirebaseRiderAccountService } from './firebase-rider-account-service.ts'

const sampleAvatar: AvatarOptions = {
  helmetType: 'full-face',
  helmetColor: 'white',
  neckwear: 'bandana',
  neckwearColor: 'blue',
  glasses: false,
  beard: true,
}

function sessionPending(service: FirebaseRiderAccountService) {
  const session = service.currentSession()
  return session.status === 'signed-in' && session.pendingSync
}

function sessionProfile(service: FirebaseRiderAccountService) {
  const session = service.currentSession()
  return session.status === 'signed-in' ? session.profile : null
}

const googleAccount = {
  sub: 'google-123',
  email: 'fernando@example.com',
  name: 'Fernando Pérez',
}

describe('FirebaseRiderAccountService contra el emulador', () => {
  let clients: ReturnType<typeof createEmulatedClients>
  let service: FirebaseRiderAccountService

  beforeEach(async () => {
    await deleteAllEmulatedAccounts()
    clients = createEmulatedClients()
    service = new FirebaseRiderAccountService(
      clients.auth,
      clients.firestore,
      new MemoryStorage(),
    )
  })

  afterEach(() => clients.dispose())

  it('al ingresar con una cuenta de Google crea el usuario en el emulador y la sesión lo identifica con perfil incompleto', async () => {
    const sessionChanges: string[] = []
    service.subscribe(() =>
      sessionChanges.push(service.currentSession().status),
    )

    await signInWithGoogleAccount(clients.auth, googleAccount)
    const session = await waitForSession(service, 'signed-in')

    expect(session.rider.accountName).toBe('Fernando Pérez')
    expect(session.profile).toBeNull()
    const accounts = await listEmulatedAccounts()
    expect(accounts).toHaveLength(1)
    expect(accounts[0]?.localId).toBe(session.rider.id)
    expect(sessionChanges).toContain('signed-in')
  })

  it('cuando el Rider guarda su perfil, la sesión pasa a tenerlo completo', async () => {
    await signInWithGoogleAccount(clients.auth, googleAccount)
    const { rider } = await waitForSession(service, 'signed-in')

    await setDoc(doc(clients.firestore, 'riders', rider.id), {
      displayName: 'Fer',
      avatar: {
        helmetType: 'modular',
        helmetColor: 'black',
        neckwear: 'checkered-flag',
        neckwearColor: 'red',
        glasses: true,
        beard: false,
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    await waitFor(() => {
      const current = service.currentSession()
      return current.status === 'signed-in' && current.profile !== null
    })
    const session = await waitForSession(service, 'signed-in')
    expect(session.profile?.displayName).toBe('Fer')
    expect(session.profile?.avatar.helmetType).toBe('modular')
  })

  it('guarda perfil y moto juntos, y después los actualiza conservando la fecha de creación', async () => {
    await signInWithGoogleAccount(clients.auth, googleAccount)
    const { rider } = await waitForSession(service, 'signed-in')

    await service.saveProfile(
      { displayName: 'Fer', avatar: sampleAvatar },
      { model: 'Honda XR 250', rangeKm: 300 },
    )
    await waitFor(() => sessionProfile(service)?.displayName === 'Fer')
    // `saveProfile` resuelve con la escritura aplicada en el celular; la fecha la pone el servidor.
    await waitFor(() => !sessionPending(service))
    const created = await getDocFromServer(
      doc(clients.firestore, 'riders', rider.id),
    )

    await service.saveProfile(
      { displayName: 'Fernando', avatar: sampleAvatar },
      { model: 'Honda XR 250', rangeKm: 350 },
    )
    await waitFor(() => sessionProfile(service)?.displayName === 'Fernando')

    const session = await waitForSession(service, 'signed-in')
    expect(session.vehicle).toEqual({ model: 'Honda XR 250', rangeKm: 350 })
    await waitFor(() => !sessionPending(service))
    const updated = await getDocFromServer(
      doc(clients.firestore, 'riders', rider.id),
    )
    expect(updated.get('createdAt')).toEqual(created.get('createdAt'))
    expect(updated.get('updatedAt')).not.toEqual(created.get('updatedAt'))
  })

  it('el perfil público de otro Rider trae nombre y avatar, sin correo ni moto', async () => {
    await signInWithGoogleAccount(clients.auth, googleAccount)
    const { rider: ana } = await waitForSession(service, 'signed-in')
    await service.saveProfile(
      { displayName: 'Ana', avatar: sampleAvatar },
      { model: 'BMW GS 310', rangeKm: 400 },
    )
    await waitFor(() => sessionProfile(service)?.displayName === 'Ana')
    await service.signOut()
    await waitForSession(service, 'signed-out')

    await signInWithGoogleAccount(clients.auth, {
      sub: 'google-456',
      email: 'beto@example.com',
      name: 'Beto',
    })
    await waitForSession(service, 'signed-in')
    const publicProfile = await service.readPublicProfile(ana.id)

    expect(publicProfile).toEqual({ displayName: 'Ana', avatar: sampleAvatar })
    expect(Object.keys(publicProfile!)).toEqual(['displayName', 'avatar'])
    expect(await service.readPublicProfile('nadie')).toBeNull()
  })

  it('al cerrar sesión la sesión queda sin cuenta y el usuario sigue existiendo', async () => {
    await signInWithGoogleAccount(clients.auth, googleAccount)
    await waitForSession(service, 'signed-in')

    await service.signOut()
    const session = await waitForSession(service, 'signed-out')

    expect(session.signInFailed).toBe(false)
    expect(await listEmulatedAccounts()).toHaveLength(1)
  })
})

/** Lo mínimo de `Storage` que usa el servicio, en memoria. */
class MemoryStorage implements Storage {
  private readonly items = new Map<string, string>()
  get length() {
    return this.items.size
  }
  clear() {
    this.items.clear()
  }
  getItem(key: string) {
    return this.items.get(key) ?? null
  }
  key(index: number) {
    return [...this.items.keys()][index] ?? null
  }
  removeItem(key: string) {
    this.items.delete(key)
  }
  setItem(key: string, value: string) {
    this.items.set(key, value)
  }
}

async function waitForSession<S extends RiderSession['status']>(
  service: FirebaseRiderAccountService,
  status: S,
): Promise<Extract<RiderSession, { status: S }>> {
  await waitFor(() => service.currentSession().status === status)
  return service.currentSession() as Extract<RiderSession, { status: S }>
}

async function waitFor(condition: () => boolean): Promise<void> {
  const deadline = Date.now() + 5000
  while (!condition()) {
    if (Date.now() > deadline) throw new Error('condición no alcanzada')
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
}
