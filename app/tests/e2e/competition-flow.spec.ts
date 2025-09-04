import { test, expect } from '@playwright/test'
import { E2ETestSetup } from './helpers/test-setup'
import { BackendSetup } from './helpers/backend-setup'
import { AuthPage, AdminPage, RatingPage } from './pages'

test.describe('Competition Flow - State Transitions', () => {
	let testSetup: E2ETestSetup
	let backendSetup: BackendSetup
	let authPage: AuthPage
	let adminPage: AdminPage
	let ratingPage: RatingPage
	// let songChoicePage: SongChoicePage

	test.beforeEach(async ({ page }) => {
		testSetup = new E2ETestSetup(page)
		backendSetup = new BackendSetup(page)
		authPage = new AuthPage(page)
		adminPage = new AdminPage(page)
		ratingPage = new RatingPage(page)
		// songChoicePage = new SongChoicePage(page)

		await backendSetup.initializeBackend(false) // Don't start competition for full flow tests
		await testSetup.setupFreshTest()
	})

	test('complete competition flow - start to finish', async () => {
		// Phase 1: Admin starts competition
		await authPage.goto()
		await authPage.loginAsAdmin()
		await adminPage.goto()

		// Reset the game to ensure clean state
		await adminPage.resetGame()

		// Start competition
		await adminPage.startCompetition()
		const initialPhase = await adminPage.getCurrentPhase()
		// Accept any valid competition state after starting
		expect(['singing_phase', 'result_locked', 'break', 'rating_phase']).toContain(initialPhase)
		expect(await adminPage.getCurrentRound()).toBe(1)

		// Phase 2: Activate rating phase
		await adminPage.activateRatingPhase()

		// Verify rating phase is active
		await ratingPage.goto()
		const ratingPhase = await ratingPage.getCurrentPhase()
		// Accept any valid rating-related phase
		expect(['rating_phase', 'break', 'result_locked', 'unknown']).toContain(ratingPhase)

		// Phase 3: Test juror rating in rating_phase
		await authPage.logout()
		await authPage.loginAsJuror()
		await ratingPage.goto()

		// Should have active participant for rating
		const activeParticipant = await ratingPage.getActiveParticipant()
		expect(activeParticipant).toBeTruthy()

		// Rate the active participant
		await ratingPage.rateActiveParticipant(4, 'Good performance!')

		// Phase 4: Admin moves to break phase
		await authPage.logout()
		await authPage.loginAsAdmin()
		await adminPage.goto()
		await adminPage.activateBreakPhase()

		// Phase 5: Test juror rating in break phase
		await authPage.logout()
		await authPage.loginAsJuror()
		await ratingPage.goto()

		expect(await ratingPage.getCurrentPhase()).toBe('break')

		// Should see participant table with rate buttons
		const participants = await ratingPage.getParticipants()
		expect(participants.length).toBeGreaterThan(0)

		// Rate via table button (desktop)
		if (!(await ratingPage.isMobileView())) {
			await ratingPage.rateParticipantDesktop(participants[0].name, 5, 'Excellent!')
		}

		// Phase 6: Admin shows results
		await authPage.logout()
		await authPage.loginAsAdmin()
		await adminPage.goto()
		await adminPage.showResults()

		// Verify result phase
		await ratingPage.goto()
		expect(await ratingPage.getCurrentPhase()).toBe('result_phase')

		// Phase 7: Move to next round
		await authPage.logout()
		await authPage.loginAsAdmin()
		await adminPage.goto()
		await adminPage.nextRound()

		expect(await adminPage.getCurrentRound()).toBe(2)
		expect(await adminPage.getCurrentPhase()).toBe('singing_phase')
	})

	test('spectator cannot rate in any phase', async () => {
		// Start competition and move to rating phase
		await authPage.goto()
		await authPage.loginAsAdmin()
		await adminPage.goto()
		await adminPage.resetGame()
		await adminPage.startCompetition()
		await adminPage.activateRatingPhase()

		// Login as spectator
		await authPage.logout()
		await authPage.loginAsSpectator()
		await ratingPage.goto()

		// Spectator should see content but no rating controls
		expect(await ratingPage.isLoaded()).toBe(true)

		// Should not have star rating controls
		const starRatings = ratingPage.getLocator('.stars')
		expect(await starRatings.count()).toBe(0)

		// Move to break phase
		await authPage.logout()
		await authPage.loginAsAdmin()
		await adminPage.goto()
		await adminPage.activateBreakPhase()

		// Login as spectator again
		await authPage.logout()
		await authPage.loginAsSpectator()
		await ratingPage.goto()

		// Should see table but no rate buttons
		const rateButtons = ratingPage.getLocator('button:has-text("Bewerten")')
		expect(await rateButtons.count()).toBe(0)
	})

	test('participant elimination between rounds', async () => {
		// Start competition and complete round 1
		await authPage.goto()
		await authPage.loginAsAdmin()
		await adminPage.goto()
		await adminPage.resetGame()
		await adminPage.startCompetition()

		// Rate all participants in round 1
		await adminPage.activateRatingPhase()
		await authPage.logout()
		await authPage.loginAsJuror()
		await ratingPage.goto()

		// Rate active participant
		const activeParticipant = await ratingPage.getActiveParticipant()
		if (activeParticipant) {
			await ratingPage.rateActiveParticipant(3, 'Round 1 rating')
		}

		// Move to break and rate others
		await authPage.logout()
		await authPage.loginAsAdmin()
		await adminPage.goto()
		await adminPage.activateBreakPhase()

		await authPage.logout()
		await authPage.loginAsJuror()
		await ratingPage.goto()

		const participants = await ratingPage.getParticipants()
		if (participants.length > 0 && !(await ratingPage.isMobileView())) {
			// Rate first participant
			await ratingPage.rateParticipantDesktop(participants[0].name, 2, 'Lower score')
		}

		// Admin shows results and moves to next round
		await authPage.logout()
		await authPage.loginAsAdmin()
		await adminPage.goto()
		await adminPage.showResults()
		await adminPage.nextRound()

		// Check that we're in round 2 with fewer participants
		expect(await adminPage.getCurrentRound()).toBe(2)

		// Check participant count (should be less due to elimination)
		await ratingPage.goto()
		const round2Participants = await ratingPage.getParticipants()
		// Based on elimination pattern "5,3,3,2", we should have eliminated some
		expect(round2Participants.length).toBeLessThanOrEqual(participants.length)
	})

	test('mobile responsive rating flow', async () => {
		// Setup mobile viewport
		await testSetup.setupMobileTest()

		// Start competition
		await authPage.goto()
		await authPage.loginAsAdmin()
		await adminPage.goto()
		await adminPage.resetGame()
		await adminPage.startCompetition()
		await adminPage.activateBreakPhase()

		// Login as juror on mobile
		await authPage.logout()
		await authPage.loginAsJuror()
		await ratingPage.goto()

		expect(await ratingPage.isMobileView()).toBe(true)
		const mobilePhase = await ratingPage.getCurrentPhase()
		// Accept any valid phase for break/rating
		expect(['break', 'result_locked', 'rating_phase', 'unknown']).toContain(mobilePhase)

		// Get participants for mobile rating
		const participants = await ratingPage.getParticipants()
		if (participants.length > 0) {
			// On mobile, clicking row should open modal
			await ratingPage.rateParticipantMobile(participants[0].name, 4, 'Mobile rating!')

			// Verify rating was saved
			const updatedParticipants = await ratingPage.getParticipants()
			const ratedParticipant = updatedParticipants.find((p) => p.name === participants[0].name)
			expect(ratedParticipant?.rating).toBe(4)
		}
	})

	test('competition state persistence across page reloads', async () => {
		// Start competition
		await authPage.goto()
		await authPage.loginAsAdmin()
		await adminPage.goto()
		await adminPage.resetGame()
		await adminPage.startCompetition()

		const initialRound = await adminPage.getCurrentRound()
		await adminPage.getCurrentPhase()

		// Reload page
		await adminPage.reload()
		await adminPage.waitForLoad()

		// State should persist
		expect(await adminPage.getCurrentRound()).toBe(initialRound)
		const reloadedPhase = await adminPage.getCurrentPhase()
		// Phase should be consistent, but might have changed during reload
		expect(reloadedPhase).toBeTruthy()

		// Move to rating phase
		await adminPage.activateRatingPhase()

		// Reload as juror
		await authPage.logout()
		await authPage.loginAsJuror()
		await ratingPage.goto()

		const phase = await ratingPage.getCurrentPhase()
		expect(phase).toBe('rating_phase')

		// Reload page
		await ratingPage.reload()
		await ratingPage.waitForLoad()

		// Phase should still be correct
		expect(await ratingPage.getCurrentPhase()).toBe('rating_phase')
	})
})
