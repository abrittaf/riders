// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { findHardcodedTexts } from './hardcoded-text-detector.ts'

const componentSources = import.meta.glob<string>(
  ['/src/**/*.tsx', '!/src/**/*.test.tsx'],
  { query: '?raw', import: 'default', eager: true },
)

describe('textos visibles de los componentes', () => {
  it('recorre los componentes de la app', () => {
    expect(Object.keys(componentSources)).toContain('/src/App.tsx')
  })

  it('pasan todos por el mecanismo de traducción', () => {
    const findings = Object.entries(componentSources).flatMap(
      ([file, sourceCode]) => findHardcodedTexts(file, sourceCode),
    )

    expect(findings).toEqual([])
  })
})

describe('detector de texto fuera del mecanismo de traducción', () => {
  it('detecta un literal escrito entre etiquetas', () => {
    const findings = findHardcodedTexts(
      'Ejemplo.tsx',
      'export const Ejemplo = () => <p>\n  Hola Rider\n</p>',
    )

    expect(findings).toEqual([
      { file: 'Ejemplo.tsx', line: 2, text: 'Hola Rider' },
    ])
  })

  it('detecta un literal dentro de una expresión', () => {
    const findings = findHardcodedTexts(
      'Ejemplo.tsx',
      'export const Ejemplo = ({ ok }: { ok: boolean }) => <p>{ok ? "Listo" : t("pending")}</p>',
    )

    expect(findings.map((finding) => finding.text)).toEqual(['"Listo"'])
  })

  it('detecta un literal en un atributo que el navegador muestra o anuncia', () => {
    const findings = findHardcodedTexts(
      'Ejemplo.tsx',
      'export const Ejemplo = () => <button aria-label="Cerrar" className="primario" />',
    )

    expect(findings.map((finding) => finding.text)).toEqual(['Cerrar'])
  })

  it('acepta los textos que vienen del mecanismo de traducción', () => {
    const findings = findHardcodedTexts(
      'Ejemplo.tsx',
      'export const Ejemplo = () => <button aria-label={t("nav.close")}>{t("nav.close")} · 3</button>',
    )

    expect(findings).toEqual([])
  })
})
