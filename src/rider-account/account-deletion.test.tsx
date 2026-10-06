import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import {
  FakeRiderAccountService,
  sampleProfile,
  sampleRider,
  sampleVehicle,
} from '../test-support/fake-rider-account-service.ts'
import { renderApp } from '../test-support/render-app.tsx'

function signedInAccount(overrides: { pendingSync?: boolean } = {}) {
  return new FakeRiderAccountService({
    status: 'signed-in',
    rider: sampleRider,
    profile: sampleProfile,
    vehicle: sampleVehicle,
    pendingSync: overrides.pendingSync ?? false,
  })
}

async function openAccount(riderAccount: FakeRiderAccountService) {
  const rendered = renderApp({ riderAccount })
  await userEvent.click(screen.getByRole('button', { name: 'Fer' }))
  return {
    ...rendered,
    panel: within(screen.getByRole('dialog', { name: 'Tu cuenta' })),
  }
}

describe('Eliminación de la cuenta', () => {
  it('pide confirmación explícita y no borra nada si el Rider cancela', async () => {
    const riderAccount = signedInAccount()
    const { panel } = await openAccount(riderAccount)

    await userEvent.click(
      panel.getByRole('button', { name: 'Eliminar mi cuenta' }),
    )
    expect(panel.getByRole('alertdialog')).toHaveTextContent(
      'No se puede deshacer',
    )
    await userEvent.click(panel.getByRole('button', { name: 'Cancelar' }))

    expect(panel.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(riderAccount.currentSession().status).toBe('signed-in')
  })

  it('al confirmar borra perfil y moto, cierra la sesión y el próximo ingreso es un primer ingreso', async () => {
    const riderAccount = signedInAccount()
    const { panel } = await openAccount(riderAccount)

    await userEvent.click(
      panel.getByRole('button', { name: 'Eliminar mi cuenta' }),
    )
    await userEvent.click(
      panel.getByRole('button', { name: 'Sí, eliminar mi cuenta' }),
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ingresar' })).toBeVisible()
    await userEvent.click(screen.getByRole('button', { name: 'Ingresar' }))
    expect(
      screen.getByRole('dialog', { name: 'Completá tu perfil' }),
    ).toBeVisible()
  })

  it('si el ingreso no es reciente, pide volver a confirmar la identidad con Google antes de borrar', async () => {
    const riderAccount = signedInAccount()
    riderAccount.signInIsRecent = false
    const { panel } = await openAccount(riderAccount)

    await userEvent.click(
      panel.getByRole('button', { name: 'Eliminar mi cuenta' }),
    )
    await userEvent.click(
      panel.getByRole('button', { name: 'Sí, eliminar mi cuenta' }),
    )

    expect(panel.getByRole('alert')).toHaveTextContent(
      'volvé a confirmar tu identidad con Google',
    )
    expect(riderAccount.currentSession().status).toBe('signed-in')
    await userEvent.click(
      panel.getByRole('button', { name: 'Confirmar con Google' }),
    )
    expect(riderAccount.reconfirmations).toBe(1)
  })

  it('sin conectividad, eliminar la cuenta queda señalado como no disponible y nada se borra', async () => {
    const riderAccount = signedInAccount()
    const { panel, connectivity } = await openAccount(riderAccount)

    act(() => connectivity.setOnline(false))

    expect(
      panel.getByRole('button', { name: 'Eliminar mi cuenta' }),
    ).toBeDisabled()
    expect(
      panel.getByText('Eliminar la cuenta requiere conexión'),
    ).toBeVisible()
    expect(riderAccount.currentSession().status).toBe('signed-in')
  })
})

describe('Perfil sin conexión', () => {
  it('indica cuando hay cambios pendientes de sincronizar', async () => {
    const { panel } = await openAccount(signedInAccount({ pendingSync: true }))

    expect(panel.getByRole('status')).toHaveTextContent(
      'Pendiente de sincronizar',
    )
  })
})
