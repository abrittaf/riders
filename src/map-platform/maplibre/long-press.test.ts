import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type LongPressPoint, watchLongPress } from './long-press.ts'

/** jsdom no implementa `Touch`: el evento lleva una lista de toques con lo que el código lee. */
function touchEvent(
  type: string,
  touches: { x: number; y: number }[],
  _target: EventTarget,
) {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'touches', {
    value: touches.map(({ x, y }) => ({ clientX: x, clientY: y })),
  })
  return event
}

function mouseEvent(
  type: string,
  options: { x: number; y: number; button?: number },
) {
  return new PointerEvent(type, {
    pointerType: 'mouse',
    clientX: options.x,
    clientY: options.y,
    button: options.button ?? 0,
    pointerId: 1,
    isPrimary: true,
    bubbles: true,
    cancelable: true,
  })
}

describe('toque sostenido sobre el mapa', () => {
  let element: HTMLDivElement
  let onLongPress: ReturnType<typeof vi.fn<(point: LongPressPoint) => void>>
  let stop: () => void

  beforeEach(() => {
    vi.useFakeTimers()
    element = document.createElement('div')
    document.body.append(element)
    onLongPress = vi.fn()
    stop = watchLongPress(element, onLongPress)
  })

  afterEach(() => {
    stop()
    element.remove()
    vi.useRealTimers()
  })

  describe('con el dedo', () => {
    it('sostener medio segundo sin moverlo entrega el punto tocado', () => {
      element.dispatchEvent(
        touchEvent('touchstart', [{ x: 40, y: 60 }], element),
      )
      vi.advanceTimersByTime(500)

      expect(onLongPress).toHaveBeenCalledWith({ x: 40, y: 60 })
    })

    it('un toque corto no cuenta', () => {
      element.dispatchEvent(
        touchEvent('touchstart', [{ x: 40, y: 60 }], element),
      )
      vi.advanceTimersByTime(300)
      element.dispatchEvent(touchEvent('touchend', [], element))
      vi.advanceTimersByTime(500)

      expect(onLongPress).not.toHaveBeenCalled()
    })

    it('arrastrar el dedo es desplazar el mapa, no un toque sostenido', () => {
      element.dispatchEvent(
        touchEvent('touchstart', [{ x: 40, y: 60 }], element),
      )
      element.dispatchEvent(
        touchEvent('touchmove', [{ x: 70, y: 60 }], element),
      )
      vi.advanceTimersByTime(600)

      expect(onLongPress).not.toHaveBeenCalled()
    })

    it('un temblor de pocos píxeles no cancela el toque', () => {
      element.dispatchEvent(
        touchEvent('touchstart', [{ x: 40, y: 60 }], element),
      )
      element.dispatchEvent(
        touchEvent('touchmove', [{ x: 44, y: 63 }], element),
      )
      vi.advanceTimersByTime(500)

      expect(onLongPress).toHaveBeenCalledTimes(1)
    })

    it('apoyar un segundo dedo (zoom) cancela el toque', () => {
      element.dispatchEvent(
        touchEvent('touchstart', [{ x: 40, y: 60 }], element),
      )
      element.dispatchEvent(
        touchEvent(
          'touchstart',
          [
            { x: 40, y: 60 },
            { x: 90, y: 60 },
          ],
          element,
        ),
      )
      vi.advanceTimersByTime(600)

      expect(onLongPress).not.toHaveBeenCalled()
    })

    it('si el sistema cancela el toque, no cuenta', () => {
      element.dispatchEvent(
        touchEvent('touchstart', [{ x: 40, y: 60 }], element),
      )
      element.dispatchEvent(touchEvent('touchcancel', [], element))
      vi.advanceTimersByTime(600)

      expect(onLongPress).not.toHaveBeenCalled()
    })
  })

  describe('con el mouse', () => {
    it('sostener el botón medio segundo entrega el punto', () => {
      element.dispatchEvent(mouseEvent('pointerdown', { x: 10, y: 20 }))
      vi.advanceTimersByTime(500)

      expect(onLongPress).toHaveBeenCalledWith({ x: 10, y: 20 })
    })

    it('soltar antes o mover el mouse cancela', () => {
      element.dispatchEvent(mouseEvent('pointerdown', { x: 10, y: 20 }))
      element.dispatchEvent(mouseEvent('pointermove', { x: 40, y: 20 }))
      vi.advanceTimersByTime(600)
      element.dispatchEvent(mouseEvent('pointerdown', { x: 10, y: 20 }))
      element.dispatchEvent(mouseEvent('pointerup', { x: 10, y: 20 }))
      vi.advanceTimersByTime(600)

      expect(onLongPress).not.toHaveBeenCalled()
    })

    it('los eventos de puntero que genera un dedo no se cuentan dos veces', () => {
      element.dispatchEvent(
        new PointerEvent('pointerdown', {
          pointerType: 'touch',
          clientX: 40,
          clientY: 60,
          isPrimary: true,
          bubbles: true,
        }),
      )
      vi.advanceTimersByTime(600)

      expect(onLongPress).not.toHaveBeenCalled()
    })
  })

  it('no deja aparecer el menú contextual del navegador sobre el mapa', () => {
    const contextMenu = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
    })

    element.dispatchEvent(contextMenu)

    expect(contextMenu.defaultPrevented).toBe(true)
  })

  it('al dejar de observar, un toque sostenido ya no se informa', () => {
    stop()
    element.dispatchEvent(touchEvent('touchstart', [{ x: 40, y: 60 }], element))
    vi.advanceTimersByTime(600)

    expect(onLongPress).not.toHaveBeenCalled()
  })
})
