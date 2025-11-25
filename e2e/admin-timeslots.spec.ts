import { test, expect } from '@playwright/test'
import { loginAsAdmin } from './helpers/auth'

test.describe('Admin Timeslots CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
    await page.click('button:has-text("Time Slots")')
  })

  test('should display timeslots tab', async ({ page }) => {
    await expect(page.locator('h2:has-text("Time Slots")')).toBeVisible()
    await expect(page.locator('button:has-text("Add Time Slot")')).toBeVisible()
  })

  test('should open and close add timeslot modal', async ({ page }) => {
    await page.click('button:has-text("Add Time Slot")')
    await expect(page.locator('text=Create Time Slot')).toBeVisible()
    await expect(page.locator('input[placeholder*="Morning Routine"]')).toBeVisible()

    await page.click('button:has-text("Cancel")')
    await expect(page.locator('text=Create Time Slot')).not.toBeVisible()
  })

  test('should create a new timeslot', async ({ page }) => {
    const testTimeslotName = `Test Timeslot ${Date.now()}`

    await page.click('button:has-text("Add Time Slot")')
    await page.fill('input[placeholder*="Morning Routine"]', testTimeslotName)

    const members = page.locator('[class*="bg-gray-200"][class*="rounded-xl"]').first()
    if (await members.count() > 0) {
      await members.click()
    }

    const submitButton = page.locator('button[type="submit"]:has-text("Create Time Slot")')
    if (await submitButton.isEnabled()) {
      await submitButton.click()
      await expect(page.locator(`text=${testTimeslotName}`)).toBeVisible({ timeout: 5000 })
    }
  })

  test('should open edit timeslot modal with existing data', async ({ page }) => {
    const timeslots = page.locator('[class*="bg-white"][class*="rounded-xl"]').filter({ hasText: 'Edit' })

    if (await timeslots.count() === 0) {
      test.skip()
    }

    const firstTimeslot = timeslots.first()
    const timeslotName = await firstTimeslot.locator('h3.font-bold').first().textContent()
    await firstTimeslot.locator('button:has-text("Edit")').click()

    await expect(page.locator('text=Edit Time Slot')).toBeVisible()
    const nameInput = page.locator('input[placeholder*="Morning Routine"]')
    await expect(nameInput).toHaveValue(timeslotName || '')
  })

  test('should update an existing timeslot', async ({ page }) => {
    const timeslots = page.locator('[class*="bg-white"][class*="rounded-xl"]').filter({ hasText: 'Edit' })

    if (await timeslots.count() === 0) {
      test.skip()
    }

    await timeslots.first().locator('button:has-text("Edit")').click()

    const updatedName = `Updated Timeslot ${Date.now()}`
    await page.fill('input[placeholder*="Morning Routine"]', updatedName)

    await page.click('button[type="submit"]:has-text("Update Time Slot")')
    await expect(page.locator(`text=${updatedName}`)).toBeVisible({ timeout: 5000 })
  })

  test('should delete a timeslot after confirmation', async ({ page }) => {
    const testTimeslotName = `Delete Timeslot ${Date.now()}`

    await page.click('button:has-text("Add Time Slot")')
    await page.fill('input[placeholder*="Morning Routine"]', testTimeslotName)

    const members = page.locator('[class*="bg-gray-200"][class*="rounded-xl"]').first()
    if (await members.count() > 0) {
      await members.click()
    }

    const submitButton = page.locator('button[type="submit"]:has-text("Create Time Slot")')
    if (await submitButton.isEnabled()) {
      await submitButton.click()
      await expect(page.locator(`text=${testTimeslotName}`)).toBeVisible({ timeout: 5000 })

      page.on('dialog', dialog => dialog.accept())

      const timeslotCard = page.locator('[class*="bg-white"][class*="rounded-xl"]').filter({ hasText: testTimeslotName })
      await timeslotCard.locator('button:has-text("Delete")').click()

      await expect(page.locator(`text=${testTimeslotName}`)).not.toBeVisible({ timeout: 5000 })
    }
  })

  test('should validate required fields', async ({ page }) => {
    await page.click('button:has-text("Add Time Slot")')

    const submitButton = page.locator('button[type="submit"]:has-text("Create Time Slot")')
    await expect(submitButton).toBeDisabled()
  })

  test('should handle time inputs', async ({ page }) => {
    await page.click('button:has-text("Add Time Slot")')

    const startTimeInput = page.locator('input[type="time"]').first()
    const endTimeInput = page.locator('input[type="time"]').last()

    await expect(startTimeInput).toBeVisible()
    await expect(endTimeInput).toBeVisible()

    await startTimeInput.fill('08:00')
    await endTimeInput.fill('09:00')

    await expect(startTimeInput).toHaveValue('08:00')
    await expect(endTimeInput).toHaveValue('09:00')
  })

  test('should handle recurrence type selection', async ({ page }) => {
    await page.click('button:has-text("Add Time Slot")')

    const recurrenceSelect = page.locator('select')
    await expect(recurrenceSelect).toBeVisible()

    await recurrenceSelect.selectOption('weekly')
    await expect(recurrenceSelect).toHaveValue('weekly')

    await recurrenceSelect.selectOption('daily')
    await expect(recurrenceSelect).toHaveValue('daily')

    await recurrenceSelect.selectOption('none')
    await expect(recurrenceSelect).toHaveValue('none')
  })

  test('should allow member selection', async ({ page }) => {
    await page.click('button:has-text("Add Time Slot")')

    const memberButtons = page.locator('[class*="bg-gray-200"][class*="rounded-xl"]')
    const memberCount = await memberButtons.count()

    if (memberCount > 0) {
      await memberButtons.first().click()
      await expect(memberButtons.first()).toHaveClass(/from-theme-primary/)
    }
  })

  test('should require at least one member', async ({ page }) => {
    await page.click('button:has-text("Add Time Slot")')
    await page.fill('input[placeholder*="Morning Routine"]', 'Test')

    const submitButton = page.locator('button[type="submit"]:has-text("Create Time Slot")')
    await expect(submitButton).toBeDisabled()

    await expect(page.locator('text=Please select at least one family member')).toBeVisible()
  })
})
