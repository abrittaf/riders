import { describe, expect, it } from 'vitest'
import { proposeDisplayName, validateDisplayName } from './display-name.ts'

describe('Nombre visible', () => {
  it('acepta entre 2 y 24 caracteres', () => {
    expect(validateDisplayName('Fe')).toBeNull()
    expect(validateDisplayName('a'.repeat(24))).toBeNull()
  })

  it('rechaza vacío, un solo carácter o más de 24', () => {
    expect(validateDisplayName('')).toBe('required')
    expect(validateDisplayName(' ')).toBe('required')
    expect(validateDisplayName('F')).toBe('tooShort')
    expect(validateDisplayName('a'.repeat(25))).toBe('tooLong')
  })

  it('se propone a partir del nombre de la cuenta de Google, recortado al largo permitido', () => {
    expect(proposeDisplayName('Fernando Pérez')).toBe('Fernando Pérez')
    expect(
      proposeDisplayName('Nombre Larguísimo De Cuenta De Google'),
    ).toHaveLength(24)
    expect(proposeDisplayName(null)).toBe('')
  })
})
