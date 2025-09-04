import { test, expect } from '@playwright/test'

test.describe('Basic E2E Tests', () => {
	test('can load auth page and has correct title', async ({ page }) => {
		// Go to auth page
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

	test.skip('signup form is accessible', async ({ page }) => {
		// TODO: Fix signup form field selectors
		await page.goto('/auth?mode=signup')

		// Check signup form exists
		const emailInput = page.locator('input[name="email"]')
		const firstNameInput = page.locator('input[name="firstName"]')
		const lastNameInput = page.locator('input[name="lastName"]')
		const artistNameInput = page.locator('input[name="artistName"]')
		const passwordInput = page.locator('input[name="password"]')
		const signupButton = page.locator('button[type="submit"]')

		await expect(emailInput).toBeVisible()
		await expect(firstNameInput).toBeVisible()
		await expect(lastNameInput).toBeVisible()
		await expect(artistNameInput).toBeVisible()
		await expect(passwordInput).toBeVisible()
		await expect(signupButton).toBeVisible()
	})

	test.skip('can navigate between login and signup', async ({ page }) => {
		// TODO: Fix auth navigation logic
		// Start at login
		await page.goto('/auth')
		await expect(page.locator('h2')).toContainText('Login')

		// Click "Noch nicht registriert?" link
		await page.click('text=Noch nicht registriert?')

		// Should be in signup mode
		await expect(page).toHaveURL(/mode=signup/)
		await expect(page.locator('h2')).toContainText('Sign up')

		// Go back to login via URL
		await page.goto('/auth')
		await expect(page.locator('h2')).toContainText('Login')
	})
})
