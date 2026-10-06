import {
  type Auth,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithRedirect,
  signOut,
  type User,
} from 'firebase/auth'
import {
  doc,
  type DocumentReference,
  type Firestore,
  getDoc,
  onSnapshot,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore'
import { isAvatarOptions } from '../../avatar/avatar-options.ts'
import { isVehicle, type Vehicle } from '../../rider-vehicles/vehicle.ts'
import type {
  RiderAccountService,
  RiderProfile,
  RiderSession,
  SignedInRider,
} from '../rider-account-service.ts'

/** Marca que hay un ingreso en curso: se escribe al ir a Google y se borra al volver. */
const PENDING_SIGN_IN_KEY = 'riders.signInPending'

export class FirebaseRiderAccountService implements RiderAccountService {
  private readonly auth: Auth
  private readonly firestore: Firestore
  private readonly storage: Storage
  private readonly listeners = new Set<() => void>()
  private session: RiderSession = { status: 'resolving' }
  private signInFailed = false
  private stopWatchingRider: (() => void) | null = null

  constructor(auth: Auth, firestore: Firestore, storage: Storage) {
    this.auth = auth
    this.firestore = firestore
    this.storage = storage
    onAuthStateChanged(auth, (user) => this.onUserChanged(user))
    this.settlePendingSignIn()
  }

  async signIn(): Promise<void> {
    this.storage.setItem(PENDING_SIGN_IN_KEY, 'true')
    await signInWithRedirect(this.auth, new GoogleAuthProvider())
  }

  signOut(): Promise<void> {
    return signOut(this.auth)
  }

  dismissSignInFailure(): void {
    this.signInFailed = false
    if (this.session.status === 'signed-out') {
      this.publish({ status: 'signed-out', signInFailed: false })
    }
  }

  currentSession(): RiderSession {
    return this.session
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  async saveProfile(profile: RiderProfile, vehicle: Vehicle): Promise<void> {
    if (this.session.status !== 'signed-in') {
      throw new Error('No hay un Rider identificado')
    }
    const { rider, profile: storedProfile } = this.session
    // Perfil y moto se guardan juntos (design.md, D4): el documento del Rider y su subdocumento privado.
    const batch = writeBatch(this.firestore)
    batch.set(
      this.riderDoc(rider.id),
      {
        ...profile,
        ...(storedProfile === null ? { createdAt: serverTimestamp() } : {}),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    )
    batch.set(this.vehicleDoc(rider.id), {
      ...vehicle,
      updatedAt: serverTimestamp(),
    })
    await batch.commit()
  }

  async readPublicProfile(riderId: string): Promise<RiderProfile | null> {
    const snapshot = await getDoc(this.riderDoc(riderId))
    return toRiderProfile(snapshot.data())
  }

  private riderDoc(riderId: string): DocumentReference {
    return doc(this.firestore, 'riders', riderId)
  }

  private vehicleDoc(riderId: string): DocumentReference {
    return doc(this.firestore, 'riders', riderId, 'private', 'vehicle')
  }

  /**
   * Al volver de Google, un ingreso cancelado o fallido llega como rechazo de la redirección. Solo
   * cuenta si este dispositivo había iniciado un ingreso: sin red, la consulta también rechaza.
   */
  private settlePendingSignIn() {
    const wasPending = this.storage.getItem(PENDING_SIGN_IN_KEY) !== null
    getRedirectResult(this.auth)
      .catch(() => {
        if (!wasPending) return
        this.signInFailed = true
        if (this.session.status === 'signed-out') {
          this.publish({ status: 'signed-out', signInFailed: true })
        }
      })
      .finally(() => this.storage.removeItem(PENDING_SIGN_IN_KEY))
  }

  private onUserChanged(user: User | null) {
    this.stopWatchingRider?.()
    this.stopWatchingRider = null
    if (!user) {
      this.publish({ status: 'signed-out', signInFailed: this.signInFailed })
      return
    }
    const rider: SignedInRider = { id: user.uid, accountName: user.displayName }
    // La sesión se publica recién con el perfil leído, para no mostrarla incompleta por un instante.
    let profile: RiderProfile | null | undefined
    let vehicle: Vehicle | null | undefined
    const publishWhenRead = () => {
      if (profile === undefined || vehicle === undefined) return
      this.signInFailed = false
      this.publish({ status: 'signed-in', rider, profile, vehicle })
    }
    const stopProfile = onSnapshot(this.riderDoc(user.uid), (snapshot) => {
      profile = toRiderProfile(snapshot.data())
      publishWhenRead()
    })
    const stopVehicle = onSnapshot(this.vehicleDoc(user.uid), (snapshot) => {
      const data = snapshot.data()
      vehicle = isVehicle(data)
        ? { model: data.model, rangeKm: data.rangeKm }
        : null
      publishWhenRead()
    })
    this.stopWatchingRider = () => {
      stopProfile()
      stopVehicle()
    }
  }

  private publish(session: RiderSession) {
    this.session = session
    this.listeners.forEach((listener) => listener())
  }
}

function toRiderProfile(data: unknown): RiderProfile | null {
  if (typeof data !== 'object' || data === null) return null
  const { displayName, avatar } = data as Record<string, unknown>
  if (typeof displayName !== 'string' || !isAvatarOptions(avatar)) return null
  return { displayName, avatar }
}
