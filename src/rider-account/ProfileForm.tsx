import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AvatarBuilder } from '../avatar/index.ts'
import type { RiderProfile } from '../backend/index.ts'
import {
  validateModel,
  validateRangeKm,
  type Vehicle,
} from '../rider-vehicles/vehicle.ts'
import { validateDisplayName } from './display-name.ts'
import type { ProfileDraft } from './profile-draft-store.ts'

/** Perfil y moto en un solo formulario: lo usan el perfil inicial y la edición. */
export function ProfileForm({
  initial,
  submitLabel,
  onSubmit,
  onChange,
}: {
  initial: ProfileDraft
  submitLabel: string
  onSubmit: (profile: RiderProfile, vehicle: Vehicle) => Promise<void>
  /** Cada cambio, tal cual lo escribió el Rider; para conservar borradores. */
  onChange?: (draft: ProfileDraft) => void
}) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState(initial)
  const [showErrors, setShowErrors] = useState(false)
  const [saving, setSaving] = useState(false)

  const errors = {
    displayName: validateDisplayName(draft.displayName),
    model: validateModel(draft.model),
    rangeKm: validateRangeKm(draft.rangeKm),
  }
  const hasErrors = Object.values(errors).some((error) => error !== null)

  function update(change: Partial<ProfileDraft>) {
    const next = { ...draft, ...change }
    setDraft(next)
    onChange?.(next)
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setShowErrors(true)
    if (hasErrors) return
    setSaving(true)
    try {
      await onSubmit(
        { displayName: draft.displayName.trim(), avatar: draft.avatar },
        { model: draft.model.trim(), rangeKm: Number(draft.rangeKm.trim()) },
      )
    } finally {
      setSaving(false)
    }
  }

  const field = (
    name: keyof typeof errors,
    label: string,
    message: string | null,
    inputProps: { inputMode?: 'numeric'; maxLength?: number } = {},
  ) => {
    const showError = showErrors && message !== null
    return (
      <div className="field">
        <label htmlFor={`profile-${name}`}>{label}</label>
        <input
          id={`profile-${name}`}
          name={name}
          value={draft[name]}
          aria-invalid={showError}
          aria-describedby={showError ? `profile-${name}-error` : undefined}
          onChange={(event) => update({ [name]: event.target.value })}
          {...inputProps}
        />
        {showError && (
          <small
            className="field-error"
            id={`profile-${name}-error`}
            role="alert"
          >
            {message}
          </small>
        )}
      </div>
    )
  }

  return (
    <form className="profile-form" onSubmit={(event) => void submit(event)}>
      {field(
        'displayName',
        t('profile.displayName'),
        errors.displayName &&
          t(`profile.errors.displayName.${errors.displayName}`),
        { maxLength: 25 },
      )}
      <AvatarBuilder
        value={draft.avatar}
        onChange={(avatar) => update({ avatar })}
      />
      {field(
        'model',
        t('vehicle.model'),
        errors.model && t(`vehicle.errors.model.${errors.model}`),
        { maxLength: 41 },
      )}
      {field(
        'rangeKm',
        t('vehicle.rangeKm'),
        errors.rangeKm && t(`vehicle.errors.rangeKm.${errors.rangeKm}`),
        { inputMode: 'numeric' },
      )}
      <button type="submit" disabled={saving}>
        {submitLabel}
      </button>
    </form>
  )
}
