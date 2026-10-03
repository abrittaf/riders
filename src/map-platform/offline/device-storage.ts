export interface StorageEstimate {
  usageInBytes: number
  quotaInBytes: number
}

/** Lo que el celular informa y permite sobre el almacenamiento de la app. */
export interface DeviceStorage {
  /** `null` cuando el navegador no informa el uso del almacenamiento. */
  estimate(): Promise<StorageEstimate | null>
  isPersistent(): Promise<boolean>
  /** Pide al navegador que no libere por su cuenta lo que la app guarda. */
  requestPersistence(): Promise<boolean>
}

export class BrowserDeviceStorage implements DeviceStorage {
  private readonly storage: StorageManager | undefined

  constructor(storage: StorageManager | undefined = navigator.storage) {
    this.storage = storage
  }

  async estimate(): Promise<StorageEstimate | null> {
    const estimate = await this.storage?.estimate?.()
    if (estimate?.usage === undefined || estimate.quota === undefined) {
      return null
    }
    return { usageInBytes: estimate.usage, quotaInBytes: estimate.quota }
  }

  async isPersistent(): Promise<boolean> {
    return (await this.storage?.persisted?.()) ?? false
  }

  async requestPersistence(): Promise<boolean> {
    return (await this.storage?.persist?.()) ?? false
  }
}
