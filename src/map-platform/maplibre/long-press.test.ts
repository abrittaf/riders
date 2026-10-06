import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type LongPressPoint, watchLongPress } from './long-press.ts'

function pointerEvent(
  type: string,
  options: { x: number; y: number; pointerId?: number; isPrimary?: boolean },
) {
  return new PointerEvent(type, {
    clientX: options.x,
    clientY: options.y,
    pointerId: options.pointerId ?? 1,
    isPrimary: options.isPrimary ?? true,
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

  it('sostener el dedo medio segundo sin moverlo entrega el punto tocado', () => {
    element.dispatchEvent(pointerEvent('pointerdown', { x: 40, y: 60 }))
    vi.advanceTimersByTime(500)

    expect(onLongPress).toHaveBeenCalledWith({ x: 40, y: 60 })
  })

  it('un toque corto no cuenta', () => {
    element.dispatchEvent(pointerEvent('pointerdown', { x: 40, y: 60 }))
    vi.advanceTimersByTime(300)
    element.dispatchEvent(pointerEvent('pointerup', { x: 40, y: 60 }))
    vi.advanceTimersByTime(500)

    expect(onLongPress).not.toHaveBeenCalled()
  })

  it('arrastrar el dedo es desplazar el mapa, no un toque sostenido', () => {
    element.dispatchEvent(pointerEvent('pointerdown', { x: 40, y: 60 }))
    element.dispatchEvent(pointerEvent('pointermove', { x: 70, y: 60 }))
    vi.advanceTimersByTime(600)

    expect(onLongPress).not.toHaveBeenCalled()
  })

  it('un temblor de pocos píxeles no cancela el toque', () => {
    element.dispatchEvent(pointerEvent('pointerdown', { x: 40, y: 60 }))
    element.dispatchEvent(pointerEvent('pointermove', { x: 44, y: 63 }))
    vi.advanceTimersByTime(500)

    expect(onLongPress).toHaveBeenCalledTimes(1)
  })

  it('apoyar un segundo dedo (zoom) cancela el toque', () => {
    element.dispatchEvent(pointerEvent('pointerdown', { x: 40, y: 60 }))
    element.dispatchEvent(
      pointerEvent('pointerdown', {
        x: 90,
        y: 60,
        pointerId: 2,
        isPrimary: false,
      }),
    )
    vi.advanceTimersByTime(600)

    expect(onLongPress).not.toHaveBeenCalled()
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
    element.dispatchEvent(pointerEvent('pointerdown', { x: 40, y: 60 }))
    vi.advanceTimersByTime(600)

    expect(onLongPress).not.toHaveBeenCalled()
  })
})
