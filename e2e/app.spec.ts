import { expect, test } from '@playwright/test'

test('la app abre y muestra su título', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Riders' })).toBeVisible()
})
