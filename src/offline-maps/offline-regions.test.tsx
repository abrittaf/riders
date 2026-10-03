import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { offlineRegion } from '../test-support/fake-offline-region-store.ts'
import { renderApp } from '../test-support/render-app.tsx'

const MEGABYTE = 1024 * 1024

async function openRegionsPanel() {
  await userEvent.click(
    screen.getByRole('button', { name: 'Zonas sin conexión' }),
  )
  return screen.getByRole('dialog', { name: 'Zonas descargadas' })
}

describe('pantalla de zonas descargadas', () => {
  it('sin zonas descargadas explica para qué sirve descargarlas y cómo hacerlo', async () => {
    renderApp()

    const panel = await openRegionsPanel()

    expect(
      within(panel).getByRole('heading', {
        name: 'Todavía no descargaste ninguna zona',
      }),
    ).toBeVisible()
    expect(
      within(panel).getByText(
        /te permite ver su mapa cuando no tenés conexión/,
      ),
    ).toBeVisible()
    expect(within(panel).queryAllByRole('listitem')).toHaveLength(0)
  })

  it('muestra el espacio que ocupan las zonas y el disponible en el celular', async () => {
    const { offlineRegions } = renderApp({
      regions: [
        offlineRegion({ id: 'a', sizeInBytes: 12.5 * MEGABYTE }),
        offlineRegion({ id: 'b', sizeInBytes: 30 * MEGABYTE }),
      ],
    })
    offlineRegions.availableBytes = 2048 * MEGABYTE

    const panel = await openRegionsPanel()

    expect(
      await within(panel).findByText(/Tus zonas ocupan 42,5\sMB\./),
    ).toBeVisible()
    expect(
      within(panel).getByText(/Espacio disponible en el celular: 2\sGB\./),
    ).toBeVisible()
  })

  it('lista cada zona con su nombre, tamaño ocupado, fecha de descarga y estado', async () => {
    renderApp({
      regions: [
        offlineRegion({
          name: 'Cuesta del Obispo',
          sizeInBytes: 12.5 * MEGABYTE,
          downloadedAt: new Date('2026-10-01T15:00:00Z'),
        }),
      ],
    })

    const panel = await openRegionsPanel()
    const item = await within(panel).findByRole('listitem')

    expect(
      within(item).getByRole('heading', { name: 'Cuesta del Obispo' }),
    ).toBeVisible()
    expect(
      within(item).getByText(/12,5\sMB · descargada el 1 oct 2026/),
    ).toBeVisible()
    expect(within(item).getByRole('status')).toHaveTextContent(
      'Disponible sin conexión',
    )
  })

  it('descarga la zona visible: informa el tamaño estimado, pide un nombre y al confirmar la zona aparece en la lista', async () => {
    const user = userEvent.setup()
    const { offlineRegions, map } = renderApp()
    const visibleBounds = map.handle.getVisibleBounds()
    const panel = await openRegionsPanel()

    await user.click(
      within(panel).getByRole('button', {
        name: 'Descargar la zona visible en el mapa',
      }),
    )

    expect(
      await within(panel).findByText(/Tamaño estimado: 3\sMB/),
    ).toBeVisible()
    const confirm = within(panel).getByRole('button', {
      name: 'Confirmar descarga',
    })
    expect(confirm).toBeDisabled()
    expect(offlineRegions.startDownload).not.toHaveBeenCalled()

    await user.type(within(panel).getByLabelText('Nombre de la zona'), 'Cachi')
    await user.click(confirm)

    expect(offlineRegions.startDownload).toHaveBeenCalledWith(
      'Cachi',
      visibleBounds,
    )
    expect(
      await within(panel).findByRole('heading', { name: 'Cachi' }),
    ).toBeVisible()
  })

  it('si la zona visible es demasiado grande lo informa antes de empezar e indica cuánto acercar el mapa', async () => {
    const user = userEvent.setup()
    const { offlineRegions, map } = renderApp()
    offlineRegions.plan = {
      outcome: 'too-large',
      tileCount: 50_000,
      maxTileCount: 12_000,
      zoomLevelsToZoomIn: 2,
    }
    const panel = await openRegionsPanel()

    await user.click(
      within(panel).getByRole('button', {
        name: 'Descargar la zona visible en el mapa',
      }),
    )

    expect(await within(panel).findByRole('alert')).toHaveTextContent(
      'La zona visible es demasiado grande para descargarla. Acercá el mapa 2 niveles de zoom',
    )
    expect(
      within(panel).queryByRole('button', { name: 'Confirmar descarga' }),
    ).not.toBeInTheDocument()

    await user.click(
      within(panel).getByRole('button', { name: 'Acercar el mapa' }),
    )

    expect(map.handle.zoomIn).toHaveBeenCalledWith(2)
    expect(offlineRegions.startDownload).not.toHaveBeenCalled()
  })

  it('si no hay espacio suficiente lo informa antes de empezar y no permite iniciar la descarga', async () => {
    const user = userEvent.setup()
    const { offlineRegions } = renderApp()
    offlineRegions.plan = {
      outcome: 'insufficient-space',
      estimatedSizeInBytes: 300 * MEGABYTE,
      availableBytes: 50 * MEGABYTE,
    }
    const panel = await openRegionsPanel()

    await user.click(
      within(panel).getByRole('button', {
        name: 'Descargar la zona visible en el mapa',
      }),
    )

    expect(await within(panel).findByRole('alert')).toHaveTextContent(
      /la zona ocuparía unos 300\sMB y quedan 50\sMB disponibles/,
    )
    expect(
      within(panel).queryByRole('button', { name: 'Confirmar descarga' }),
    ).not.toBeInTheDocument()
    expect(offlineRegions.startDownload).not.toHaveBeenCalled()
  })

  it('muestra el progreso de una descarga en curso y permite pausarla', async () => {
    const { offlineRegions } = renderApp({
      regions: [
        offlineRegion({
          status: 'downloading',
          totalTileCount: 200,
          downloadedTileCount: 50,
        }),
      ],
    })

    const panel = await openRegionsPanel()
    const item = await within(panel).findByRole('listitem')

    expect(within(item).getByRole('status')).toHaveTextContent(
      'Descargando… 25 %',
    )
    expect(within(item).getByRole('progressbar')).toHaveAttribute('value', '50')

    await userEvent.click(within(item).getByRole('button', { name: 'Pausar' }))
    expect(offlineRegions.pauseDownload).toHaveBeenCalledWith('zona-1')
  })

  it('una descarga en pausa por falta de conexión se muestra como zona incompleta que se retoma sola', async () => {
    renderApp({
      regions: [
        offlineRegion({
          status: 'paused',
          pauseReason: 'connectivity',
          downloadedTileCount: 40,
        }),
      ],
    })

    const panel = await openRegionsPanel()
    const item = await within(panel).findByRole('listitem')

    expect(within(item).getByRole('status')).toHaveTextContent(
      'En pausa: sin conexión. La descarga se retoma sola cuando vuelva la conexión.',
    )
    expect(within(item).getByText(/Zona incompleta/)).toBeVisible()
  })

  it('permite actualizar una zona ya descargada', async () => {
    const { offlineRegions } = renderApp({ regions: [offlineRegion()] })
    const panel = await openRegionsPanel()

    await userEvent.click(
      await within(panel).findByRole('button', { name: 'Actualizar' }),
    )

    expect(offlineRegions.refreshRegion).toHaveBeenCalledWith('zona-1')
  })

  it('borra una zona solo después de confirmar, y la zona desaparece de la lista', async () => {
    const user = userEvent.setup()
    const { offlineRegions } = renderApp({ regions: [offlineRegion()] })
    const panel = await openRegionsPanel()

    await user.click(
      await within(panel).findByRole('button', { name: 'Borrar' }),
    )

    expect(offlineRegions.deleteRegion).not.toHaveBeenCalled()
    expect(
      within(panel).getByText(/¿Borrar «Cuesta del Obispo»\?/),
    ).toBeVisible()

    await user.click(within(panel).getByRole('button', { name: 'Sí, borrar' }))

    expect(offlineRegions.deleteRegion).toHaveBeenCalledWith('zona-1')
    expect(
      await within(panel).findByRole('heading', {
        name: 'Todavía no descargaste ninguna zona',
      }),
    ).toBeVisible()
    expect(within(panel).queryAllByRole('listitem')).toHaveLength(0)
  })
})

