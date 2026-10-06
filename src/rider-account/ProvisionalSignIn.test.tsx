import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import {
  FakeRiderAccountService,
  sampleRider,
} from '../test-support/fake-rider-account-service.ts'
import { renderInSpanish } from '../test-support/render-with-i18n.tsx'
import { ProvisionalSignIn } from './ProvisionalSignIn.tsx'

describe('Ingreso provisorio', () => {
  it('sin sesión ofrece ingresar con Google y, al ingresar, muestra al Rider identificado', async () => {
    renderInSpanish(
      <ProvisionalSignIn riderAccount={new FakeRiderAccountService()} />,
    )

    await userEvent.click(
      screen.getByRole('button', { name: 'Ingresar con Google' }),
    )

    expect(screen.getByRole('status')).toHaveTextContent(
      'Ingresaste como Fernando Pérez',
    )
    expect(
      screen.queryByRole('button', { name: 'Ingresar con Google' }),
    ).not.toBeInTheDocument()
  })

  it('al cerrar sesión vuelve a ofrecer el ingreso', async () => {
    renderInSpanish(
      <ProvisionalSignIn
        riderAccount={
          new FakeRiderAccountService({
            status: 'signed-in',
            rider: sampleRider,
          })
        }
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }))

    expect(
      screen.getByRole('button', { name: 'Ingresar con Google' }),
    ).toBeVisible()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('mientras no se sabe si hay sesión no ofrece ingresar', () => {
    renderInSpanish(
      <ProvisionalSignIn
        riderAccount={new FakeRiderAccountService({ status: 'resolving' })}
      />,
    )

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
