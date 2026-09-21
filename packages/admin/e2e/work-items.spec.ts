import { test, expect, type Page } from '@playwright/test'

// VS-098.2 — Work Item Browser smoke tests.
// Route-aware navigation, modern Work Item delivery detail, multirepo evidence and legacy
// regression, driven against the real Admin server over a fixture project.

async function activeNav(page: Page): Promise<string | null> {
  const active = page.locator('aside button[aria-current="page"]')
  if ((await active.count()) === 0) return null
  return (await active.first().innerText()).replace('Soon', '').trim()
}

test.describe('Route-aware navigation', () => {
  test('Overview is active only on /overview', async ({ page }) => {
    await page.goto('/overview')
    await expect(page.getByRole('heading', { level: 2 })).toBeVisible()
    expect(await activeNav(page)).toContain('Overview')
  })

  test('Work Items stays active on a nested Work Item route', async ({ page }) => {
    await page.goto('/work-items/WI-002')
    await expect(page.getByRole('heading', { name: 'Enable regular registration after beta' })).toBeVisible()
    expect(await activeNav(page)).toContain('Work Items')
  })

  test('Knowledge stays active on a nested Knowledge route', async ({ page }) => {
    await page.goto('/knowledge/tech/ADR-004')
    expect(await activeNav(page)).toContain('Knowledge')
  })
})

test.describe('Work Item Browser', () => {
  test('lists work items with count tabs and grouping', async ({ page }) => {
    await page.goto('/work-items')
    await expect(page.getByRole('heading', { name: 'Work Items' })).toBeVisible()
    await expect(page.getByText('Add profile birth date')).toHaveCount(0) // not in this fixture
    await expect(page.getByText('Enable regular registration after beta')).toBeVisible()
    await expect(page.getByText('Listar últimas compras en reportes de métricas generales')).toBeVisible()
    // Grouping headers
    await expect(page.getByRole('heading', { name: 'Active' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Completed' })).toBeVisible()
  })

  test('search filters the list', async ({ page }) => {
    await page.goto('/work-items')
    await page.getByRole('searchbox', { name: 'Search work items' }).fill('registration')
    await expect(page.getByText('Enable regular registration after beta')).toBeVisible()
    await expect(page.getByText('Listar últimas compras')).toHaveCount(0)
  })
})

test.describe('Modern Work Item detail', () => {
  test('shows lifecycle, implementation, validation and release independently', async ({ page }) => {
    await page.goto('/work-items/WI-002')
    const main = page.locator('main')
    await expect(main.getByText('Implementation', { exact: true }).first()).toBeVisible()
    await expect(main.getByText('Accepted With Exceptions')).toBeVisible()
    await expect(main.getByText('Blocked', { exact: true }).first()).toBeVisible()
    // Lifecycle badge remains "completed" despite blocked release
    await expect(main.getByText('completed', { exact: true }).first()).toBeVisible()
  })

  test('shows affected modules, module coverage and impact analysis', async ({ page }) => {
    await page.goto('/work-items/WI-002')
    const main = page.locator('main')
    await expect(main.getByText('AFFECTED MODULES')).toBeVisible()
    await expect(main.getByText('MODULE COVERAGE')).toBeVisible()
    await expect(main.getByText('Reviewed — not affected')).toBeVisible()
    await expect(main.getByText('IMPACT ANALYSIS')).toBeVisible()
  })

  test('shows multirepo implementation evidence, release gates and completion exceptions', async ({ page }) => {
    await page.goto('/work-items/WI-002')
    const main = page.locator('main')
    await expect(main.getByText('IMPLEMENTATION EVIDENCE')).toBeVisible()
    await expect(main.getByText('src/registration/api.ts')).toBeVisible()
    await expect(main.getByText('src/pages/register/Register.tsx')).toBeVisible()
    await expect(main.getByText('RELEASE GATES')).toBeVisible()
    await expect(main.getByText('COMPLETION EXCEPTIONS')).toBeVisible()
  })
})

test.describe('Legacy Work Item detail', () => {
  test('completed stays completed, scope not assessed, evidence not recorded', async ({ page }) => {
    await page.goto('/work-items/WI-001')
    const main = page.locator('main')
    await expect(main.getByText('completed', { exact: true }).first()).toBeVisible()
    await expect(main.getByText('Not assessed')).toBeVisible()
    await expect(main.getByText('Not recorded', { exact: true })).toBeVisible()
    // No modern-only sections are rendered as empty blocks
    await expect(main.getByText('MODULE COVERAGE')).toHaveCount(0)
    await expect(main.getByText('IMPLEMENTATION EVIDENCE')).toHaveCount(0)
    await expect(main.getByText('RELEASE GATES')).toHaveCount(0)
  })

  test('long path does not cause horizontal overflow', async ({ page }) => {
    await page.goto('/work-items/WI-001')
    await page.setViewportSize({ width: 375, height: 812 })
    const overflow = await page.evaluate(() => document.body.scrollWidth > window.innerWidth + 1)
    expect(overflow).toBe(false)
  })
})

test.describe('Not found', () => {
  test('unknown work item shows a friendly not-found page', async ({ page }) => {
    await page.goto('/work-items/WI-DOES-NOT-EXIST')
    await expect(page.getByText('Work Item not found')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Back to Work Items' })).toBeVisible()
  })
})
