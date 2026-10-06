import { initializeApp } from 'firebase/app'
import {
  browserLocalPersistence,
  browserPopupRedirectResolver,
  indexedDBLocalPersistence,
  initializeAuth,
} from 'firebase/auth'
import type { Backend, BackendConfig } from './backend.ts'
import { FirebaseRiderAccountService } from './firebase/firebase-rider-account-service.ts'

export function createBackend(config: BackendConfig): Backend {
  const app = initializeApp(config.firebase)
  const auth = initializeAuth(app, {
    // La sesión se conserva entre aperturas hasta que el Rider la cierre (design.md, D3).
    persistence: [indexedDBLocalPersistence, browserLocalPersistence],
    popupRedirectResolver: browserPopupRedirectResolver,
  })
  return { riderAccount: new FirebaseRiderAccountService(auth) }
}
