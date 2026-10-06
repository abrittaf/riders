import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { renderInSpanish } from '../test-support/render-with-i18n.tsx'
import { Avatar } from './Avatar.tsx'
import { AvatarBuilder } from './AvatarBuilder.tsx'
import {
  type AvatarOptions,
  helmetColors,
  helmetTypes,
  isAvatarOptions,
  neckwearColors,
  neckwearTypes,
} from './avatar-options.ts'
import { proposeRandomAvatar } from './random-avatar.ts'

function allCombinations(): AvatarOptions[] {
  return helmetTypes.flatMap((helmetType) =>
    helmetColors.flatMap((helmetColor) =>
      neckwearTypes.flatMap((neckwear) =>
        neckwearColors.flatMap((neckwearColor) =>
          [false, true].flatMap((glasses) =>
            [false, true].map((beard) => ({
              helmetType,
              helmetColor,
              neckwear,
              neckwearColor,
              glasses,
              beard,
            })),
          ),
        ),
      ),
    ),
  )
}

function svgMarkup(options: AvatarOptions): string {
  const { container, unmount } = render(<Avatar options={options} />)
  const markup = container.querySelector('svg')!.innerHTML
  unmount()
  // Los identificadores internos cambian por instancia y no hacen al dibujo.
  return markup.replace(/avatar-(clip|checkers)-[^"')]+/g, 'id')
}

describe('Avatar', () => {
  it('dibuja sin error toda combinación válida de opciones, con sus capas', () => {
    const combinations = allCombinations()
    expect(combinations).toHaveLength(2 * 3 * 4 * 6 * 2 * 2)

    for (const options of combinations) {
      const { container, unmount } = render(<Avatar options={options} />)
      const svg = container.querySelector('svg')!
      expect(svg.querySelector('[data-layer="helmet"]')).not.toBeNull()
      expect(svg.querySelector('[data-layer="neckwear"]')).not.toBeNull()
      expect(svg.querySelector('[data-layer="glasses"]') !== null).toBe(
        options.glasses,
      )
      expect(svg.querySelector('[data-layer="beard"]') !== null).toBe(
        options.beard,
      )
      unmount()
    }
  })

  it('cada opción cambia el dibujo', () => {
    const base = allCombinations()[0]!
    expect(svgMarkup(base)).not.toBe(
      svgMarkup({ ...base, helmetType: 'modular' }),
    )
    expect(svgMarkup(base)).not.toBe(
      svgMarkup({ ...base, helmetColor: 'black' }),
    )
    expect(svgMarkup(base)).not.toBe(svgMarkup({ ...base, neckwear: 'buff' }))
    expect(svgMarkup(base)).not.toBe(
      svgMarkup({ ...base, neckwearColor: 'red' }),
    )
  })

  it('la bandera a cuadros va en negro y blanco e ignora el color elegido', () => {
    const flag = (
      neckwearColor: AvatarOptions['neckwearColor'],
    ): AvatarOptions => ({
      ...allCombinations()[0]!,
      neckwear: 'checkered-flag',
      neckwearColor,
    })

    expect(svgMarkup(flag('blue'))).toBe(svgMarkup(flag('red')))
    render(<Avatar options={flag('blue')} label="avatar" />)
    expect(screen.getByRole('img', { name: 'avatar' })).toHaveAttribute(
      'data-neckwear-color',
      'none',
    )
  })

  it('en tamaño de marcador es redondo y con borde; en tamaño de perfil, más grande', () => {
    render(
      <>
        <Avatar
          options={allCombinations()[0]!}
          variant="marker"
          label="marcador"
        />
        <Avatar
          options={allCombinations()[0]!}
          variant="profile"
          label="perfil"
        />
      </>,
    )
    const marker = screen.getByRole('img', { name: 'marcador' })
    const profile = screen.getByRole('img', { name: 'perfil' })

    expect(Number(marker.getAttribute('width'))).toBeLessThan(
      Number(profile.getAttribute('width')),
    )
    expect(marker.querySelector('g[clip-path]')).not.toBeNull()
    expect(profile.querySelector('g[clip-path]')).toBeNull()
  })
})

describe('Propuesta inicial del avatar', () => {
  it('es siempre una combinación válida, para cualquier azar', () => {
    for (const seed of [0, 0.1, 0.33, 0.5, 0.77, 0.999]) {
      expect(isAvatarOptions(proposeRandomAvatar(() => seed))).toBe(true)
    }
    for (let i = 0; i < 50; i++) {
      expect(isAvatarOptions(proposeRandomAvatar())).toBe(true)
    }
  })

  it('varía con el azar', () => {
    expect(proposeRandomAvatar(() => 0)).not.toEqual(
      proposeRandomAvatar(() => 0.999),
    )
  })
})

function BuilderHarness({ initial }: { initial: AvatarOptions }) {
  const [options, setOptions] = useState(initial)
  return <AvatarBuilder value={options} onChange={setOptions} />
}

describe('Armado del avatar', () => {
  const initial = proposeRandomAvatar(() => 0)

  it('cambiar una opción actualiza la vista previa de inmediato', async () => {
    renderInSpanish(<BuilderHarness initial={initial} />)
    const preview = () =>
      screen.getByRole('img', { name: 'Vista previa de tu avatar' })
    expect(preview()).toHaveAttribute('data-helmet-color', 'white')

    await userEvent.click(screen.getByLabelText('Negro'))
    expect(preview()).toHaveAttribute('data-helmet-color', 'black')

    await userEvent.click(screen.getByLabelText('Rebatible'))
    expect(preview()).toHaveAttribute('data-helmet-type', 'modular')

    expect(preview()).toHaveAttribute('data-glasses', 'true')
    await userEvent.click(screen.getByLabelText('Gafas'))
    expect(preview()).toHaveAttribute('data-glasses', 'false')
  })

  it('con la bandera a cuadros no ofrece elegir color de cuello', async () => {
    renderInSpanish(<BuilderHarness initial={initial} />)
    expect(
      screen.getByRole('group', { name: 'Color del cuello' }),
    ).toBeVisible()

    await userEvent.click(screen.getByLabelText('Bandera a cuadros'))

    expect(
      screen.queryByRole('group', { name: 'Color del cuello' }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('img', { name: 'Vista previa de tu avatar' }),
    ).toHaveAttribute('data-neckwear-color', 'none')
  })
})
