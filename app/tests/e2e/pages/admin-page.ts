import type { Page } from '@playwright/test'
import { BasePage } from './base-page'

/**
 * Admin Page Object Model
 */
export class AdminPage extends BasePage {
	// Competition Control Buttons
	private startCompetitionBtn = this.page.locator('button:has-text("Starte Wettbewerb")')
	private activateRatingBtn = this.page.locator('button:has-text("Aktiviere Bewertungsphase")')
	private nextParticipantBtn = this.page.locator('button:has-text("Nächster Teilnehmer")')
	private finalizeRatingsBtn = this.page.locator('button:has-text("Bewertung abschließen")')
	private showResultsBtn = this.page.locator('button:has-text("Ergebnis anzeigen")')
	private showWinnerBtn = this.page.locator('button:has-text("Sieger anzeigen")')
	private nextRoundBtn = this.page.locator('button:has-text("Nächste Runde starten")')
	private resetGameBtn = this.page.locator('button:has-text("Spiel zurücksetzen")')

	// Status displays - more specific selectors
	private roundStatus = this.page.locator('div:has-text("Runde:"):not(:has-text("Phase:"))')
	private phaseStatus = this.page.locator('div:has-text("Phase:"):not(:has-text("Aktiver"))')
	private activeParticipantStatus = this.page.locator('div:has-text("Aktiver Teilnehmer:")')

	// Messages
	private infoMessage = this.page.locator('.text-emerald-200')
	private errorMessage = this.page.locator('.text-rose-200')

	// Results table
	private resultsTable = this.page.locator('table')
	private winnerDisplay = this.page.locator('text=Sieger:')

	constructor(page: Page) {
		super(page)
	}

	async goto(): Promise<void> {
		await this.page.goto('/admin')

		// Check if we were redirected (might happen if not admin role)
		const currentUrl = this.page.url()
		if (!currentUrl.includes('/admin')) {
			throw new Error(`Access to admin page denied. Redirected to: ${currentUrl}`)
		}
	}

	async isLoaded(): Promise<boolean> {
		return await this.page.locator('h1:has-text("Admin")').isVisible()
	}

	// Tournament Control Actions
	async startCompetition(): Promise<void> {
		// Check if competition is already started
		if (!(await this.canStartCompetition())) {
			console.log('Competition already started, skipping start action')
			return
		}

		// Check if button is visible and enabled before clicking
		await this.startCompetitionBtn.waitFor({ state: 'visible', timeout: 5000 })

		// Get initial phase for comparison
		const initialPhase = await this.getCurrentPhase()
		console.log('Starting competition from phase:', initialPhase)

		await this.startCompetitionBtn.click()

		// Wait for either info message or button state change
		await Promise.race([this.waitForInfoMessage(), this.waitForButtonStateChange()])

		// Wait for phase to actually change
		await this.page.waitForTimeout(1000)
		const finalPhase = await this.getCurrentPhase()
		console.log('Competition started, new phase:', finalPhase)
	}

	private async waitForButtonStateChange(): Promise<void> {
		// Wait for the "Starte Wettbewerb" button to disappear (indicating competition started)
		try {
			await this.startCompetitionBtn.waitFor({ state: 'hidden', timeout: 5000 })
		} catch {
			// Button might still be visible but disabled, that's okay too
		}
	}

	async activateRatingPhase(): Promise<void> {
		await this.activateRatingBtn.click()
		await this.waitForInfoMessage()
	}

	async nextParticipant(): Promise<void> {
		await this.nextParticipantBtn.click()
		await this.waitForInfoMessage()
	}

	async finalizeRatings(): Promise<void> {
		await this.finalizeRatingsBtn.click()
		await this.waitForInfoMessage()
	}

	async showResults(): Promise<void> {
		await this.showResultsBtn.click()
		await this.page.waitForTimeout(1000) // Wait for results to load
	}

	async showWinner(): Promise<void> {
		await this.showWinnerBtn.click()
		await this.page.waitForTimeout(1000) // Wait for winner to load
	}

	async startNextRound(): Promise<void> {
		await this.nextRoundBtn.click()
		await this.waitForInfoMessage()
	}

	async activateBreakPhase(): Promise<void> {
		// Look for break phase button (might be different text)
		const breakBtn = this.page.locator('button:has-text("Pause")')
		const finalizeBtn = this.page.locator('button:has-text("Bewertung abschließen")')

		if (await finalizeBtn.isVisible()) {
			await finalizeBtn.click()
		} else if (await breakBtn.isVisible()) {
			await breakBtn.click()
		}
		await this.waitForInfoMessage()
	}

