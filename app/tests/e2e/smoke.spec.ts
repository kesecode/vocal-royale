import { test, expect } from '@playwright/test'
import { E2ETestSetup } from './helpers/test-setup'
import { BackendSetup } from './helpers/backend-setup'
import { AuthPage } from './pages'

/**
 * Smoke Tests - Fast fail-fast tests to catch basic issues
 * These run first and fail quickly if fundamental problems exist
 */
test.describe('Smoke Tests - Fail Fast', () => {
	let testSetup: E2ETestSetup
	let backendSetup: BackendSetup
	let authPage: AuthPage

	test.beforeEach(async ({ page }) => {
		testSetup = new E2ETestSetup(page)
		backendSetup = new BackendSetup(page)
		authPage = new AuthPage(page)

		await testSetup.setupFreshTest()
	})

	test('backend is accessible', async ({ page }) => {
		// Test backend connection without full setup - fastest possible check
		const response = await page.request.get('http://127.0.0.1:7090/')
		expect(response.status()).toBe(404) // PocketBase returns 404 for root
	})

	test('frontend loads', async ({ page }) => {
		await page.goto('/')
		// Should redirect to auth if not logged in - accept query parameters
		await expect(page).toHaveURL(/\/auth/)

		// Page should load within timeout
		await expect(page.locator('input[name="email"]')).toBeVisible()
	})

	test('can create backend connection', async () => {
		// Quick backend setup test - no full initialization
		await backendSetup.initializeBackend(false)
		// If this passes, backend is working
	})

	test('basic auth flow works', async ({ page }) => {
		await backendSetup.initializeBackend(false)

		await authPage.goto()
		await authPage.loginAsAdmin()

		// Should be redirected to dashboard
		await expect(page).toHaveURL('/')
	})
})
