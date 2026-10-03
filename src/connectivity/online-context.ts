import { createContext, useContext, useSyncExternalStore } from 'react'
import type { Connectivity } from './connectivity.ts'

export const OnlineContext = createContext(true)

export function useIsOnline(): boolean {
  return useContext(OnlineContext)
}

export function useConnectivity(connectivity: Connectivity): boolean {
  return useSyncExternalStore(
    (listener) => connectivity.subscribe(listener),
    () => connectivity.isOnline(),
  )
}
