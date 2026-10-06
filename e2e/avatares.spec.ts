import { expect, test } from '@playwright/test'
import { representativeAvatars } from '../src/avatar/representative-avatars.ts'

// Capturas de referencia del sistema de avatares en tamaño de perfil y de marcador.
for (const name of Object.keys(representativeAvatars)) {
  test(`el avatar ${name} se dibuja como en la referencia`, async ({
    page,
  }) => {
    await page.goto('/galeria-de-avatares.html')
    await expect(page.getByTestId(name)).toHaveScreenshot(`${name}.png`)
  })
}
