import type { Page } from '@playwright/test'
import { e2eMock } from '../../mocks/pocketbase-e2e'

/**
 * E2E Test Setup Helper
 * Provides utilities for test initialization and cleanup
 */

export class E2ETestSetup {
	constructor(private page: Page) {}

	/**
	 * Initialize fresh test data for each test
	 */
	async setupFreshTest() {
		// Seed mock data
		e2eMock.seed()

		// Mock PocketBase API endpoints
		await this.mockPocketBaseAPI()

		// Set viewport for consistent testing
		await this.page.setViewportSize({ width: 1280, height: 720 })
	}

	/**
	 * Setup mobile test environment
	 */
	async setupMobileTest() {
		e2eMock.seed()
		await this.mockPocketBaseAPI()
		await this.page.setViewportSize({ width: 375, height: 667 })
	}

	/**
	 * Mock all PocketBase API endpoints
	 */
	private async mockPocketBaseAPI() {
		const page = this.page

		// Mock auth endpoints
		await page.route('**/api/collections/users/auth-with-password', async (route) => {
			const request = route.request()
			const body = JSON.parse(request.postData() || '{}')

			// Find user by email/username
			const user = e2eMock
				.getUsers()
				.find((u) => u.email === body.identity || u.username === body.identity)

			if (user) {
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({
						token: `mock-token-${user.id}`,
						record: user
					})
				})
			} else {
				await route.fulfill({
					status: 400,
					contentType: 'application/json',
					body: JSON.stringify({ message: 'Invalid credentials' })
				})
			}
		})

		// Mock users collection
		await page.route('**/api/collections/users/records**', async (route) => {
			const method = route.request().method()

			if (method === 'GET') {
				const users = e2eMock.getUsers()
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({ items: users, totalItems: users.length })
				})
			} else if (method === 'PATCH') {
				const url = new URL(route.request().url())
				const userId = url.pathname.split('/').pop()
				const body = JSON.parse(route.request().postData() || '{}')

				if (userId) {
					const updated = e2eMock.updateUser(userId, body)
					await route.fulfill({
						status: 200,
						contentType: 'application/json',
						body: JSON.stringify(updated)
					})
				}
			}
		})

		// Mock settings collection
		await page.route('**/api/collections/settings/records**', async (route) => {
			const settings = e2eMock.getSettings()
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ items: [settings] })
			})
		})

		// Mock ratings collection
		await page.route('**/api/collections/ratings/records**', async (route) => {
			const method = route.request().method()

			if (method === 'GET') {
				const url = new URL(route.request().url())
				const round = url.searchParams.get('filter')?.includes('round') ? 1 : undefined
				const ratings = e2eMock.getRatings(round)
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({ items: ratings })
				})
			} else if (method === 'POST') {
				const body = JSON.parse(route.request().postData() || '{}')
				const rating = e2eMock.createRating(body)
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify(rating)
				})
			}
		})

		// Mock song choices collection
		await page.route('**/api/collections/song_choices/records**', async (route) => {
			const method = route.request().method()

			if (method === 'GET') {
				const choices = e2eMock.getSongChoices()
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({ items: choices })
				})
			} else if (method === 'POST') {
				const body = JSON.parse(route.request().postData() || '{}')
				const choice = e2eMock.updateSongChoice(body.userId, body.round, body)
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify(choice)
				})
			}
		})

		// Mock competition state collection
		await page.route('**/api/collections/competition_state/records**', async (route) => {
			const state = e2eMock.getCompetitionState()
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ items: [state] })
			})
		})

		// Mock admin API endpoints
		await this.mockAdminAPI()

		// Mock rating API endpoints
		await this.mockRatingAPI()

		// Mock song choice API endpoints
		await this.mockSongChoiceAPI()
	}

	private async mockAdminAPI() {
		await this.page.route('**/admin/api', async (route) => {
			const body = JSON.parse(route.request().postData() || '{}')
			const { action } = body

			let response: Record<string, unknown> = {}

			switch (action) {
				case 'start_competition':
					response = { state: e2eMock.startCompetition() }
					break
				case 'activate_rating_phase':
					response = { state: e2eMock.activateRatingPhase() }
					break
				case 'next_participant':
					response = { state: e2eMock.nextParticipant() }
					break
				case 'finalize_ratings':
					response = { state: e2eMock.finalizeRatings() }
					break
				case 'show_results':
					response = e2eMock.showResults()
					break
				case 'start_next_round':
					response = { state: e2eMock.startNextRound() }
					break
				case 'reset_game':
					response = { state: e2eMock.resetGame() }
					break
			}

			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(response)
			})
		})
	}

	private async mockRatingAPI() {
		await this.page.route('**/rating/api**', async (route) => {
			const method = route.request().method()

			if (method === 'GET') {
				const participants = e2eMock.getUsersByRole('participant')
				const ratings = e2eMock.getRatings(1) // Current round
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({ participants, ratings })
				})
			} else if (method === 'POST') {
				const body = JSON.parse(route.request().postData() || '{}')
				const rating = e2eMock.createRating({
					author: 'juror1', // Mock current user
					ratedUser: body.ratedUser,
					round: body.round,
					rating: body.rating,
					comment: body.comment || ''
				})
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify(rating)
				})
			}
		})

		await this.page.route('**/rating/state', async (route) => {
			const state = e2eMock.getCompetitionState()
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(state)
			})
		})
	}

	private async mockSongChoiceAPI() {
		await this.page.route('**/song-choice/api**', async (route) => {
			const method = route.request().method()

			if (method === 'GET') {
				const choices = e2eMock.getSongChoices('participant1') // Mock current user
				// Convert to expected format (5 songs)
				const songs = Array.from({ length: 5 }, (_, i) => {
					const choice = choices.find((c) => c.round === i + 1)
					return {
						artist: choice?.artist || '',
						songTitle: choice?.songTitle || '',
						appleMusicSongId: choice?.appleMusicSongId
					}
				})

				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({ songs })
				})
			} else if (method === 'POST') {
				const body = JSON.parse(route.request().postData() || '{}')
				const choice = e2eMock.updateSongChoice('participant1', body.round, body)
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify(choice)
				})
			}
		})
	}

	/**
	 * Login as specific user role
	 */
	async loginAs(role: 'admin' | 'participant' | 'juror', index = 1) {
		const userId = role === 'admin' ? 'admin1' : `${role}${index}`
		const user = e2eMock.getUserById(userId)

		if (!user) {
			throw new Error(`User ${userId} not found in test data`)
		}

		// Go to auth page and login
		await this.page.goto('/auth')
		await this.page.fill('input[name="identity"]', user.email)
		await this.page.fill('input[name="password"]', 'password123')
		await this.page.click('button[type="submit"]')

		// Wait for redirect to home page
		await this.page.waitForURL('/')
	}

	/**
	 * Logout current user
	 */
	async logout() {
		await this.page.goto('/profile')
		await this.page.click('button:has-text("Logout")')
		await this.page.waitForURL('/auth')
	}
}
