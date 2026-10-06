import type {
  RiderAccountService,
  RiderProfile,
  RiderSession,
  SignedInRider,
} from '../backend/index.ts'

export const sampleRider: SignedInRider = {
  id: 'rider-1',
  accountName: 'Fernando Pérez',
}

export const sampleProfile: RiderProfile = {
  displayName: 'Fer',
  avatar: {
    helmetType: 'full-face',
    helmetColor: 'white',
    neckwear: 'bandana',
    neckwearColor: 'blue',
    glasses: false,
    beard: true,
  },
}

/** Cuenta simulada: ingresar identifica a `sampleRider` con el perfil que se le haya dado. */
export class FakeRiderAccountService implements RiderAccountService {
  private session: RiderSession
  private readonly listeners = new Set<() => void>()
  /** Perfil que "encuentra" el próximo ingreso; `null` simula un primer ingreso. */
  storedProfile: RiderProfile | null = null

  constructor(
    session: RiderSession = { status: 'signed-out', signInFailed: false },
  ) {
    this.session = session
  }

  signIn(): Promise<void> {
    this.setSession({
      status: 'signed-in',
      rider: sampleRider,
      profile: this.storedProfile,
    })
    return Promise.resolve()
  }

  signOut(): Promise<void> {
    this.setSession({ status: 'signed-out', signInFailed: false })
    return Promise.resolve()
  }

  dismissSignInFailure(): void {
    this.setSession({ status: 'signed-out', signInFailed: false })
  }

  currentSession(): RiderSession {
    return this.session
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  setSession(session: RiderSession) {
    this.session = session
    this.listeners.forEach((listener) => listener())
  }
}
