import { expect, test } from '@playwright/test'

/**
 * Galería de rutas (`galeria-de-rutas.html`): un Roadmap sintético de tres Points cuya ruta recorre
 * las cuatro clases de superficie. La verificación es estructural, igual en cualquier sistema.
 */
async function openGallery(page: import('@playwright/test').Page) {
  await page.goto('/galeria-de-rutas.html')
  await expect(page.getByTestId('route-sample')).toHaveAttribute(
    'data-map-idle',
    'true',
  )
  return page.getByTestId('route-sample')
}

test('cada clase de superficie se dibuja con su estilo de línea: continua, discontinua, punteada, punto y raya', async ({
  page,
}) => {
  const sample = await openGallery(page)

  const dashes = JSON.parse(
    (await sample.getAttribute('data-route-layer-dashes'))!,
  ) as Record<string, number[] | null>
  // Continua: sin trazo. Discontinua: raya larga y hueco. Punteada: raya corta y hueco.
  // Punto y raya: raya larga, hueco, raya corta, hueco.
  expect(dashes['paved']).toBeNull()
  expect(dashes['compacted']).toHaveLength(2)
  expect(dashes['compacted']![0]).toBeGreaterThan(dashes['compacted']![1]!)
  expect(dashes['loose']).toHaveLength(2)
  expect(dashes['loose']![0]).toBeLessThan(dashes['loose']![1]!)
  expect(dashes['loose']![0]).toBeLessThan(dashes['compacted']![0]!)
  expect(dashes['unknown']).toHaveLength(4)
  expect(dashes['unknown']![0]).toBeGreaterThan(dashes['unknown']![2]!)
})

test('la ruta de la galería tiene las cuatro clases dibujadas, los Points numerados y la referencia de estilos', async ({
  page,
}) => {
  const sample = await openGallery(page)

  await expect(sample).toHaveAttribute(
    'data-route-surfaces',
    'compacted,loose,paved,unknown',
  )
  await expect(page.locator('.map-marker-point')).toHaveText(['1', '2', '3'])
  const legend = page.getByLabel('Referencia de estilos de la ruta')
  await expect(legend.locator('svg[data-surface]')).toHaveCount(4)
  for (const surface of ['paved', 'compacted', 'loose', 'unknown']) {
    await expect(legend.locator(`svg[data-surface="${surface}"]`)).toBeVisible()
  }
  await expect(legend).toContainText('Pavimento línea continua')
  await expect(legend).toContainText('Consolidado línea discontinua')
  await expect(legend).toContainText('Suelto línea punteada')
  await expect(legend).toContainText('Sin dato punto y raya')
})

// La captura de referencia se generó en macOS; en Linux (la máquina de GitHub) las fuentes del
// sistema cambian la altura de la referencia de estilos y la comparación falla por layout, no por
// la ruta. Queda como prueba local en macOS; la estructura la cubren las pruebas de arriba.
test('la ruta se dibuja como en la captura de referencia (solo en macOS)', async ({
  page,
}) => {
  test.skip(
    process.platform !== 'darwin' || !!process.env.CI,
    'La captura de referencia es de macOS: las fuentes de otros sistemas cambian el layout.',
  )
  await openGallery(page)

  await expect(page.locator('.route-gallery')).toHaveScreenshot(
    'ruta-superficies.png',
  )
})