describe('aviso de almacenamiento por agotarse', () => {
  it('ante la señal del navegador muestra cuánto ocupan las zonas y ofrece borrarlas, sin borrar ninguna', async () => {
    const regions = [
      offlineRegion({
        id: 'a',
        name: 'Cuesta del Obispo',
        sizeInBytes: 200 * MEGABYTE,
      }),
      offlineRegion({ id: 'b', name: 'Cachi', sizeInBytes: 100 * MEGABYTE }),
    ]
    const { offlineRegions } = renderApp({ regions, storageRunningLow: true })

    const warning = await screen.findByRole('alert')
    expect(warning).toHaveTextContent(
      /El almacenamiento del celular está por agotarse\. Tus zonas descargadas ocupan 300\sMB\./,
    )
    expect(warning).toHaveTextContent('Riders no borra nada por su cuenta')
    expect(offlineRegions.deleteRegion).not.toHaveBeenCalled()

    await userEvent.click(
      within(warning).getByRole('button', { name: 'Elegir zonas para borrar' }),
    )

    const panel = screen.getByRole('dialog', { name: 'Zonas descargadas' })
    expect(within(panel).getAllByRole('listitem')).toHaveLength(2)
    expect(
      within(panel).getAllByRole('button', { name: 'Borrar' }),
    ).toHaveLength(2)
    expect(offlineRegions.deleteRegion).not.toHaveBeenCalled()
  })

  it('no aparece mientras hay espacio suficiente', async () => {
    renderApp({ regions: [offlineRegion()] })

    await userEvent.click(
      screen.getByRole('button', { name: 'Zonas sin conexión' }),
    )
    await screen.findByRole('listitem')

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
