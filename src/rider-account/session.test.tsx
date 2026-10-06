import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import {
  FakeRiderAccountService,
  sampleProfile,
  sampleRider,
  sampleVehicle,
} from '../test-support/fake-rider-account-service.ts'
import { renderApp } from '../test-support/render-app.tsx'

describe('Sesión del Rider', () => {
  it('sin cuenta, la barra ofrece ingresar y no pide completar ningún perfil', () => {
    renderApp()

    expect(screen.getByRole('button', { name: 'Ingresar' })).toBeVisible()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('mientras no se sabe si hay sesión, la barra no ofrece ingresar ni muestra cuenta', () => {
    renderApp({
      riderAccount: new FakeRiderAccountService({ status: 'resolving' }),
    })

    expect(
      screen.queryByRole('button', { name: 'Ingresar' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Fernando Pérez' }),
    ).not.toBeInTheDocument()
  })

  it('tras el primer ingreso pide completar el perfil y lo sigue pidiendo hasta que esté completo', async () => {
    const { riderAccount } = renderApp()

    await userEvent.click(screen.getByRole('button', { name: 'Ingresar' }))

    const gate = screen.getByRole('dialog', { name: 'Completá tu perfil' })
    expect(gate).toBeVisible()
    expect(screen.getByRole('button', { name: 'Fernando Pérez' })).toBeVisible()

    act(() =>
      riderAccount.setSession({
        status: 'signed-in',
        rider: sampleRider,
        profile: sampleProfile,
        vehicle: sampleVehicle,
        pendingSync: false,
      }),
    )

    expect(
      screen.queryByRole('dialog', { name: 'Completá tu perfil' }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Fer' })).toBeVisible()
  })

  it('con el perfil incompleto, cerrar sesión vuelve al estado sin cuenta', async () => {
    const { riderAccount } = renderApp()
    await userEvent.click(screen.getByRole('button', { name: 'Ingresar' }))

    await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }))

    expect(riderAccount.currentSession().status).toBe('signed-out')
    expect(screen.getByRole('button', { name: 'Ingresar' })).toBeVisible()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('con el perfil completo, la cuenta se abre desde la barra y permite cerrar sesión', async () => {
    const riderAccount = new FakeRiderAccountService({
      status: 'signed-in',
      rider: sampleRider,
      profile: sampleProfile,
      vehicle: sampleVehicle,
      pendingSync: false,
    })
    renderApp({ riderAccount })

    await userEvent.click(screen.getByRole('button', { name: 'Fer' }))
    const panel = screen.getByRole('dialog', { name: 'Tu cuenta' })
    expect(panel).toHaveTextContent('Ingresaste como Fer')

    await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ingresar' })).toBeVisible()
  })

  it('si el ingreso no se completó, avisa y permite reintentar o descartar el aviso', async () => {
    const riderAccount = new FakeRiderAccountService({
      status: 'signed-out',
      signInFailed: true,
    })
    renderApp({ riderAccount })

    expect(screen.getByRole('alert')).toHaveTextContent(
      'El ingreso no se completó. Podés volver a intentarlo.',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar' }))

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ingresar' })).toBeVisible()
  })

  it('sin conexión, ingresar queda señalado como no disponible y explica que requiere conexión', () => {
    const { connectivity } = renderApp()

    act(() => connectivity.setOnline(false))

    expect(screen.getByRole('button', { name: 'Ingresar' })).toBeDisabled()
    expect(screen.getByText('Ingresar requiere conexión')).toBeVisible()
  })
})
