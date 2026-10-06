import type {
  RiderAccountService,
  RiderSession,
  SignedInRider,
} from '../backend/index.ts'

export const sampleRider: SignedInRider = {
  id: 'rider-1',
  accountName: 'Fernando Pérez',
}

/** Cuenta simulada: ingresar deja identificado a `sampleRider`, como si Google hubiera respondido. */
export class FakeRiderAccountService implements RiderAccountService {
  private session: RiderSession
  private readonly listeners = new Set<() => void>()

  constructor(session: RiderSession = { status: 'signed-out' }) {
    this.session = session
  }

  signIn(): Promise<void> {
    this.setSession({ status: 'signed-in', rider: sampleRider })
    return Promise.resolve()
  }

  signOut(): Promise<void> {
    this.setSession({ status: 'signed-out' })
    return Promise.resolve()
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
