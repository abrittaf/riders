import type {
  DeleteAccountResult,
  RiderAccountService,
  RiderProfile,
  RiderSession,
  SignedInRider,
} from '../backend/index.ts'
import type { Vehicle } from '../rider-vehicles/vehicle.ts'

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

export const sampleVehicle: Vehicle = { model: 'Honda XR 250', rangeKm: 300 }

/** Cuenta simulada: ingresar identifica a `sampleRider` con el perfil que se le haya dado. */
export class FakeRiderAccountService implements RiderAccountService {
  private session: RiderSession
  private readonly listeners = new Set<() => void>()
  /** Perfil y moto que "encuentra" el próximo ingreso; `null` simula un primer ingreso. */
  storedProfile: RiderProfile | null = null
  storedVehicle: Vehicle | null = null
  /** Perfiles públicos de otros Riders, por id. */
  readonly otherProfiles = new Map<string, RiderProfile>()
  /** Simula un ingreso viejo: eliminar la cuenta pide reconfirmar la identidad. */
  signInIsRecent = true
  reconfirmations = 0

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
      vehicle: this.storedVehicle,
      pendingSync: false,
    })
    return Promise.resolve()
  }

  deleteAccount(): Promise<DeleteAccountResult> {
    if (!this.signInIsRecent) {
      return Promise.resolve({ status: 'requires-recent-sign-in' })
    }
    this.storedProfile = null
    this.storedVehicle = null
    this.setSession({ status: 'signed-out', signInFailed: false })
    return Promise.resolve({ status: 'deleted' })
  }

  reconfirmIdentityAndDeleteAccount(): Promise<void> {
    this.reconfirmations += 1
    return Promise.resolve()
  }

  saveProfile(profile: RiderProfile, vehicle: Vehicle): Promise<void> {
    if (this.session.status !== 'signed-in') {
      return Promise.reject(new Error('No hay un Rider identificado'))
    }
    this.storedProfile = profile
    this.storedVehicle = vehicle
    this.setSession({ ...this.session, profile, vehicle })
    return Promise.resolve()
  }

  readPublicProfile(riderId: string): Promise<RiderProfile | null> {
    return Promise.resolve(this.otherProfiles.get(riderId) ?? null)
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
