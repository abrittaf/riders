import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderApp } from './test-support/render-app.tsx'

describe('App', () => {
  it('muestra el título de la aplicación', () => {
    renderApp()

    expect(screen.getByRole('heading', { name: 'Riders' })).toBeVisible()
  })

  it('cambia todos los textos al elegir otro idioma en las opciones', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.click(screen.getByRole('button', { name: 'Opciones' }))
    await user.selectOptions(screen.getByLabelText('Idioma'), 'en')

    expect(screen.getByRole('dialog', { name: 'Options' })).toBeVisible()
    expect(screen.getByLabelText('Language')).toHaveValue('en')
    expect(screen.queryByText('Opciones')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Offline areas' })).toBeVisible()
  })

  it('indica «sin conexión» solo mientras no hay conectividad', () => {
    const { connectivity } = renderApp()
    expect(screen.queryByText('Sin conexión')).not.toBeInTheDocument()

    act(() => connectivity.setOnline(false))
    expect(screen.getByRole('status')).toHaveTextContent('Sin conexión')

    act(() => connectivity.setOnline(true))
    expect(screen.queryByText('Sin conexión')).not.toBeInTheDocument()
  })

  it('sin conexión señala como no disponibles las acciones que la necesitan, y las habilita al recuperarla', async () => {
    const { connectivity } = renderApp()
    await userEvent.click(
      screen.getByRole('button', { name: 'Zonas sin conexión' }),
    )
    const download = screen.getByRole('button', {
      name: 'Descargar la zona visible en el mapa',
    })
    expect(download).toBeEnabled()

    act(() => connectivity.setOnline(false))
    expect(download).toBeDisabled()
    expect(screen.getByText('No disponible sin conexión')).toBeVisible()

    act(() => connectivity.setOnline(true))
    expect(download).toBeEnabled()
    expect(
      screen.queryByText('No disponible sin conexión'),
    ).not.toBeInTheDocument()
  })
})
