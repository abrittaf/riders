import { expect, test } from '@playwright/test'
import { openMapAt, readMapNumber } from './support/mapa.ts'

const CACHI = { latitude: -25.12, longitude: -66.165 }

test('con el proveedor PMTiles elegido por configuración, el mapa se dibuja desde el archivo', async ({
  page,
}) => {
  const tileRequestsToServer: string[] = []
  const archiveRequests: string[] = []
  page.on('request', (request) => {
    const url = request.url()
    if (url.includes('/planet')) tileRequestsToServer.push(url)
    if (url.endsWith('.pmtiles')) archiveRequests.push(url)
  })

  await openMapAt(page, { zoom: 14, ...CACHI })

  expect(await readMapNumber(page, 'data-rendered-roads')).toBeGreaterThan(0)
  expect(
    await readMapNumber(page, 'data-rendered-place-names'),
  ).toBeGreaterThan(0)
  expect(archiveRequests.length).toBeGreaterThan(0)
  expect(tileRequestsToServer).toEqual([])
})
