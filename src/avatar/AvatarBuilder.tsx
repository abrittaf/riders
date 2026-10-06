import { useTranslation } from 'react-i18next'
import { Avatar } from './Avatar.tsx'
import {
  type AvatarOptions,
  helmetColors,
  helmetTypes,
  neckwearColors,
  neckwearTypes,
} from './avatar-options.ts'

/** Armado del avatar: cada cambio se ve de inmediato en la vista previa. */
export function AvatarBuilder({
  value,
  onChange,
}: {
  value: AvatarOptions
  onChange: (options: AvatarOptions) => void
}) {
  const { t } = useTranslation()
  const update = (change: Partial<AvatarOptions>) =>
    onChange({ ...value, ...change })

  return (
    <div className="avatar-builder">
      <div className="avatar-preview" data-testid="avatar-preview">
        <Avatar options={value} label={t('avatar.preview')} />
      </div>
      <fieldset>
        <legend>{t('avatar.helmetType.label')}</legend>
        {helmetTypes.map((helmetType) => (
          <label key={helmetType}>
            <input
              type="radio"
              name="helmetType"
              checked={value.helmetType === helmetType}
              onChange={() => update({ helmetType })}
            />
            {t(`avatar.helmetType.${helmetType}`)}
          </label>
        ))}
      </fieldset>
      <fieldset>
        <legend>{t('avatar.helmetColor.label')}</legend>
        {helmetColors.map((helmetColor) => (
          <label key={helmetColor}>
            <input
              type="radio"
              name="helmetColor"
              checked={value.helmetColor === helmetColor}
              onChange={() => update({ helmetColor })}
            />
            {t(`avatar.colors.${helmetColor}`)}
          </label>
        ))}
      </fieldset>
      <fieldset>
        <legend>{t('avatar.neckwear.label')}</legend>
        {neckwearTypes.map((neckwear) => (
          <label key={neckwear}>
            <input
              type="radio"
              name="neckwear"
              checked={value.neckwear === neckwear}
              onChange={() => update({ neckwear })}
            />
            {t(`avatar.neckwear.${neckwear}`)}
          </label>
        ))}
      </fieldset>
      {value.neckwear !== 'checkered-flag' && (
        <fieldset>
          <legend>{t('avatar.neckwearColor.label')}</legend>
          {neckwearColors.map((neckwearColor) => (
            <label key={neckwearColor}>
              <input
                type="radio"
                name="neckwearColor"
                checked={value.neckwearColor === neckwearColor}
                onChange={() => update({ neckwearColor })}
              />
              {t(`avatar.colors.${neckwearColor}`)}
            </label>
          ))}
        </fieldset>
      )}
      <label>
        <input
          type="checkbox"
          checked={value.glasses}
          onChange={(event) => update({ glasses: event.target.checked })}
        />
        {t('avatar.glasses')}
      </label>
      <label>
        <input
          type="checkbox"
          checked={value.beard}
          onChange={(event) => update({ beard: event.target.checked })}
        />
        {t('avatar.beard')}
      </label>
    </div>
  )
}
