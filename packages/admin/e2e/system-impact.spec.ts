import { test, expect } from '@playwright/test'

// VS-101 — Graph-Assisted Impact Analysis smoke test.
// Fixture WI-007 carries confirmed system impact (one affected entity, one reviewed-not-affected,
// one unknown) resolved against the declared topology. Verifies the Work Item SYSTEM IMPACT section
// and the System Explorer ?workItem= overlay. Everything here is read-only visualization.

test('Work Item detail shows the confirmed system impact', async ({ page }) => {
  await page.goto('/work-items/WI-007')
  const main = page.locator('main')
  await expect(main.getByRole('heading', { name: 'System impact' })).toBeVisible()
  // Counts: 1 affected, 1 reviewed-not-affected, 1 unknown.
  await expect(main.getByText('affected', { exact: false }).first()).toBeVisible()
  // The affected entity is navigable.
  await expect(main.getByRole('button', { name: /Public Registration/ })).toBeVisible()
  // Honest framing: the Graph does not decide scope.
  await expect(main.getByText(/does not decide scope/)).toBeVisible()
})

test('View in System Explorer opens the impact overlay', async ({ page }) => {
  await page.goto('/work-items/WI-007')
  await page.locator('main').getByRole('button', { name: /View in System Explorer/ }).click()
  await expect(page).toHaveURL(/\/system\?workItem=WI-007$/)
  // The overlay banner names the Work Item and summarizes the impact.
  await expect(page.getByText(/System impact ·/)).toBeVisible()
  await expect(page.getByRole('button', { name: /Clear impact/ })).toBeVisible()
})

test('the overlay highlights the affected entity and clears cleanly', async ({ page }) => {
  await page.goto('/system?workItem=WI-007')
  const main = page.locator('main')
  // The affected node carries an "Affected" overlay label on the canvas.
  await expect(main.getByText('Affected').first()).toBeVisible()
  // Clearing the overlay returns to the plain System Explorer.
  await page.getByRole('button', { name: /Clear impact/ }).click()
  await expect(page).toHaveURL(/\/system$/)
  await expect(page.getByText(/System impact ·/)).toHaveCount(0)
})
