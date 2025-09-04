import type { Page } from '@playwright/test'
import { BasePage } from './base-page'

/**
 * Song Choice Page Object Model
 */
export class SongChoicePage extends BasePage {
	// Page elements
	private pageTitle = this.page.locator('h1:has-text("Songauswahl")')
	private description = this.page.locator('p:has-text("Trage bis zu 5 Songs")')

	constructor(page: Page) {
		super(page)
	}

	async goto(): Promise<void> {
		// Try navigation with retry logic for interrupted navigations
		let attempts = 0
		const maxAttempts = 3

		while (attempts < maxAttempts) {
			try {
				await this.page.goto('/song-choice', { waitUntil: 'load', timeout: 10000 })
				// Check if we actually landed on the song-choice page
				if (await this.isLoaded()) {
					return
				}
				// If not loaded correctly, try again
				attempts++
			} catch (error) {
				attempts++
				if (attempts >= maxAttempts) {
					throw error
				}
				// Wait a bit before retrying
				await this.page.waitForTimeout(1000)
			}
		}
	}

	async isLoaded(): Promise<boolean> {
		return await this.pageTitle.isVisible()
	}

	// Round Panel Methods
	private getRoundPanel(round: number) {
		return this.page.locator(`.panel:has(.font-semibold:has-text("Runde ${round}"))`)
	}

	private getRoundButton(round: number) {
		return this.getRoundPanel(round).locator('button[aria-expanded]')
	}

	async isRoundExpanded(round: number): Promise<boolean> {
		const button = this.getRoundButton(round)
		const expanded = await button.getAttribute('aria-expanded')
		return expanded === 'true'
	}

	async expandRound(round: number): Promise<void> {
		const roundIndex = round - 1 // Convert 1-based to 0-based

		if (!(await this.isRoundExpanded(round))) {
			const button = this.getRoundButton(round)
			await button.waitFor({ state: 'visible', timeout: 5000 })
			await button.click()

			// Wait for the inputs to become visible with correct IDs
			const artistInput = this.page.locator(`input[id="artist-${roundIndex}"]`)
			await artistInput.waitFor({ state: 'visible', timeout: 5000 })
		}
	}

	async collapseRound(round: number): Promise<void> {
		if (await this.isRoundExpanded(round)) {
			await this.getRoundButton(round).click()
			await this.page.waitForTimeout(300) // Wait for animation
		}
	}

	// Song Input Methods
	async fillSong(round: number, artist: string, songTitle: string): Promise<void> {
		const roundIndex = round - 1 // Convert 1-based to 0-based

		await this.expandRound(round)

		// Use direct selectors instead of panel-based approach
		const artistInput = this.page.locator(`input[id="artist-${roundIndex}"]`)
		const titleInput = this.page.locator(`input[id="songTitle-${roundIndex}"]`)

		// Ensure inputs are visible and interactable
		await artistInput.waitFor({ state: 'visible', timeout: 5000 })
		await titleInput.waitFor({ state: 'visible', timeout: 5000 })

		// Clear existing values and fill new ones
		await artistInput.fill('')
		await artistInput.fill(artist)
		await titleInput.fill('')
		await titleInput.fill(songTitle)
	}

	async getSong(round: number): Promise<{ artist: string; songTitle: string }> {
		const roundIndex = round - 1 // Convert 1-based to 0-based

		await this.expandRound(round)

		// Use direct selectors
		const artistInput = this.page.locator(`input[id="artist-${roundIndex}"]`)
		const titleInput = this.page.locator(`input[id="songTitle-${roundIndex}"]`)

		const artist = (await artistInput.inputValue()).trim()
		const songTitle = (await titleInput.inputValue()).trim()

		return { artist, songTitle }
	}

	async saveSong(): Promise<void> {
		// Look for the save button within the expanded panel
		const saveButton = this.page.locator('button:has-text("Speichern")').first()
		await saveButton.waitFor({ state: 'visible', timeout: 5000 })
		await saveButton.click()
	}

	async fillAndSaveSong(round: number, artist: string, songTitle: string): Promise<void> {
		await this.fillSong(round, artist, songTitle)
		await this.saveSong()
		await this.waitForSaveSuccess(round)
	}

	// Success/Error Messages
	async waitForSaveSuccess(round: number): Promise<void> {
		const panel = this.getRoundPanel(round)
		const successMessage = panel.locator('span:has-text("Gespeichert!")')
		await successMessage.waitFor({ state: 'visible', timeout: 5000 })
		// Wait for message to disappear
		await successMessage.waitFor({ state: 'hidden', timeout: 2000 })
	}

