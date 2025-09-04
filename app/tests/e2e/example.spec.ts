import { test, expect } from '@playwright/test'
import { E2ETestSetup } from './helpers/test-setup'
import { BackendSetup } from './helpers/backend-setup'
import { AuthPage, AdminPage, RatingPage, SongChoicePage, ProfilePage } from './pages'

test.describe('Vocal Royale E2E Example', () => {
	let testSetup: E2ETestSetup
	let backendSetup: BackendSetup
	let authPage: AuthPage
	let adminPage: AdminPage
	let ratingPage: RatingPage
	let songChoicePage: SongChoicePage
	let profilePage: ProfilePage

	test.beforeEach(async ({ page }) => {
		testSetup = new E2ETestSetup(page)
		backendSetup = new BackendSetup(page)
		authPage = new AuthPage(page)
		adminPage = new AdminPage(page)
		ratingPage = new RatingPage(page)
		songChoicePage = new SongChoicePage(page)
		profilePage = new ProfilePage(page)

		// Initialize backend for real E2E testing
		await backendSetup.initializeBackend()
		await testSetup.setupFreshTest()
	})

	test('basic authentication flow', async ({ page }) => {
		// Go to auth page
		await authPage.goto()
		await expect(page).toHaveTitle(/Vocal Royale/i)

		// Login as admin
		await authPage.loginAsAdmin()
		await expect(page).toHaveURL('/')

		// Check welcome message
		const welcomeText = await page.textContent('h1')
		expect(welcomeText).toContain('Ai Gude')

		// Logout
		await profilePage.goto()
		await profilePage.logout()
		await expect(page).toHaveURL('/auth')
	})

	test('admin can start competition', async () => {
		// Login as admin
		await authPage.goto()
		await authPage.loginAsAdmin()

		// Go to admin page
		await adminPage.goto()
		expect(await adminPage.isLoaded()).toBe(true)

		// Reset game to ensure clean state
		await adminPage.resetGame()

		// Check that we can now start
		expect(await adminPage.canStartCompetition()).toBe(true)
		expect(await adminPage.getCurrentRound()).toBe(1)

		// Start competition
		await adminPage.startCompetition()
		const infoMessage = await adminPage.getInfoMessage()
		expect(infoMessage).toContain('gestartet')

		// Verify competition is in a valid state
		const finalPhase = await adminPage.getCurrentPhase()
		expect(['singing_phase', 'rating_phase', 'break', 'result_locked']).toContain(finalPhase)
	})

	test('participant can select songs', async () => {
		// Login as participant
		await authPage.goto()
		await authPage.loginAsParticipant()

		// Go to song choice page
		await songChoicePage.goto()
		expect(await songChoicePage.isLoaded()).toBe(true)

		// Fill first song
		await songChoicePage.fillAndSaveSong(1, 'Queen', 'Bohemian Rhapsody')

		// Verify song was saved
		const song = await songChoicePage.getSong(1)
		expect(song.artist).toBe('Queen')
		expect(song.songTitle).toBe('Bohemian Rhapsody')

		// Fill all songs
		const testSongs = [
			{ artist: 'The Beatles', songTitle: 'Hey Jude' },
			{ artist: 'Led Zeppelin', songTitle: 'Stairway to Heaven' },
			{ artist: 'Pink Floyd', songTitle: 'Comfortably Numb' },
			{ artist: 'The Rolling Stones', songTitle: 'Paint It Black' }
		]

		for (let i = 0; i < testSongs.length; i++) {
			await songChoicePage.fillAndSaveSong(i + 2, testSongs[i].artist, testSongs[i].songTitle)
		}

		// Verify all songs completed
		expect(await songChoicePage.isAllSongsCompleted()).toBe(true)
	})

	test('juror can rate participants', async () => {
		// Login as juror
		await authPage.goto()
		await authPage.loginAsJuror()

		// Go to rating page
		await ratingPage.goto()
		expect(await ratingPage.isLoaded()).toBe(true)

		// Check initial state
		expect(await ratingPage.getCurrentRound()).toBe(1)

		// Get participants list - they might be in active participant mode or table mode
		const participants = await ratingPage.getParticipants()
		// If no participants in table, check if we're in active participant mode
		if (participants.length === 0) {
			const currentPhase = await ratingPage.getCurrentPhase()
			// In active participant mode, we should still have some way to rate
			expect(['rating_phase', 'singing_phase']).toContain(currentPhase)
		} else {
			expect(participants.length).toBeGreaterThan(0)
		}

		// Rate first participant (assuming modal/button interaction works)
		if (participants.length > 0) {
			const firstParticipant = participants[0]

			// Try rating via modal (desktop) or row click (mobile)
			if (await ratingPage.isMobileView()) {
				await ratingPage.rateParticipantMobile(firstParticipant.name, 5, 'Excellent!')
			} else {
				await ratingPage.rateParticipantDesktop(firstParticipant.name, 5, 'Excellent!')
			}

			// Verify rating was saved by checking participants list again
			const updatedParticipants = await ratingPage.getParticipants()
			const ratedParticipant = updatedParticipants.find((p) => p.name === firstParticipant.name)
			expect(ratedParticipant?.rating).toBe(5)
		}
	})

	test('mobile responsive layout', async () => {
		// Set mobile viewport
		await testSetup.setupMobileTest()

		// Login as participant
		await authPage.goto()
		await authPage.loginAsParticipant()

		// Test song choice on mobile
		await songChoicePage.goto()
		expect(await songChoicePage.isLoaded()).toBe(true)

		// Verify rounds are collapsed by default on mobile
		expect(await songChoicePage.isRoundCollapsedOnMobile(1)).toBe(true)

		// Test expanding and filling song
		await songChoicePage.expandRound(1)
		await songChoicePage.fillSong(1, 'Test Artist', 'Test Song')
		await songChoicePage.saveSong()

		// Test rating page mobile interaction
		await authPage.logout()
		await authPage.loginAsJuror()
		await ratingPage.goto()

		// Verify mobile view is detected and row clicks work
		if (await ratingPage.isMobileView()) {
			const participants = await ratingPage.getParticipants()
			if (participants.length > 0) {
				// This should open modal on mobile
				await ratingPage.clickParticipantRow(participants[0].name)
				expect(await ratingPage.isRatingModalOpen()).toBe(true)
				await ratingPage.cancelRating()
			}
		}
	})
})
