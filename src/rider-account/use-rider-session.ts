import { useSyncExternalStore } from 'react'
import type { RiderAccountService, RiderSession } from '../backend/index.ts'

export function useRiderSession(service: RiderAccountService): RiderSession {
  return useSyncExternalStore(
    (listener) => service.subscribe(listener),
    () => service.currentSession(),
  )
}
