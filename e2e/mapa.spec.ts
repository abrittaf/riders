import { expect, test } from '@playwright/test'
import {
  BUENOS_AIRES,
  mapLocator,
  openMapAt,
  readMapNumber,
  waitForMapToSettle,
} from './support/mapa.ts'

test('el mapa abre sobre Argentina y muestra nombres de lugares', async ({
  page,
}) => {
  await page.goto('/')
  await waitForMapToSettle(page)

  const latitude = await readMapNumber(page, 'data-center-latitude')
  const longitude = await readMapNumber(page, 'data-center-longitude')
  expect(latitude).toBeGreaterThan(-56)
  expect(latitude).toBeLessThan(-21)
  expect(longitude).toBeGreaterThan(-74)
  expect(longitude).toBeLessThan(-53)
  expect(
    await readMapNumber(page, 'data-rendered-place-names'),
  ).toBeGreaterThan(0)
})

test('al nivel de una ciudad el mapa dibuja calles, rutas y sus nombres', async ({
  page,
}) => {
  await openMapAt(page, { zoom: 14, ...BUENOS_AIRES })

  expect(await readMapNumber(page, 'data-rendered-roads')).toBeGreaterThan(0)
  expect(await readMapNumber(page, 'data-rendered-road-names')).toBeGreaterThan(
    0,
  )
})

test.describe('gestos táctiles', () => {
  test('arrastrar con un dedo desplaza el mapa', async ({ page }) => {
    await openMapAt(page, { zoom: 12, ...BUENOS_AIRES })
    const box = (await mapLocator(page).boundingBox())!
    const start = { x: box.x + box.width / 2, y: box.y + box.height / 2 }
    const touch = await page.context().newCDPSession(page)

    await touch.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ ...start, id: 1 }],
    })
    for (let step = 1; step <= 10; step++) {
      await touch.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: start.x - step * 12, y: start.y, id: 1 }],
      })
    }
    await touch.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
    })

    await expect
      .poll(() => readMapNumber(page, 'data-center-longitude'))
      .toBeGreaterThan(BUENOS_AIRES.longitude + 0.01)
  })

  test('separar dos dedos acerca el mapa', async ({ page }) => {
    await openMapAt(page, { zoom: 12, ...BUENOS_AIRES })
    const box = (await mapLocator(page).boundingBox())!
    const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 }
    const touch = await page.context().newCDPSession(page)
    const fingersAt = (separation: number) => [
      { x: center.x - separation, y: center.y, id: 1 },
      { x: center.x + separation, y: center.y, id: 2 },
    ]

    await touch.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: fingersAt(30),
    })
    for (let step = 1; step <= 10; step++) {
      await touch.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: fingersAt(30 + step * 10),
      })
    }
    await touch.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
    })

    await expect
      .poll(() => readMapNumber(page, 'data-zoom'))
      .toBeGreaterThan(13)
  })
})

test('la atribución está siempre visible y abre el detalle de las fuentes', async ({
  page,
}) => {
  await openMapAt(page, { zoom: 12, ...BUENOS_AIRES })

  const attribution = page.getByRole('button', { name: 'Fuentes del mapa' })
  await expect(attribution).toBeVisible()
  await expect(attribution).toContainText('OpenStreetMap')
  await expect(attribution).toContainText('OpenMapTiles')

  await attribution.click()

  const sources = page.getByRole('dialog', {
    name: 'Fuentes de datos del mapa',
  })
  await expect(
    sources.getByRole('link', { name: 'OpenStreetMap' }),
  ).toHaveAttribute('href', 'https://www.openstreetmap.org/copyright')
  await expect(sources.getByText('Open Database License')).toBeVisible()
  // Condición de uso de los servidores de FOSSGIS: el contacto del operador, a la vista.
  await expect(
    sources.getByRole('link', { name: 'pattern-realism.72@icloud.com' }),
  ).toHaveAttribute('href', 'mailto:pattern-realism.72@icloud.com')
})
