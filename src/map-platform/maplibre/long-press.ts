/** Cuánto hay que sostener el dedo, y cuánto puede moverse, para que cuente como toque sostenido. */
const LONG_PRESS_DURATION_IN_MS = 500
const LONG_PRESS_TOLERANCE_IN_PX = 10

export interface LongPressPoint {
  x: number
  y: number
}

/**
 * Detecta el toque sostenido con un solo dedo sin moverse. En pantalla táctil se siguen los
 * eventos táctiles, los mismos que usa el renderizador de mapas y que iOS entrega entera la
 * secuencia (design.md de roadmap-planning, D6); con mouse, un botón sostenido vía eventos de
 * puntero. El elemento desactiva además el menú contextual, que aparece justamente al sostener.
 */
export function watchLongPress(
  element: HTMLElement,
  onLongPress: (point: LongPressPoint) => void,
): () => void {
  let start: LongPressPoint | null = null
  let timer: ReturnType<typeof setTimeout> | null = null

  function cancel() {
    if (timer !== null) clearTimeout(timer)
    timer = null
    start = null
  }

  function begin(clientX: number, clientY: number) {
    cancel()
    const bounds = element.getBoundingClientRect()
    const point = { x: clientX - bounds.left, y: clientY - bounds.top }
    start = point
    timer = setTimeout(() => {
      cancel()
      onLongPress(point)
    }, LONG_PRESS_DURATION_IN_MS)
  }

  function moved(clientX: number, clientY: number) {
    if (start === null) return
    const bounds = element.getBoundingClientRect()
    const movedX = clientX - bounds.left - start.x
    const movedY = clientY - bounds.top - start.y
    if (Math.hypot(movedX, movedY) > LONG_PRESS_TOLERANCE_IN_PX) cancel()
  }

  function onTouchStart(event: TouchEvent) {
    // Un segundo dedo es un gesto de zoom, no un toque sostenido.
    if (event.touches.length !== 1) {
      cancel()
      return
    }
    const touch = event.touches[0]!
    begin(touch.clientX, touch.clientY)
  }

  function onTouchMove(event: TouchEvent) {
    if (event.touches.length !== 1) {
      cancel()
      return
    }
    const touch = event.touches[0]!
    moved(touch.clientX, touch.clientY)
  }

  function onPointerDown(event: PointerEvent) {
    if (event.pointerType !== 'mouse') return
    if (event.button !== 0 || !event.isPrimary) {
      cancel()
      return
    }
    begin(event.clientX, event.clientY)
  }

  function onPointerMove(event: PointerEvent) {
    if (event.pointerType === 'mouse') moved(event.clientX, event.clientY)
  }

  function onPointerEnd(event: PointerEvent) {
    if (event.pointerType === 'mouse') cancel()
  }

  function onContextMenu(event: Event) {
    event.preventDefault()
  }

  element.addEventListener('touchstart', onTouchStart, { passive: true })
  element.addEventListener('touchmove', onTouchMove, { passive: true })
  element.addEventListener('touchend', cancel)
  element.addEventListener('touchcancel', cancel)
  element.addEventListener('pointerdown', onPointerDown)
  element.addEventListener('pointermove', onPointerMove)
  element.addEventListener('pointerup', onPointerEnd)
  element.addEventListener('pointercancel', onPointerEnd)
  element.addEventListener('contextmenu', onContextMenu)
  return () => {
    cancel()
    element.removeEventListener('touchstart', onTouchStart)
    element.removeEventListener('touchmove', onTouchMove)
    element.removeEventListener('touchend', cancel)
    element.removeEventListener('touchcancel', cancel)
    element.removeEventListener('pointerdown', onPointerDown)
    element.removeEventListener('pointermove', onPointerMove)
    element.removeEventListener('pointerup', onPointerEnd)
    element.removeEventListener('pointercancel', onPointerEnd)
    element.removeEventListener('contextmenu', onContextMenu)
  }
}
