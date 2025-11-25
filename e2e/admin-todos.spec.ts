import { test, expect } from '@playwright/test'
import { loginAsAdmin } from './helpers/auth'

test.describe('Admin Todos CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
    await page.click('button:has-text("Tasks")')
  })

  test('should display todos tab', async ({ page }) => {
    await expect(page.locator('h2:has-text("Tasks")')).toBeVisible()
    await expect(page.locator('button:has-text("Add Task")')).toBeVisible()
  })

  test('should open and close add todo modal', async ({ page }) => {
    await page.click('button:has-text("Add Task")')
    await expect(page.locator('h2:has-text("Create Task")')).toBeVisible()
    await expect(page.locator('input[placeholder*="Brush Teeth"]')).toBeVisible()

    await page.click('button:has-text("Cancel")')
    await expect(page.locator('h2:has-text("Create Task")')).not.toBeVisible()
  })

  test('should create a new todo', async ({ page }) => {
    const testTodoTitle = `Test Todo ${Date.now()}`

    await page.click('button:has-text("Add Task")')
    await page.fill('input[placeholder*="Brush Teeth"]', testTodoTitle)

    const timeslots = page.locator('[class*="bg-gray-100"][class*="rounded-xl"]').first()
    if (await timeslots.count() > 0) {
      await timeslots.click()
    }

    const submitButton = page.locator('button[type="submit"]:has-text("Create Task")')
    if (await submitButton.isEnabled()) {
      await submitButton.click()
      await expect(page.locator(`text=${testTodoTitle}`)).toBeVisible({ timeout: 5000 })
    }
  })

  test('should open edit todo modal with existing data', async ({ page }) => {
    const todos = page.locator('[class*="bg-white"][class*="rounded-xl"]').filter({ hasText: 'Edit' })

    if (await todos.count() === 0) {
      test.skip()
    }

    const firstTodo = todos.first()
    const todoTitle = await firstTodo.locator('h3.font-bold').first().textContent()
    await firstTodo.locator('button:has-text("Edit")').click()

    await expect(page.locator('text=Edit Task')).toBeVisible()
    const titleInput = page.locator('input[placeholder*="Brush Teeth"]')
    await expect(titleInput).toHaveValue(todoTitle || '')
  })

  test('should update an existing todo', async ({ page }) => {
    const todos = page.locator('[class*="bg-white"][class*="rounded-xl"]').filter({ hasText: 'Edit' })

    if (await todos.count() === 0) {
      test.skip()
    }

    await todos.first().locator('button:has-text("Edit")').click()

    const updatedTitle = `Updated Todo ${Date.now()}`
    await page.fill('input[placeholder*="Brush Teeth"]', updatedTitle)

    await page.click('button[type="submit"]:has-text("Update Task")')
    await expect(page.locator(`text=${updatedTitle}`)).toBeVisible({ timeout: 5000 })
  })

  test('should delete a todo after confirmation', async ({ page }) => {
    const testTodoTitle = `Delete Todo ${Date.now()}`

    await page.click('button:has-text("Add Task")')
    await page.fill('input[placeholder*="Brush Teeth"]', testTodoTitle)

    const timeslots = page.locator('[class*="bg-gray-100"][class*="rounded-xl"]').first()
    if (await timeslots.count() > 0) {
      await timeslots.click()
    }

    const submitButton = page.locator('button[type="submit"]:has-text("Create Task")')
    if (await submitButton.isEnabled()) {
      await submitButton.click()
      await expect(page.locator(`text=${testTodoTitle}`)).toBeVisible({ timeout: 5000 })

      page.on('dialog', dialog => dialog.accept())

      const todoCard = page.locator('[class*="bg-white"][class*="rounded-xl"]').filter({ hasText: testTodoTitle })
      await todoCard.locator('button:has-text("Delete")').click()

      await expect(page.locator(`text=${testTodoTitle}`)).not.toBeVisible({ timeout: 5000 })
    }
  })

  test('should validate required fields', async ({ page }) => {
    await page.click('button:has-text("Add Task")')

    const submitButton = page.locator('button[type="submit"]:has-text("Create Task")')
    await expect(submitButton).toBeDisabled()
  })

  test('should handle symbol/emoji input', async ({ page }) => {
    await page.click('button:has-text("Add Task")')

    const symbolInput = page.locator('input[placeholder*="🦷"]')
    await expect(symbolInput).toBeVisible()

    await symbolInput.fill('🎯')
    await expect(symbolInput).toHaveValue('🎯')
  })

  test('should handle description textarea', async ({ page }) => {
    await page.click('button:has-text("Add Task")')

    const descriptionTextarea = page.locator('textarea[placeholder*="instructions"]')
    await expect(descriptionTextarea).toBeVisible()

    const testDescription = 'This is a test description'
    await descriptionTextarea.fill(testDescription)
    await expect(descriptionTextarea).toHaveValue(testDescription)
  })

  test('should handle image upload field', async ({ page }) => {
    await page.click('button:has-text("Add Task")')
    await expect(page.locator('input[type="file"]')).toBeVisible()
  })

  test('should allow timeslot selection', async ({ page }) => {
    await page.click('button:has-text("Add Task")')

    const timeslotButtons = page.locator('[class*="bg-gray-100"][class*="rounded-xl"]')
    const timeslotCount = await timeslotButtons.count()

    if (timeslotCount > 0) {
      await timeslotButtons.first().click()
      await expect(timeslotButtons.first()).toHaveClass(/from-theme-primary/)
    }
  })

  test('should require at least one timeslot', async ({ page }) => {
    await page.click('button:has-text("Add Task")')
    await page.fill('input[placeholder*="Brush Teeth"]', 'Test Task')

    const submitButton = page.locator('button[type="submit"]:has-text("Create Task")')
    await expect(submitButton).toBeDisabled()

    await expect(page.locator('text=Please select at least one time slot')).toBeVisible()
  })

  test('should allow multiple timeslot selection', async ({ page }) => {
    await page.click('button:has-text("Add Task")')

    const timeslotButtons = page.locator('[class*="bg-gray-100"][class*="rounded-xl"]')
    const timeslotCount = await timeslotButtons.count()

    if (timeslotCount >= 2) {
      await timeslotButtons.nth(0).click()
      await timeslotButtons.nth(1).click()

      await expect(timeslotButtons.nth(0)).toHaveClass(/from-theme-primary/)
      await expect(timeslotButtons.nth(1)).toHaveClass(/from-theme-primary/)
    }
  })

  test('should display todo with symbol if provided', async ({ page }) => {
    const testTodoTitle = `Symbol Todo ${Date.now()}`
    const testSymbol = '🚀'

    await page.click('button:has-text("Add Task")')
    await page.fill('input[placeholder*="Brush Teeth"]', testTodoTitle)
    await page.fill('input[placeholder*="🦷"]', testSymbol)

    const timeslots = page.locator('[class*="bg-gray-100"][class*="rounded-xl"]').first()
    if (await timeslots.count() > 0) {
      await timeslots.click()
    }

    const submitButton = page.locator('button[type="submit"]:has-text("Create Task")')
    if (await submitButton.isEnabled()) {
      await submitButton.click()

      await expect(page.locator(`text=${testTodoTitle}`)).toBeVisible({ timeout: 5000 })
      await expect(page.locator(`text=${testSymbol}`)).toBeVisible({ timeout: 5000 })
    }
  })

  test('should show assigned timeslots as tags', async ({ page }) => {
    const todos = page.locator('[class*="bg-white"][class*="rounded-xl"]').filter({ hasText: 'Edit' })

    if (await todos.count() === 0) {
      test.skip()
    }

    const firstTodo = todos.first()
    const timeslotTags = firstTodo.locator('[class*="bg-purple-100"][class*="rounded-full"]')

    if (await timeslotTags.count() > 0) {
      await expect(timeslotTags.first()).toBeVisible()
    }
  })
})
