/** La moto del Rider: su autonomía decide dónde cargar combustible al planificar. */
export interface Vehicle {
  model: string
  /** Kilómetros por tanque, entero entre 50 y 1000. */
  rangeKm: number
}

export const MODEL_MIN_LENGTH = 2
export const MODEL_MAX_LENGTH = 40
export const RANGE_KM_MIN = 50
export const RANGE_KM_MAX = 1000

export type ModelError = 'required' | 'tooShort' | 'tooLong'
export type RangeKmError =
  'required' | 'notANumber' | 'notAnInteger' | 'tooLow' | 'tooHigh'

export function validateModel(model: string): ModelError | null {
  const trimmed = model.trim()
  if (trimmed.length === 0) return 'required'
  if (trimmed.length < MODEL_MIN_LENGTH) return 'tooShort'
  if (trimmed.length > MODEL_MAX_LENGTH) return 'tooLong'
  return null
}

/** Valida lo que el Rider escribió en el campo, tal cual, antes de convertirlo en número. */
export function validateRangeKm(input: string): RangeKmError | null {
  const trimmed = input.trim()
  if (trimmed.length === 0) return 'required'
  if (!/^-?\d+([.,]\d+)?$/.test(trimmed)) return 'notANumber'
  const value = Number(trimmed.replace(',', '.'))
  if (!Number.isInteger(value)) return 'notAnInteger'
  if (value < RANGE_KM_MIN) return 'tooLow'
  if (value > RANGE_KM_MAX) return 'tooHigh'
  return null
}

export function isVehicle(value: unknown): value is Vehicle {
  if (typeof value !== 'object' || value === null) return false
  const { model, rangeKm } = value as Record<string, unknown>
  return (
    typeof model === 'string' &&
    validateModel(model) === null &&
    typeof rangeKm === 'number' &&
    validateRangeKm(String(rangeKm)) === null
  )
}
