import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { renderInSpanish } from '../../test-support/render-with-i18n.tsx'
import { InstallPrompt } from './InstallPrompt.tsx'
import type { InstallOffer, InstallPlatform } from './install-platform.ts'

function fakePlatform(traits: {
  installed?: boolean
  ios?: boolean
  offer?: InstallOffer
}): InstallPlatform {
  return {
    isRunningInstalled: () => traits.installed ?? false,
    requiresManualInstallSteps: () => traits.ios ?? false,
    subscribeToInstallOffer: (listener) => {
      listener(traits.offer ?? null)
      return () => {}
    },
  }
}

describe('propuesta de instalación', () => {
  it('en Android ofrece instalar y dispara la propuesta del navegador al aceptar', async () => {
    const offer = { accept: vi.fn().mockResolvedValue(undefined) }
    renderInSpanish(<InstallPrompt platform={fakePlatform({ offer })} />)

    await userEvent.click(screen.getByRole('button', { name: 'Instalar' }))

    expect(offer.accept).toHaveBeenCalledOnce()
  })

  it('en iOS muestra los pasos para agregar la app a la pantalla de inicio', () => {
    renderInSpanish(<InstallPrompt platform={fakePlatform({ ios: true })} />)

    const steps = screen
      .getAllByRole('listitem')
      .map((step) => step.textContent)
    expect(steps).toEqual([
      'Tocá el botón Compartir de Safari.',
      'Elegí «Agregar a inicio».',
      'Confirmá con «Agregar».',
    ])
    expect(
      screen.queryByRole('button', { name: 'Instalar' }),
    ).not.toBeInTheDocument()
  })

  it('no vuelve a ofrecer la instalación cuando la app ya corre instalada', () => {
    const offer = { accept: vi.fn() }
    const { container } = renderInSpanish(
      <InstallPrompt
        platform={fakePlatform({ installed: true, ios: true, offer })}
      />,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('no muestra nada en un navegador que no puede instalar la app', () => {
    const { container } = renderInSpanish(
      <InstallPrompt platform={fakePlatform({})} />,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('se oculta cuando el Rider la descarta', async () => {
    const { container } = renderInSpanish(
      <InstallPrompt platform={fakePlatform({ ios: true })} />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Ahora no' }))

    expect(container).toBeEmptyDOMElement()
  })
})
