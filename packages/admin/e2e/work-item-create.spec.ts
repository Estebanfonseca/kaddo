import { test, expect } from '@playwright/test'

// VS-099 — Work Item creation & refinement smoke test.
// Drives the real Admin write endpoints through the UI against the disposable fixture project.

test('create a draft, refine it, validate and mark ready', async ({ page }) => {
  await page.goto('/work-items')
  await page.getByRole('button', { name: '+ Create Work Item' }).click()
  await expect(page.getByRole('heading', { name: 'Create Work Item' })).toBeVisible()

  await page.getByLabel('What needs to change?').fill('Add a saved-searches feature')
  await page.getByRole('button', { name: 'Create draft' }).click()

  // Redirected to the editor for the new draft.
  await expect(page).toHaveURL(/\/work-items\/WI-\d+\/edit$/)
  await expect(page.getByText('Add a saved-searches feature').first()).toBeVisible()

  // Refine: target behavior, an affected module, scope confidence, one acceptance criterion.
  await page.getByLabel('Target behavior').fill('A user can save and reuse a search.')
  await page.getByLabel('Coverage for core').selectOption('affected')
  await page.getByLabel('Scope confidence level').selectOption('high')
  await page.getByRole('button', { name: '+ Add criterion' }).click()
  await page.getByLabel('Acceptance criterion 1').fill('A saved search can be re-run.')

  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByText(/remains Draft/)).toBeVisible()

  await page.getByRole('button', { name: 'Validate' }).click()
  await expect(page.getByText('can be marked Ready')).toBeVisible()

  await page.locator('div[style*="sticky"]').getByRole('button', { name: 'Mark ready' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('dialog').getByRole('button', { name: 'Mark ready' }).click()

  // Lands on the detail view as Ready.
  await expect(page).toHaveURL(/\/work-items\/WI-\d+$/)
  await expect(page.locator('main').getByText('ready', { exact: true }).first()).toBeVisible()
})

test('unsaved changes prompt appears when leaving the editor', async ({ page }) => {
  await page.goto('/work-items')
  await page.getByRole('button', { name: '+ Create Work Item' }).click()
  await page.getByLabel('What needs to change?').fill('Draft for unsaved test')
  await page.getByRole('button', { name: 'Create draft' }).click()
  await expect(page).toHaveURL(/\/work-items\/WI-\d+\/edit$/)

  await page.getByLabel('Actor').fill('Someone')
  await page.getByRole('button', { name: 'Back' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText('Leave without saving?')).toBeVisible()
})
