import type { Page } from '@playwright/test'
import { BasePage } from './base-page'

/**
 * Authentication Page Object Model
 */
export class AuthPage extends BasePage {
	// Locators
	private identityInput = this.page.locator('input[name="email"]')
	private passwordInput = this.page.locator('input[name="password"]')
	private loginButton = this.page.locator('button[type="submit"]')
	private errorMessage = this.page.locator('.text-rose-200')

	constructor(page: Page) {
		super(page)
	}

	async goto(): Promise<void> {
		await this.page.goto('/auth')
		await this.waitForLoad()
	}

	async isLoaded(): Promise<boolean> {
		// Wait for either login or signup form to be visible - faster timeout
		try {
			await this.page.waitForSelector('input[name="email"]', { timeout: 3000 })
			return true
		} catch {
			return false
		}
	}

	/**
	 * Login with credentials
	 */
	async login(identity: string, password: string): Promise<void> {
		// Ensure page is loaded and in login mode - faster timeout
		await this.page.waitForSelector('input[name="email"]', { timeout: 3000 })

		await this.identityInput.fill(identity)
		await this.passwordInput.fill(password)
		await this.loginButton.click()

		// Wait for navigation or error - faster timeout
		await Promise.race([
			this.page.waitForURL('/'),
			this.page.waitForSelector('.text-rose-200', { timeout: 2000 })
		])
	}

	/**
	 * Login as admin
	 */
	async loginAsAdmin(): Promise<void> {
		await this.login('admin@vocal.royale', 'ChangeMeNow!')
		// Login method already waits for navigation
	}

	/**
	 * Login as participant
	 */
	async loginAsParticipant(index = 1): Promise<void> {
		await this.login(`participant${index}@test.com`, 'password123')
		// Login method already waits for navigation
	}

	/**
	 * Login as juror
	 */
	async loginAsJuror(index = 1): Promise<void> {
		await this.login(`juror${index}@test.com`, 'password123')
	}

	/**
	 * Login as spectator
	 */
	async loginAsSpectator(index = 1): Promise<void> {
		await this.login(`spectator${index}@test.com`, 'password123')
	}

	/**
	 * Get error message
	 */
	async getErrorMessage(): Promise<string> {
		await this.errorMessage.waitFor({ state: 'visible' })
		return (await this.errorMessage.textContent()) || ''
	}

	/**
	 * Check if error is visible
	 */
	async hasError(): Promise<boolean> {
		return await this.errorMessage.isVisible()
	}

	/**
	 * Logout current user
	 */
	async logout(): Promise<void> {
		// Fast logout: clear cookies and navigate - no complex fallback
		await this.page.context().clearCookies()
		await this.page.goto('/auth')
		await this.waitForLoad()
	}
}
