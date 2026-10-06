/** Cuánto hay que sostener el dedo, y cuánto puede moverse, para que cuente como toque sostenido. */
const LONG_PRESS_DURATION_IN_MS = 500
const LONG_PRESS_TOLERANCE_IN_PX = 10

export interface LongPressPoint {
  x: number
  y: number
}

/**
 * Detecta el toque sostenido con un solo dedo (o botón) sobre un elemento, sin moverse. Usa eventos
 * de puntero para cubrir pantalla táctil y mouse con el mismo código. El elemento desactiva además
 * el menú contextual, que en iOS y en escritorio aparece justamente al sostener.
 */
export function watchLongPress(
  element: HTMLElement,
  onLongPress: (point: LongPressPoint) => void,
): () => void {
  let pressed: { pointerId: number; start: LongPressPoint } | null = null
  let timer: ReturnType<typeof setTimeout> | null = null

  function cancel() {
    if (timer !== null) clearTimeout(timer)
    timer = null
    pressed = null
  }

  function onPointerDown(event: PointerEvent) {
    // Un segundo dedo es un gesto de zoom, no un toque sostenido.
    if (pressed !== null || !event.isPrimary) {
      cancel()
      return
    }
    const bounds = element.getBoundingClientRect()
    const start = {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    }
    pressed = { pointerId: event.pointerId, start }
    timer = setTimeout(() => {
      cancel()
      onLongPress(start)
    }, LONG_PRESS_DURATION_IN_MS)
  }

  function onPointerMove(event: PointerEvent) {
    if (pressed === null || event.pointerId !== pressed.pointerId) return
    const bounds = element.getBoundingClientRect()
    const movedX = event.clientX - bounds.left - pressed.start.x
    const movedY = event.clientY - bounds.top - pressed.start.y
    if (Math.hypot(movedX, movedY) > LONG_PRESS_TOLERANCE_IN_PX) cancel()
  }

  function onContextMenu(event: Event) {
    event.preventDefault()
  }

  element.addEventListener('pointerdown', onPointerDown)
  element.addEventListener('pointermove', onPointerMove)
  element.addEventListener('pointerup', cancel)
  element.addEventListener('pointercancel', cancel)
  element.addEventListener('contextmenu', onContextMenu)
  return () => {
    cancel()
    element.removeEventListener('pointerdown', onPointerDown)
    element.removeEventListener('pointermove', onPointerMove)
    element.removeEventListener('pointerup', cancel)
    element.removeEventListener('pointercancel', cancel)
    element.removeEventListener('contextmenu', onContextMenu)
  }
}
