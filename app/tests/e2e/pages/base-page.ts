import type { Page, Locator } from '@playwright/test'

/**
 * Base Page Object Model
 * Provides common functionality for all pages
 */
export abstract class BasePage {
	protected constructor(protected page: Page) {}

	/**
	 * Navigate to the page
	 */
	abstract goto(): Promise<void>

	/**
	 * Wait for page to load
	 */
	async waitForLoad(): Promise<void> {
		await this.page.waitForLoadState('networkidle')
	}

	/**
	 * Check if page is loaded by looking for specific elements
	 */
	abstract isLoaded(): Promise<boolean>

	/**
	 * Get page title
	 */
	async getTitle(): Promise<string> {
		return await this.page.title()
	}

	/**
	 * Take screenshot
	 */
	async screenshot(name: string): Promise<void> {
		await this.page.screenshot({ path: `tests/e2e/screenshots/${name}.png` })
	}

	/**
	 * Wait for element to be visible
	 */
	async waitForVisible(selector: string): Promise<Locator> {
		const element = this.page.locator(selector)
		await element.waitFor({ state: 'visible' })
		return element
	}

	/**
	 * Check if modal is open
	 */
	async isModalOpen(): Promise<boolean> {
		const modal = this.page.locator('.overlay')
		return await modal.isVisible()
	}

	/**
	 * Close modal if open
	 */
	async closeModal(): Promise<void> {
		if (await this.isModalOpen()) {
			await this.page.locator('.overlay-backdrop').click()
		}
	}

	/**
	 * Fill form field
	 */
	async fillField(selector: string, value: string): Promise<void> {
		await this.page.fill(selector, value)
	}

	/**
	 * Click button by text
	 */
	async clickButton(text: string): Promise<void> {
		await this.page.click(`button:has-text("${text}")`)
	}

	/**
	 * Check if button is disabled
	 */
	async isButtonDisabled(text: string): Promise<boolean> {
		const button = this.page.locator(`button:has-text("${text}")`)
		return await button.isDisabled()
	}

	/**
	 * Wait for success message
	 */
	async waitForSuccessMessage(timeout = 5000): Promise<string> {
		const message = await this.page.waitForSelector('.text-emerald-200, .text-green-400', {
			timeout
		})
		return (await message.textContent()) || ''
	}

	/**
	 * Wait for error message
	 */
	async waitForErrorMessage(timeout = 5000): Promise<string> {
		const message = await this.page.waitForSelector('.text-rose-200, .text-red-400', { timeout })
		return (await message.textContent()) || ''
	}

	/**
	 * Check if user is on mobile viewport
	 */
	async isMobile(): Promise<boolean> {
		const viewport = this.page.viewportSize()
		return viewport ? viewport.width < 768 : false
	}

	/**
	 * Get page URL
	 */
	async getUrl(): Promise<string> {
		return this.page.url()
	}

	/**
	 * Reload page
	 */
	async reload(): Promise<void> {
		await this.page.reload()
	}

	/**
	 * Wait for timeout
	 */
	async waitForTimeout(timeout: number): Promise<void> {
		await this.page.waitForTimeout(timeout)
	}

	/**
	 * Get locator for selector
	 */
	getLocator(selector: string): import('@playwright/test').Locator {
		return this.page.locator(selector)
	}
}