	async getSaveError(round: number): Promise<string> {
		const panel = this.getRoundPanel(round)
		const errorMessage = panel.locator('.text-rose-200')
		return (await errorMessage.textContent()) || ''
	}

	async hasSaveError(round: number): Promise<boolean> {
		const panel = this.getRoundPanel(round)
		const errorMessage = panel.locator('.text-rose-200')
		return await errorMessage.isVisible()
	}

	// Apple Music Integration
	async hasAppleMusicLink(round: number): Promise<boolean> {
		const panel = this.getRoundPanel(round)
		const appleMusicButton = panel.locator('button:has(.apple-mark)')
		return await appleMusicButton.isVisible()
	}

	async clickAppleMusicLink(round: number): Promise<void> {
		const panel = this.getRoundPanel(round)
		const appleMusicButton = panel.locator('button:has(.apple-mark)')

		// Listen for new page/popup
		const [newPage] = await Promise.all([
			this.page.context().waitForEvent('page'),
			appleMusicButton.click()
		])

		await newPage.close()
	}

	// Validation Methods
	async isSaveButtonDisabled(round: number): Promise<boolean> {
		const panel = this.getRoundPanel(round)
		const saveButton = panel.locator('button:has-text("Speichern")')
		return await saveButton.isDisabled()
	}

	async validateRequiredFields(round: number): Promise<{ artist: boolean; songTitle: boolean }> {
		await this.expandRound(round)

		const panel = this.getRoundPanel(round)
		const artistInput = panel.locator(`input[id="artist-${round - 1}"]`)
		const titleInput = panel.locator(`input[id="songTitle-${round - 1}"]`)

		// Try to save without filling
		await this.saveSong()

		return {
			artist: (await artistInput.inputValue()).trim() === '',
			songTitle: (await titleInput.inputValue()).trim() === ''
		}
	}

	// Bulk Operations
	async fillAllSongs(songs: { artist: string; songTitle: string }[]): Promise<void> {
		for (let i = 0; i < Math.min(songs.length, 5); i++) {
			const round = i + 1
			const song = songs[i]
			await this.fillAndSaveSong(round, song.artist, song.songTitle)
		}
	}

	async getAllSongs(): Promise<{ artist: string; songTitle: string }[]> {
		const songs = []
		for (let round = 1; round <= 5; round++) {
			const song = await this.getSong(round)
			songs.push(song)
		}
		return songs
	}

	// Page State
	async getCompletedRounds(): Promise<number[]> {
		const completed = []
		for (let round = 1; round <= 5; round++) {
			const song = await this.getSong(round)
			if (song.artist.trim() && song.songTitle.trim()) {
				completed.push(round)
			}
		}
		return completed
	}

	async isAllSongsCompleted(): Promise<boolean> {
		const completed = await this.getCompletedRounds()
		return completed.length === 5
	}

	async getCurrentRound(): Promise<number> {
		// Look for current round indicator in the page
		const roundText = this.getLocator('text=/Runde \\d+/')
		if (await roundText.isVisible()) {
			const text = await roundText.textContent()
			const match = text?.match(/Runde (\d+)/)
			return match ? parseInt(match[1]) : 1
		}
		return 1
	}

	// Mobile Specific
	async isRoundCollapsedOnMobile(round: number): Promise<boolean> {
		const isMobile = await this.isMobile()
		if (!isMobile) return false

		return !(await this.isRoundExpanded(round))
	}

	// Accessibility
	async checkRoundAccessibility(round: number): Promise<{
		hasProperLabels: boolean
		hasAriaExpanded: boolean
		hasAriaControls: boolean
	}> {
		const panel = this.getRoundPanel(round)
		const button = this.getRoundButton(round)
		const artistInput = panel.locator(`input[id="artist-${round - 1}"]`)
		const titleInput = panel.locator(`input[id="songTitle-${round - 1}"]`)

		return {
			hasProperLabels:
				(await artistInput.getAttribute('id')) === `artist-${round - 1}` &&
				(await titleInput.getAttribute('id')) === `songTitle-${round - 1}`,
			hasAriaExpanded: (await button.getAttribute('aria-expanded')) !== null,
			hasAriaControls: (await button.getAttribute('aria-controls')) !== null
		}
	}
}