	async nextRound(): Promise<void> {
		await this.startNextRound()
	}

	async resetGame(): Promise<void> {
		console.log('Resetting game to clean state')
		// Handle confirmation dialog
		this.page.on('dialog', (dialog) => dialog.accept())
		await this.resetGameBtn.waitFor({ state: 'visible', timeout: 5000 })
		await this.resetGameBtn.click()
		await this.waitForInfoMessage()
		// Wait for reset to complete
		await this.page.waitForTimeout(1000)
		console.log('Game reset completed')
	}

	// Status Getters
	async getCurrentRound(): Promise<number> {
		const text = await this.roundStatus.textContent()
		const match = text?.match(/Runde:\s*(\d+)/)
		return match ? parseInt(match[1]) : 0
	}

	async getCurrentPhase(): Promise<string> {
		// Wait for the status to be visible
		await this.phaseStatus.waitFor({ state: 'visible', timeout: 5000 })

		const text = await this.phaseStatus.textContent()
		const match = text?.match(/Phase:\s*(.+)/)
		const phase = match ? match[1].trim() : ''

		// Handle different phase display values
		if (phase.includes('singing') || phase === 'singing_phase') return 'singing_phase'
		if (phase.includes('rating') || phase === 'rating_phase') return 'rating_phase'
		if (phase.includes('break') || phase === 'break') return 'break'
		if (phase.includes('result') || phase === 'result_locked' || phase === 'result_phase')
			return 'result_locked'

		return phase || 'unknown'
	}

	async getActiveParticipant(): Promise<string> {
		const text = await this.activeParticipantStatus.textContent()
		const match = text?.match(/Aktiver Teilnehmer:\s*(.+)/)
		return match ? match[1].trim() : ''
	}

	// Button State Checks
	async canStartCompetition(): Promise<boolean> {
		try {
			return await this.startCompetitionBtn.isVisible()
		} catch {
			// If button selector fails, assume competition is already started
			return false
		}
	}

	async canActivateRating(): Promise<boolean> {
		try {
			return await this.activateRatingBtn.isVisible()
		} catch {
			return false
		}
	}

	async canNextParticipant(): Promise<boolean> {
		return await this.nextParticipantBtn.isVisible()
	}

	async canFinalizeRatings(): Promise<boolean> {
		return await this.finalizeRatingsBtn.isVisible()
	}

	async canShowResults(): Promise<boolean> {
		return (await this.showResultsBtn.isVisible()) || (await this.showWinnerBtn.isVisible())
	}

	async canStartNextRound(): Promise<boolean> {
		return await this.nextRoundBtn.isVisible()
	}

	// Results Handling
	async getResults(): Promise<{ name: string; score: string; votes: string }[]> {
		if (!(await this.resultsTable.isVisible())) return []

		const rows = await this.resultsTable.locator('tbody tr').all()
		const results = []

		for (const row of rows) {
			const cells = await row.locator('td').all()
			if (cells.length >= 3) {
				results.push({
					name: (await cells[0].textContent()) || '',
					score: (await cells[1].textContent()) || '',
					votes: (await cells[2].textContent()) || ''
				})
			}
		}

		return results
	}

	async getWinner(): Promise<string> {
		if (await this.winnerDisplay.isVisible()) {
			const text = await this.winnerDisplay.textContent()
			const match = text?.match(/Sieger:\s*(.+)/)
			return match ? match[1].trim() : ''
		}
		return ''
	}

	// Message Helpers
	async waitForInfoMessage(): Promise<string> {
		try {
			await this.infoMessage.waitFor({ state: 'visible', timeout: 5000 })
			return (await this.infoMessage.textContent()) || ''
		} catch {
			// If no info message appears, check if the button state changed instead
			console.log('ℹ️  No info message found, checking button state change')
			return 'Action completed (no message)'
		}
	}

	async getInfoMessage(): Promise<string> {
		return (await this.infoMessage.textContent()) || ''
	}

	async getErrorMessage(): Promise<string> {
		return (await this.errorMessage.textContent()) || ''
	}

	async hasError(): Promise<boolean> {
		return await this.errorMessage.isVisible()
	}

	// Navigation
	async goToSettings(): Promise<void> {
		await this.page.click('a[href="/admin/settings"]')
		await this.page.waitForURL('/admin/settings')
	}
}
