import { Page, expect } from '@playwright/test'

export async function loginAsAdmin(page: Page) {
  await page.goto('/login')

  // Wait for the page to be fully loaded and React to hydrate
  await page.waitForLoadState('networkidle')

  await page.fill('input#username', 'admin')
  await page.fill('input#password', 'changeme123')

  const submitButton = page.locator('button[type="submit"]')

  // Wait for the button to be ready (not disabled) before clicking
  await submitButton.waitFor({ state: 'visible' })
  await expect(submitButton).not.toBeDisabled()

  await submitButton.click()

  // Wait for navigation to admin page
  await page.waitForURL('**/admin', { timeout: 20000 })
  await page.waitForLoadState('domcontentloaded')
}
