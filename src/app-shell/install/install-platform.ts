export interface InstallOffer {
  accept(): Promise<void>
}

export interface InstallPlatform {
  isRunningInstalled(): boolean
  /** iOS no ofrece una propuesta de instalación: el Rider tiene que seguir pasos manuales. */
  requiresManualInstallSteps(): boolean
  subscribeToInstallOffer(
    listener: (offer: InstallOffer | null) => void,
  ): () => void
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<unknown>
}

export class BrowserInstallPlatform implements InstallPlatform {
  private offer: InstallOffer | null = null
  private readonly listeners = new Set<(offer: InstallOffer | null) => void>()

  /** Se construye al arrancar: el navegador puede emitir la propuesta antes de que la interfaz esté montada. */
  constructor() {
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault()
      const promptEvent = event as BeforeInstallPromptEvent
      this.publish({
        accept: async () => {
          await promptEvent.prompt()
          this.publish(null)
        },
      })
    })
    window.addEventListener('appinstalled', () => this.publish(null))
  }

  isRunningInstalled(): boolean {
    const iosStandalone =
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    return (
      iosStandalone || window.matchMedia('(display-mode: standalone)').matches
    )
  }

  requiresManualInstallSteps(): boolean {
    const isIphoneOrIpod = /iPhone|iPad|iPod/.test(navigator.userAgent)
    const isIpadReportingAsMac =
      navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
    return isIphoneOrIpod || isIpadReportingAsMac
  }

  subscribeToInstallOffer(
    listener: (offer: InstallOffer | null) => void,
  ): () => void {
    this.listeners.add(listener)
    listener(this.offer)
    return () => this.listeners.delete(listener)
  }

  private publish(offer: InstallOffer | null) {
    this.offer = offer
    this.listeners.forEach((listener) => listener(offer))
  }
}
