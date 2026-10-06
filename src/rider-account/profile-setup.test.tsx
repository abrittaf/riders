import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { FakeRiderAccountService } from '../test-support/fake-rider-account-service.ts'
import { renderApp } from '../test-support/render-app.tsx'

async function signInForTheFirstTime() {
  const riderAccount = new FakeRiderAccountService()
  const rendered = renderApp({ riderAccount })
  await userEvent.click(screen.getByRole('button', { name: 'Ingresar' }))
  return {
    ...rendered,
    screen: within(screen.getByRole('dialog', { name: 'Completá tu perfil' })),
  }
}

describe('Perfil inicial obligatorio', () => {
  it('propone el nombre de la cuenta de Google, editable, y un avatar', async () => {
    const setup = await signInForTheFirstTime()

    expect(setup.screen.getByLabelText('Nombre visible')).toHaveValue(
      'Fernando Pérez',
    )
    expect(
      setup.screen.getByRole('img', { name: 'Vista previa de tu avatar' }),
    ).toBeVisible()
  })

  it('indica junto a cada campo lo que falta corregir y no guarda hasta que esté bien', async () => {
    const setup = await signInForTheFirstTime()
    await userEvent.clear(setup.screen.getByLabelText('Nombre visible'))
    await userEvent.type(setup.screen.getByLabelText('Nombre visible'), 'F')
    await userEvent.type(
      setup.screen.getByLabelText('Autonomía (km por tanque)'),
      '200.5',
    )

    await userEvent.click(
      setup.screen.getByRole('button', { name: 'Guardar y seguir' }),
    )

    expect(
      setup.screen.getByLabelText('Nombre visible'),
    ).toHaveAccessibleDescription('El nombre necesita al menos 2 caracteres.')
    expect(
      setup.screen.getByLabelText('Marca y modelo de la moto'),
    ).toHaveAccessibleDescription('Cargá la marca y el modelo.')
    expect(
      setup.screen.getByLabelText('Autonomía (km por tanque)'),
    ).toHaveAccessibleDescription(
      'La autonomía tiene que ser un número entero, sin decimales.',
    )
    expect(setup.riderAccount.storedProfile).toBeNull()
    expect(
      screen.getByRole('dialog', { name: 'Completá tu perfil' }),
    ).toBeVisible()
  })

  it('al completar nombre, avatar y moto guarda el perfil y vuelve al mapa identificado', async () => {
    const setup = await signInForTheFirstTime()
    await userEvent.clear(setup.screen.getByLabelText('Nombre visible'))
    await userEvent.type(setup.screen.getByLabelText('Nombre visible'), 'Fer')
    await userEvent.click(setup.screen.getByLabelText('Negro'))
    await userEvent.type(
      setup.screen.getByLabelText('Marca y modelo de la moto'),
      'Honda XR 250',
    )
    await userEvent.type(
      setup.screen.getByLabelText('Autonomía (km por tanque)'),
      '300',
    )

    await userEvent.click(
      setup.screen.getByRole('button', { name: 'Guardar y seguir' }),
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Fer' })).toBeVisible()
    expect(setup.riderAccount.storedProfile).toMatchObject({
      displayName: 'Fer',
      avatar: { helmetColor: 'black' },
    })
    expect(setup.riderAccount.storedVehicle).toEqual({
      model: 'Honda XR 250',
      rangeKm: 300,
    })
  })

  it('si el Rider abandona a medias, al volver encuentra lo que había cargado', async () => {
    const first = await signInForTheFirstTime()
    await userEvent.type(
      first.screen.getByLabelText('Marca y modelo de la moto'),
      'BMW GS',
    )
    await userEvent.click(first.screen.getByLabelText('Rebatible'))
    first.unmount()

    const second = await signInForTheFirstTime()

    expect(
      second.screen.getByLabelText('Marca y modelo de la moto'),
    ).toHaveValue('BMW GS')
    expect(second.screen.getByLabelText('Rebatible')).toBeChecked()
  })
})

describe('Perfil del Rider', () => {
  it('muestra la moto con su autonomía en kilómetros y permite editar el perfil', async () => {
    const riderAccount = new FakeRiderAccountService()
    riderAccount.storedProfile = {
      displayName: 'Fer',
      avatar: {
        helmetType: 'full-face',
        helmetColor: 'white',
        neckwear: 'buff',
        neckwearColor: 'green',
        glasses: false,
        beard: false,
      },
    }
    riderAccount.storedVehicle = { model: 'Honda XR 250', rangeKm: 200 }
    renderApp({ riderAccount })
    await userEvent.click(screen.getByRole('button', { name: 'Ingresar' }))
    await userEvent.click(screen.getByRole('button', { name: 'Fer' }))
    const panel = within(screen.getByRole('dialog', { name: 'Tu cuenta' }))
    expect(panel.getByText('200 km')).toBeVisible()

    await userEvent.click(panel.getByRole('button', { name: 'Editar perfil' }))
    const range = panel.getByLabelText('Autonomía (km por tanque)')
    await userEvent.clear(range)
    await userEvent.type(range, '300')
    await userEvent.click(panel.getByRole('button', { name: 'Guardar' }))

    expect(panel.getByText('300 km')).toBeVisible()
    expect(riderAccount.storedVehicle).toEqual({
      model: 'Honda XR 250',
      rangeKm: 300,
    })
  })
})
