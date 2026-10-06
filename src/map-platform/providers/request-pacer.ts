export interface PacerClock {
  now(): number
  sleep(ms: number, signal?: AbortSignal): Promise<void>
}

function sleepInBrowser(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason)
      return
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    function onAbort() {
      clearTimeout(timer)
      reject(signal?.reason)
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

export const browserClock: PacerClock = {
  now: Date.now,
  sleep: sleepInBrowser,
}

/**
 * Espacia las consultas a un servicio comunitario para respetar su condición de uso (por ejemplo,
 * una por segundo): cada consulta espera su turno aunque la pidan varias partes de la app a la vez.
 */
export class RequestPacer {
  private readonly minIntervalInMs: number
  private readonly clock: PacerClock
  private nextTurnAt = 0

  constructor(minIntervalInMs: number, clock: PacerClock = browserClock) {
    this.minIntervalInMs = minIntervalInMs
    this.clock = clock
  }

  async waitForTurn(signal?: AbortSignal): Promise<void> {
    const now = this.clock.now()
    const turnAt = Math.max(now, this.nextTurnAt)
    this.nextTurnAt = turnAt + this.minIntervalInMs
    if (turnAt > now) await this.clock.sleep(turnAt - now, signal)
  }
}
