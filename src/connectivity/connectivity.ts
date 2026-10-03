export interface Connectivity {
  isOnline(): boolean
  subscribe(listener: () => void): () => void
}

export class BrowserConnectivity implements Connectivity {
  isOnline(): boolean {
    return navigator.onLine
  }

  subscribe(listener: () => void): () => void {
    window.addEventListener('online', listener)
    window.addEventListener('offline', listener)
    return () => {
      window.removeEventListener('online', listener)
      window.removeEventListener('offline', listener)
    }
  }
}
