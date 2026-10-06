import { describe, expect, it } from 'vitest'
import { validateModel, validateRangeKm } from './vehicle.ts'

describe('Marca y modelo de la moto', () => {
  it('acepta entre 2 y 40 caracteres', () => {
    expect(validateModel('XR')).toBeNull()
    expect(validateModel('x'.repeat(40))).toBeNull()
    expect(validateModel('  Honda XR 250  ')).toBeNull()
  })

  it('rechaza vacío, un solo carácter o más de 40', () => {
    expect(validateModel('')).toBe('required')
    expect(validateModel('   ')).toBe('required')
    expect(validateModel('X')).toBe('tooShort')
    expect(validateModel('x'.repeat(41))).toBe('tooLong')
  })
})

describe('Autonomía en kilómetros', () => {
  it('acepta enteros entre 50 y 1000', () => {
    expect(validateRangeKm('50')).toBeNull()
    expect(validateRangeKm('200')).toBeNull()
    expect(validateRangeKm(' 1000 ')).toBeNull()
  })

  it('rechaza vacío, no numérico, decimales y valores fuera de 50 a 1000', () => {
    expect(validateRangeKm('')).toBe('required')
    expect(validateRangeKm('doscientos')).toBe('notANumber')
    expect(validateRangeKm('200.5')).toBe('notAnInteger')
    expect(validateRangeKm('200,5')).toBe('notAnInteger')
    expect(validateRangeKm('49')).toBe('tooLow')
    expect(validateRangeKm('1001')).toBe('tooHigh')
  })
})
