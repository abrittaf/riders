import { expect, test } from '@playwright/test'
import {
  BUENOS_AIRES,
  mapLocator,
  openMapAt,
  readMapNumber,
} from './support/mapa.ts'

test('sostener el dedo sobre el mapa entrega la posición tocada', async ({
  page,
}) => {
  await openMapAt(page, { zoom: 12, ...BUENOS_AIRES })
  const box = (await mapLocator(page).boundingBox())!
  const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 }
  const touch = await page.context().newCDPSession(page)

  await touch.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ ...center, id: 1 }],
  })
  await page.waitForTimeout(700)
  await touch.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  })

  await expect(mapLocator(page)).toHaveAttribute('data-long-press-position')
  const [latitude, longitude] = (await mapLocator(page).getAttribute(
    'data-long-press-position',
  ))!
    .split(',')
    .map(Number)
  // El centro de la pantalla es el centro del mapa.
  expect(latitude).toBeCloseTo(
    await readMapNumber(page, 'data-center-latitude'),
    3,
  )
  expect(longitude).toBeCloseTo(
    await readMapNumber(page, 'data-center-longitude'),
    3,
  )
})

test('un toque corto no cuenta como toque sostenido', async ({ page }) => {
  await openMapAt(page, { zoom: 12, ...BUENOS_AIRES })
  const box = (await mapLocator(page).boundingBox())!
  const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 }
  const touch = await page.context().newCDPSession(page)

  await touch.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ ...center, id: 1 }],
  })
  await page.waitForTimeout(150)
  await touch.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  })
  await page.waitForTimeout(700)

  await expect(mapLocator(page)).not.toHaveAttribute('data-long-press-position')
})

test('las estaciones de servicio de la zona visible se leen de las teselas cargadas', async ({
  page,
}) => {
  await openMapAt(page, { zoom: 14, ...BUENOS_AIRES })

  await expect
    .poll(async () => {
      const names = JSON.parse(
        (await mapLocator(page).getAttribute('data-fuel-places-in-view')) ??
          '[]',
      ) as string[]
      return names.length
    })
    .toBeGreaterThan(0)
})
