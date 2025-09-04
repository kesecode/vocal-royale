import type { Page } from '@playwright/test'
import { BasePage } from './base-page'

/**
 * Rating Page Object Model
 */
export class RatingPage extends BasePage {
	// Page elements
	private pageTitle = this.page.locator('h1:has-text("Bewertung")')
	private roundIndicator = this.page.locator('.font-semibold:has-text("Runde")')
	private participantTable = this.page.locator('table')
	private ratingModal = this.page.locator('.overlay')

	// Progress rounds component
	private progressRounds = this.page.locator('.panel:has(.font-semibold:has-text("Runde"))')

	// Active participant rating (inline)
	private activeParticipantSection = this.page.locator(
		'[class*="space-y-3"]:has(.text-lg.font-semibold)'
	)
	private starRating = this.page.locator('.stars')
	private commentInput = this.page.locator('input[placeholder*="max. 100 Zeichen"]')
	private saveButton = this.page.locator('button:has-text("Speichern")')

	// Modal elements
	private modalStarRating = this.ratingModal.locator('.stars')
	private modalCommentInput = this.ratingModal.locator('input[placeholder*="max. 100 Zeichen"]')
	private modalSaveButton = this.ratingModal.locator('button:has-text("Speichern")')
	private modalCancelButton = this.ratingModal.locator('button:has-text("Abbrechen")')

	constructor(page: Page) {
		super(page)
	}

	async goto(): Promise<void> {
		try {
			await this.page.goto('/rating')
		} catch (error) {
			// Handle navigation interruption gracefully
			const currentUrl = this.page.url()
			if (currentUrl.includes('/profile')) {
				// User was redirected to profile - this might be expected behavior
				console.log('Rating page redirect to profile detected')
			} else {
				throw error
			}
		}
	}

	async isLoaded(): Promise<boolean> {
		return await this.pageTitle.isVisible()
	}

	// Round Navigation
	async selectRound(roundNumber: number): Promise<void> {
		// Click on specific round in progress component
		const roundButton = this.progressRounds.locator(`button:has-text("${roundNumber}")`)
		if (await roundButton.isVisible()) {
			await roundButton.click()
			await this.waitForLoad()
		}
	}

	async getCurrentRound(): Promise<number> {
		const text = await this.roundIndicator.textContent()
		const match = text?.match(/Runde\s+(\d+)/)
		return match ? parseInt(match[1]) : 1
	}

	// Participant Table Interactions
	async getParticipants(): Promise<{ name: string; rating: number }[]> {
		// Wait for the page to be fully loaded
		await this.page.waitForTimeout(1000)

		// First check if table exists and is visible
		if (!(await this.participantTable.isVisible())) {
			// Maybe we're in active participant phase, check if there's an active participant
			if (await this.activeParticipantSection.isVisible()) {
				const name = await this.page.locator('.text-lg.font-semibold').textContent()
				if (name?.trim()) {
					return [{ name: name.trim(), rating: 0 }]
				}
			}
			return []
		}

		// Wait for rows to be rendered
		await this.page.waitForTimeout(500)
		const rows = await this.participantTable.locator('tbody tr').all()

		if (rows.length === 0) return []

		const participants = []

		for (const row of rows) {
			const nameCell = row.locator('td').first()
			const ratingCell = row.locator('td').nth(1)

			const name = (await nameCell.textContent())?.trim() || ''
			// Check for StarRating component within the rating cell
			const stars = await ratingCell.locator('.star.on').count()

			if (name) {
				participants.push({ name, rating: stars })
			}
		}

		return participants
	}

	async clickParticipantRow(participantName: string): Promise<void> {
		const row = this.participantTable.locator(`tr:has-text("${participantName}")`)
		await row.click()

		// Wait for modal to open
		await this.ratingModal.waitFor({ state: 'visible' })
	}

	async clickRateButton(participantName: string): Promise<void> {
		const row = this.participantTable.locator(`tr:has-text("${participantName}")`)
		const button = row.locator('button:has-text("Bewerten")')
		await button.click()

		// Wait for modal to open
		await this.ratingModal.waitFor({ state: 'visible' })
	}

	// Active Participant Rating (inline form)
	async getActiveParticipant(): Promise<string> {
		if (await this.activeParticipantSection.isVisible()) {
			const nameElement = this.activeParticipantSection.locator('.text-lg.font-semibold')
			return (await nameElement.textContent())?.trim() || ''
		}
		return ''
	}

	async rateActiveParticipant(stars: number, comment?: string): Promise<void> {
		// Check if there are 3 separate star rating sections (juror)
		const allStarRatings = await this.starRating.count()

		if (allStarRatings >= 3) {
			// This is a juror with 3 separate ratings
			const performanceStars = this.page.locator('.stars').first()
			const vocalStars = this.page.locator('.stars').nth(1)
			const difficultyStars = this.page.locator('.stars').nth(2)

			await performanceStars
				.locator('.star')
				.nth(stars - 1)
				.click()
			await vocalStars
				.locator('.star')
				.nth(stars - 1)
				.click()
			await difficultyStars
				.locator('.star')
				.nth(stars - 1)
				.click()
		} else {
			// Regular single star rating
			const star = this.starRating.locator('.star').nth(stars - 1)
			await star.click()
		}

		// Add comment if provided
		if (comment) {
			await this.commentInput.fill(comment)
		}

		// Save rating
		await this.saveButton.click()
		await this.waitForSuccessMessage()
	}

