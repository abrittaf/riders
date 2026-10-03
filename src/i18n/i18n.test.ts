import { describe, expect, it } from 'vitest'
import { chooseLanguage, createI18n, TRANSLATIONS } from './i18n.ts'
import type { LanguagePreference } from './language-preference.ts'

class InMemoryLanguagePreference implements LanguagePreference {
  private language: string | null

  constructor(language: string | null = null) {
    this.language = language
  }

  read() {
    return this.language
  }

  write(language: string) {
    this.language = language
  }
}

function translationKeys(node: object, prefix = ''): string[] {
  return Object.entries(node).flatMap(([key, value]) =>
    typeof value === 'object' && value !== null
      ? translationKeys(value, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  )
}

describe('idioma inicial de la interfaz', () => {
  it('usa el idioma del celular cuando está soportado', () => {
    const i18n = createI18n({
      deviceLanguages: ['en-US'],
      preference: new InMemoryLanguagePreference(),
    })

    expect(i18n.language).toBe('en')
    expect(i18n.t('options.title')).toBe('Options')
  })

  it('usa español (Argentina) cuando el idioma del celular no está soportado', () => {
    const i18n = createI18n({
      deviceLanguages: ['fr-FR', 'de'],
      preference: new InMemoryLanguagePreference(),
    })

    expect(i18n.language).toBe('es-AR')
    expect(i18n.t('options.title')).toBe('Opciones')
  })

  it('usa español (Argentina) para cualquier variante regional del español', () => {
    const i18n = createI18n({
      deviceLanguages: ['es-MX'],
      preference: new InMemoryLanguagePreference(),
    })

    expect(i18n.language).toBe('es-AR')
  })

  it('respeta la elección guardada por encima del idioma del celular', () => {
    const i18n = createI18n({
      deviceLanguages: ['es-AR'],
      preference: new InMemoryLanguagePreference('en'),
    })

    expect(i18n.language).toBe('en')
  })
})

describe('cambio de idioma', () => {
  it('cambia los textos y guarda la elección para las próximas aperturas', async () => {
    const preference = new InMemoryLanguagePreference()
    const i18n = createI18n({ deviceLanguages: ['es-AR'], preference })

    await chooseLanguage(i18n, preference, 'en')

    expect(i18n.t('options.title')).toBe('Options')
    const reopened = createI18n({ deviceLanguages: ['es-AR'], preference })
    expect(reopened.language).toBe('en')
  })
})

describe('archivos de traducción', () => {
  it('definen exactamente las mismas claves en todos los idiomas', () => {
    const spanishKeys = translationKeys(TRANSLATIONS['es-AR']).sort()

    expect(translationKeys(TRANSLATIONS.en).sort()).toEqual(spanishKeys)
  })
})
