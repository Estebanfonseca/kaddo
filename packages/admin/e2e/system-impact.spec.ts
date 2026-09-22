import { test, expect } from '@playwright/test'

// VS-101 / VS-101.1 — Graph-Assisted Impact Analysis smoke test.
// Fixture WI-007 carries confirmed, explainable system impact (one affected with reason/graph
// reason/evidence, one reviewed-not-affected, one unknown) resolved against the declared topology.
// Verifies the Work Item SYSTEM IMPACT section, per-entity explainability, and the System Explorer
// ?workItem= overlay. Everything here is read-only visualization.

test('Work Item detail shows the confirmed system impact with counts', async ({ page }) => {
  await page.goto('/work-items/WI-007')
  const main = page.locator('main')
  await expect(main.getByRole('heading', { name: 'System impact' })).toBeVisible()
  await expect(main.getByText('affected', { exact: false }).first()).toBeVisible()
  // Every classification is present as a navigable row.
  await expect(main.getByRole('button', { name: /Public Registration/ })).toBeVisible()
  await expect(main.getByRole('button', { name: /Registration API/ })).toBeVisible()
  await expect(main.getByRole('button', { name: /Supabase/ })).toBeVisible()
  // Honest framing: the Graph does not decide scope.
  await expect(main.getByText(/does not decide scope/)).toBeVisible()
})

test('per-entity evidence explains why/how/what without exposing reasoning', async ({ page }) => {
  await page.goto('/work-items/WI-007')
  const main = page.locator('main')
  // Expand the affected entity's evidence.
  await main.getByRole('button', { name: 'View evidence' }).first().click()
  await expect(main.getByText('Why reviewed')).toBeVisible()
  await expect(main.getByText('Graph reason')).toBeVisible()
  await expect(main.getByText('Repository evidence')).toBeVisible()
  await expect(main.getByText('Conclusion')).toBeVisible()
  await expect(main.getByText(/user-facing entry point/i)).toBeVisible()
})

test('View in System Explorer opens the impact overlay', async ({ page }) => {
  await page.goto('/work-items/WI-007')
  await page.locator('main').getByRole('button', { name: /View in System Explorer/ }).click()
  await expect(page).toHaveURL(/\/system\?workItem=WI-007$/)
  // The overlay banner names the Work Item and exposes selectable counts + a legend.
  await expect(page.getByText(/Impact view ·/)).toBeVisible()
  await expect(page.getByRole('button', { name: /Affected 1/ })).toBeVisible()
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
  await expect(page.getByText(/Impact view ·/)).toHaveCount(0)
})
