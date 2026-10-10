// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { formatDuration } from './format.ts'

describe('tiempo estimado para mostrar', () => {
  it.each([
    [18547, '5h 9min'],
    [2700, '45min'],
    [7200, '2h'],
    [20, '0min'],
  ])('%i segundos se muestran como «%s»', (seconds, expected) => {
    expect(formatDuration(seconds, 'es-AR').replace(/ /g, '')).toBe(expected)
  })
})
