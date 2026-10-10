import { expect, test } from '@playwright/test'

// Captura de referencia de la ruta de un Roadmap con las cuatro clases de superficie
// (continua, discontinua, punteada, punto y raya), los Points numerados y la referencia de estilos.
test('la ruta se dibuja por segmentos con el estilo de su superficie, como en la referencia', async ({
  page,
}) => {
  await page.goto('/galeria-de-rutas.html')
  await expect(page.getByTestId('route-sample')).toHaveAttribute(
    'data-map-idle',
    'true',
  )

  await expect(page.locator('.route-gallery')).toHaveScreenshot(
    'ruta-superficies.png',
  )
})
