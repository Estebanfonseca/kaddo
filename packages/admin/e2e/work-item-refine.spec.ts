import { test, expect } from '@playwright/test'

// VS-099.1 — LLM-assisted refinement smoke test.
// Runs against the disposable fixture project with the deterministic heuristic provider (no API
// key configured), so the propose → review → feedback → apply flow is verified offline.

test('create, refine with AI, give feedback, and apply the proposal', async ({ page }) => {
  await page.goto('/work-items')
  await page.getByRole('button', { name: '+ Create Work Item' }).click()
  await page.getByLabel('What needs to change?').fill('Enable regular registration after the beta')
  await page.getByRole('button', { name: 'Create draft' }).click()

  // Lands on the refine screen for the new draft.
  await expect(page).toHaveURL(/\/work-items\/WI-\d+\/refine$/)
  await expect(page.getByText('Captured intent')).toBeVisible()

  // Run refinement — a structured proposal appears, marked Not applied.
  await page.getByRole('button', { name: 'Refine with AI' }).click()
  await expect(page.getByText('AI refinement proposal')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('Not applied')).toBeVisible()
  await expect(page.getByText('Target behavior')).toBeVisible()
  await expect(page.locator('main').getByText('core', { exact: true }).first()).toBeVisible()

  // Natural-language feedback → refine again → still a proposal (frontend now in scope).
  await page.getByLabel('Refinement feedback').fill('Review the frontend. The public registration page still shows beta messaging.')
  await page.getByRole('button', { name: 'Refine again' }).click()
  await expect(page.getByText('AI refinement proposal')).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('main').getByText('frontend', { exact: true }).first()).toBeVisible()

  // Apply → confirmation → applied summary; the Work Item stays Draft.
  await page.getByRole('button', { name: 'Apply refinement' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('dialog').getByRole('button', { name: 'Apply refinement' }).click()
  await expect(page.getByText('Refinement applied')).toBeVisible()
  await expect(page.getByText(/remains Draft/)).toBeVisible()
})

test('the capture form shows the CLI parity questions', async ({ page }) => {
  await page.goto('/work-items/new')
  await expect(page.getByText('What problem does this solve?')).toBeVisible()
  await expect(page.getByText('What are the acceptance criteria?', { exact: false })).toBeVisible()
})
