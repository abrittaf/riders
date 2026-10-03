import type { InstallPlatform } from '../app-shell/install/install-platform.ts'
import type { Connectivity } from '../connectivity/connectivity.ts'

export class FakeConnectivity implements Connectivity {
  private online = true
  private readonly listeners = new Set<() => void>()

  isOnline(): boolean {
    return this.online
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  setOnline(online: boolean) {
    this.online = online
    this.listeners.forEach((listener) => listener())
  }
}

export const notInstallablePlatform: InstallPlatform = {
  isRunningInstalled: () => false,
  requiresManualInstallSteps: () => false,
  subscribeToInstallOffer: (listener) => {
    listener(null)
    return () => {}
  },
}
