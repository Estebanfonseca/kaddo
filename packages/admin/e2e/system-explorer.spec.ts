import { test, expect } from '@playwright/test'

// VS-100 — System Explorer smoke test.
// The fixture project has knowledge layers, an ADR and Work Items, so the projection has nodes and
// relationships. Verifies navigation, rendering, node details and cross-navigation to Work Items.

test('System is enabled and renders the system map', async ({ page }) => {
  await page.goto('/system')
  // Sidebar item is active (no longer "Soon").
  const active = page.locator('aside button[aria-current="page"]')
  await expect(active).toContainText('System')
  // The toolbar reports node/relationship counts and coverage.
  await expect(page.getByText(/nodes ·/)).toBeVisible()
  // Nodes render on the canvas.
  await expect(page.getByText('WI-007', { exact: false }).first()).toBeVisible()
})

test('a node deep link opens the details panel and navigates to the Work Item', async ({ page }) => {
  await page.goto('/system?node=wi:WI-007')
  const main = page.locator('main')
  // The details panel heading is the node's label (unique to the panel, not the filter options).
  await expect(main.getByRole('heading', { name: 'Refine onboarding checklist' })).toBeVisible()
  await expect(main.getByText('Knowledge context')).toBeVisible()
  await expect(main.getByRole('button', { name: /depends on/ }).first()).toBeVisible()

  // Cross-navigation to the Work Item detail.
  await main.getByRole('button', { name: /WI-007/ }).first().click()
  await expect(page).toHaveURL(/\/work-items\/WI-007$/)
})

test('search focuses a node and opens its details', async ({ page }) => {
  await page.goto('/system')
  await page.getByRole('searchbox', { name: 'Search system' }).fill('checklist')
  await page.getByRole('button', { name: /checklist/i }).first().click()
  await expect(page.locator('main').getByText('Knowledge context')).toBeVisible()
})

test('type filter narrows the map without breaking it', async ({ page }) => {
  await page.goto('/system')
  await page.getByLabel('Filter by type').selectOption('work-item')
  // Still renders (work item nodes remain); non-empty.
  await expect(page.getByText(/nodes ·/)).toBeVisible()
})

test('topology-first: implementation artifacts are an off-by-default overlay', async ({ page }) => {
  await page.goto('/system')
  // Honest topology note (this fixture has no semantic system nodes).
  await expect(page.getByText(/Semantic system topology isn't available/)).toBeVisible()
  // Implementation overlay is off by default — no code-glob nodes on the canvas.
  await expect(page.locator('main').getByText('src/onboarding/**')).toHaveCount(0)
  // Enabling it adds the implementation artifacts.
  await page.getByLabel('Toggle Implementation').check()
  await expect(page.locator('main').getByText('src/onboarding/**').first()).toBeVisible()
})

test('node details group neighbours by dimension (knowledge vs implementation)', async ({ page }) => {
  await page.goto('/system?node=wi:WI-007')
  const panel = page.locator('aside').filter({ hasText: 'Refine onboarding checklist' })
  await expect(panel.getByText('Knowledge context')).toBeVisible()
  await expect(panel.getByText('Implementation', { exact: true })).toBeVisible()
})