	// Modal Rating
	async isRatingModalOpen(): Promise<boolean> {
		return await this.ratingModal.isVisible()
	}

	async getModalParticipantName(): Promise<string> {
		if (await this.ratingModal.isVisible()) {
			const nameElement = this.ratingModal.locator('.text-lg.font-semibold')
			return (await nameElement.textContent())?.trim() || ''
		}
		return ''
	}

	async rateInModal(stars: number, comment?: string): Promise<void> {
		// Check if this is a juror modal (with 3 separate ratings)
		const performanceStars = this.ratingModal.locator('.stars').first()
		const vocalStars = this.ratingModal.locator('.stars').nth(1)
		const difficultyStars = this.ratingModal.locator('.stars').nth(2)

		if (
			(await performanceStars.isVisible()) &&
			(await vocalStars.isVisible()) &&
			(await difficultyStars.isVisible())
		) {
			// This is a juror with 3 separate ratings
			await performanceStars
				.locator('.star')
				.nth(stars - 1)
				.click()
			await vocalStars
				.locator('.star')
				.nth(stars - 1)
				.click()
			await difficultyStars
				.locator('.star')
				.nth(stars - 1)
				.click()
		} else {
			// Regular single star rating
			const star = this.modalStarRating.locator('.star').nth(stars - 1)
			await star.click()
		}

		// Add comment if provided
		if (comment) {
			await this.modalCommentInput.fill(comment)
		}

		// Save rating
		await this.modalSaveButton.click()
		await this.waitForSuccessMessage()
	}

	async cancelRating(): Promise<void> {
		await this.modalCancelButton.click()
		await this.ratingModal.waitFor({ state: 'hidden' })
	}

	async closeRatingModal(): Promise<void> {
		await this.closeModal()
	}

	// Rating State Checks
	async getCurrentRating(): Promise<number> {
		const activeStars = await this.starRating.locator('.star.on').count()
		return activeStars
	}

	async getModalCurrentRating(): Promise<number> {
		const activeStars = await this.modalStarRating.locator('.star.on').count()
		return activeStars
	}

	async getCurrentComment(): Promise<string> {
		return (await this.commentInput.inputValue()).trim()
	}

	async getModalCurrentComment(): Promise<string> {
		return (await this.modalCommentInput.inputValue()).trim()
	}

	// Competition State Checks
	async isCompetitionFinished(): Promise<boolean> {
		return await this.page.locator('text=Wettbewerb beendet').isVisible()
	}

	async getWinner(): Promise<string> {
		const winnerElement = this.page.locator('text=Sieger:').locator('..')
		if (await winnerElement.isVisible()) {
			const text = await winnerElement.textContent()
			const match = text?.match(/Sieger:\s*(.+)/)
			return match ? match[1].trim() : ''
		}
		return ''
	}

	async getCurrentPhase(): Promise<string> {
		// Check for competition finished first
		if (await this.isCompetitionFinished()) return 'finished'

		// Wait a bit for page to stabilize
		await this.page.waitForTimeout(500)

		// Check for different phase indicators
		const singingPhaseText = this.page.locator('text=Enjoy the show!')
		if (await singingPhaseText.isVisible()) return 'singing_phase'

		// Check if active participant rating is visible (rating_phase)
		if (await this.activeParticipantSection.isVisible()) return 'rating_phase'

		// Check if participant table with rate buttons is visible (break/result_locked)
		const rateButtons = this.page.locator('button:has-text("Bewerten")')
		if ((await this.participantTable.isVisible()) && (await rateButtons.count()) > 0) return 'break'

		// Check if participant table is visible without rate buttons (result_locked)
		if (await this.participantTable.isVisible()) return 'result_locked'

		// Check if results are being shown
		const resultsText = this.page.locator('text=Ergebnisse')
		if (await resultsText.isVisible()) return 'result_phase'

		// Fallback: Check for any indication of the phase
		const pageText = await this.page.textContent('body')
		if (pageText?.includes('Bewertung')) return 'break'

		return 'unknown'
	}

	// Mobile-specific methods
	async isMobileView(): Promise<boolean> {
		// Check viewport width instead of button visibility
		const viewportSize = this.page.viewportSize()
		return viewportSize ? viewportSize.width <= 768 : false
	}

	async rateParticipantMobile(
		participantName: string,
		stars: number,
		comment?: string
	): Promise<void> {
		// On mobile, click the row directly
		await this.clickParticipantRow(participantName)
		await this.rateInModal(stars, comment)
	}

	async rateParticipantDesktop(
		participantName: string,
		stars: number,
		comment?: string
	): Promise<void> {
		// On desktop, click the rate button
		await this.clickRateButton(participantName)
		await this.rateInModal(stars, comment)
	}
}
