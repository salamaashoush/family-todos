import { test, expect } from '@playwright/test'
import { loginAsAdmin } from './helpers/auth'

test.describe('Admin Members CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
    await page.click('button:has-text("Family Members")')
  })

  test('should display members tab', async ({ page }) => {
    await expect(page.locator('h2:has-text("Family Members")')).toBeVisible()
    await expect(page.locator('button:has-text("Add Member")')).toBeVisible()
  })

  test('should open and close add member modal', async ({ page }) => {
    await page.click('button:has-text("Add Member")')
    await expect(page.locator('text=Add Family Member')).toBeVisible()
    await expect(page.locator('input[placeholder*="e.g., John"]')).toBeVisible()

    await page.click('button:has-text("Cancel")')
    await expect(page.locator('text=Add Family Member')).not.toBeVisible()
  })

  test('should create a new member', async ({ page }) => {
    const testMemberName = `Test Member ${Date.now()}`

    await page.click('button:has-text("Add Member")')
    await page.fill('input[placeholder*="e.g., John"]', testMemberName)

    const submitButton = page.locator('button[type="submit"]:has-text("Add Family Member")')
    await submitButton.click()

    await expect(page.locator(`text=${testMemberName}`)).toBeVisible({ timeout: 5000 })
  })

  test('should open edit member modal with existing data', async ({ page }) => {
    const members = page.locator('[class*="bg-white"][class*="rounded-xl"]').filter({ hasText: 'Edit' })
    const firstMember = members.first()

    if (await firstMember.count() === 0) {
      test.skip()
    }

    const memberName = await firstMember.locator('div.font-bold').first().textContent()
    await firstMember.locator('button:has-text("Edit")').click()

    await expect(page.locator('text=Edit Family Member')).toBeVisible()
    const nameInput = page.locator('input[placeholder*="e.g., John"]')
    await expect(nameInput).toHaveValue(memberName || '')
  })

  test('should update an existing member', async ({ page }) => {
    const members = page.locator('[class*="bg-white"][class*="rounded-xl"]').filter({ hasText: 'Edit' })

    if (await members.count() === 0) {
      test.skip()
    }

    await members.first().locator('button:has-text("Edit")').click()

    const updatedName = `Updated Member ${Date.now()}`
    await page.fill('input[placeholder*="e.g., John"]', updatedName)

    await page.click('button[type="submit"]:has-text("Update Family Member")')
    await expect(page.locator(`text=${updatedName}`)).toBeVisible({ timeout: 5000 })
  })

  test('should delete a member after confirmation', async ({ page }) => {
    const testMemberName = `Delete Test ${Date.now()}`

    await page.click('button:has-text("Add Member")')
    await page.fill('input[placeholder*="e.g., John"]', testMemberName)
    await page.click('button[type="submit"]:has-text("Add Family Member")')
    await expect(page.locator(`text=${testMemberName}`)).toBeVisible({ timeout: 5000 })

    page.on('dialog', dialog => dialog.accept())

    const memberCard = page.locator('[class*="bg-white"][class*="rounded-xl"]').filter({ hasText: testMemberName })
    await memberCard.locator('button:has-text("Delete")').click()

    await expect(page.locator(`text=${testMemberName}`)).not.toBeVisible({ timeout: 5000 })
  })

  test('should validate required fields', async ({ page }) => {
    await page.click('button:has-text("Add Member")')

    const submitButton = page.locator('button[type="submit"]:has-text("Add Family Member")')
    await expect(submitButton).toBeDisabled()
  })

  test('should handle image upload field', async ({ page }) => {
    await page.click('button:has-text("Add Member")')
    await expect(page.locator('input[type="file"]')).toBeVisible()
  })

  test('should toggle admin status', async ({ page }) => {
    await page.click('button:has-text("Add Member")')

    const adminCheckbox = page.locator('input[type="checkbox"]')
    await expect(adminCheckbox).toBeVisible()

    await adminCheckbox.check()
    await expect(adminCheckbox).toBeChecked()

    await adminCheckbox.uncheck()
    await expect(adminCheckbox).not.toBeChecked()
  })
})
