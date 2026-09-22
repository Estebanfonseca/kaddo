import { test, expect } from '@playwright/test'

// VS-099.1 — External refinement handoff smoke test.
// Admin does not run an LLM. A fresh draft shows "Needs refinement" and lets the human copy an
// agent-agnostic handoff. Refinement happens externally; Admin visualizes the result read-only.

test('a fresh draft shows Needs refinement and copies an agent handoff', async ({ page }) => {
  await page.goto('/work-items')
  await page.getByRole('button', { name: '+ Create Work Item' }).click()
  await page.getByLabel('What needs to change?').fill('Enable regular registration after the beta')
  await page.getByRole('button', { name: 'Create draft' }).click()

  // Lands on the Work Item detail with the captured intent and a Needs refinement state.
  await expect(page).toHaveURL(/\/work-items\/WI-\d+$/)
  await expect(page.getByText('Captured intent')).toBeVisible()
  await expect(page.getByText('Needs refinement')).toBeVisible()
  await expect(page.getByText('work-item-refinement', { exact: false }).first()).toBeVisible()

  // No LLM action exists.
  await expect(page.getByRole('button', { name: /Refine with AI/ })).toHaveCount(0)

  // Copy the handoff — the instructions reference the canonical agent and skill, no secrets.
  await page.getByRole('button', { name: 'Copy refinement handoff' }).click()
  const handoff = page.locator('pre')
  await expect(handoff).toBeVisible()
  await expect(handoff).toContainText('work-item-agent')
  await expect(handoff).toContainText('Do not implement')
})

test('a refined draft shows Refined and renders the structured review read-only', async ({ page }) => {
  // WI-003 is a refined draft fixture (outcome, modules, coverage, impact, acceptance).
  await page.goto('/work-items/WI-003')
  const main = page.locator('main')
  await expect(main.getByText('Refined', { exact: true })).toBeVisible()
  await expect(main.getByRole('heading', { name: 'Affected modules' })).toBeVisible()
  await expect(main.getByRole('heading', { name: 'Acceptance criteria' })).toBeVisible()
  // The review is read-only — no editable text or dropdown controls in the detail.
  await expect(main.getByRole('textbox')).toHaveCount(0)
  await expect(main.getByRole('combobox')).toHaveCount(0)
})
