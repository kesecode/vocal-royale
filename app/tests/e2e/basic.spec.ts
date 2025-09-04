import { test, expect } from '@playwright/test'

test.describe('Basic E2E Tests', () => {
	test('can load auth page and has correct title', async ({ page }) => {
		await page.goto('/auth')

		// Check page title
		await expect(page).toHaveTitle(/Vocal Royale/i)

		// Check auth form exists
		const emailInput = page.locator('input[name="email"]')
		const passwordInput = page.locator('input[name="password"]')
		const loginButton = page.locator('button[type="submit"]')

		await expect(emailInput).toBeVisible()
		await expect(passwordInput).toBeVisible()
		await expect(loginButton).toBeVisible()
	})
})
