import { test, expect } from '@playwright/test'
import { E2ETestSetup } from './helpers/test-setup'
import { BackendSetup } from './helpers/backend-setup'
import { AuthPage, AdminPage, RatingPage } from './pages'

test.describe('Competition Flow - Atomic Tests', () => {
	let testSetup: E2ETestSetup
	let backendSetup: BackendSetup
	let authPage: AuthPage
	let adminPage: AdminPage
	let ratingPage: RatingPage

	test.beforeEach(async ({ page }) => {
		testSetup = new E2ETestSetup(page)
		backendSetup = new BackendSetup(page)
		authPage = new AuthPage(page)
		adminPage = new AdminPage(page)
		ratingPage = new RatingPage(page)

		await testSetup.setupFreshTest()
	})

	test('admin can reset game', async () => {
		await backendSetup.initializeBackend(false)

		await authPage.goto()
		await authPage.loginAsAdmin()
		await adminPage.goto()

		await adminPage.resetGame()

		// Verify reset worked
		const round = await adminPage.getCurrentRound()
		expect(round).toBe(1)
	})

	test('admin can start competition', async () => {
		await backendSetup.initializeBackend(false)

		await authPage.goto()
		await authPage.loginAsAdmin()
		await adminPage.goto()

		await adminPage.resetGame()
		await adminPage.startCompetition()

		const phase = await adminPage.getCurrentPhase()
		expect(['singing_phase', 'result_locked', 'break', 'rating_phase']).toContain(phase)
		expect(await adminPage.getCurrentRound()).toBe(1)
	})

	test('admin can activate rating phase', async () => {
		await backendSetup.initializeBackend(true) // Start with competition running

		await authPage.goto()
		await authPage.loginAsAdmin()
		await adminPage.goto()

		await adminPage.activateRatingPhase()

		// Verify by checking rating page accessibility
		await ratingPage.goto()
		const phase = await ratingPage.getCurrentPhase()
		expect(['rating_phase', 'break', 'result_locked']).toContain(phase)
	})

	test('juror can rate active participant', async () => {
		await backendSetup.initializeBackend(true) // Start with competition and rating phase

		await authPage.goto()
		await authPage.loginAsJuror()
		await ratingPage.goto()

		const activeParticipant = await ratingPage.getActiveParticipant()
		expect(activeParticipant).toBeTruthy()

		await ratingPage.rateActiveParticipant(4, 'Good performance!')

		// Verify rating was submitted (no error state)
		const currentPhase = await ratingPage.getCurrentPhase()
		expect(['rating_phase', 'break', 'result_locked']).toContain(currentPhase)
	})

	test('admin can activate break phase', async () => {
		await backendSetup.initializeBackend(true)

		await authPage.goto()
		await authPage.loginAsAdmin()
		await adminPage.goto()

		await adminPage.activateBreakPhase()

		// Verify break phase is active
		await ratingPage.goto()
		expect(await ratingPage.getCurrentPhase()).toBe('break')
	})

	test('juror can rate in break phase', async () => {
		await backendSetup.initializeBackend(true)

		// Set to break phase first
		await authPage.goto()
		await authPage.loginAsAdmin()
		await adminPage.goto()
		await adminPage.activateBreakPhase()

		// Test juror rating
		await authPage.logout()
		await authPage.loginAsJuror()
		await ratingPage.goto()

		expect(await ratingPage.getCurrentPhase()).toBe('break')

		const participants = await ratingPage.getParticipants()
		expect(participants.length).toBeGreaterThan(0)

		// Rate via table button (desktop only for simplicity)
		if (!(await ratingPage.isMobileView())) {
			await ratingPage.rateParticipantDesktop(participants[0].name, 5, 'Excellent!')
		}
	})

	test('admin can show results', async () => {
		await backendSetup.initializeBackend(true)

		await authPage.goto()
		await authPage.loginAsAdmin()
		await adminPage.goto()

		await adminPage.showResults()

		// Verify result phase
		await ratingPage.goto()
		expect(await ratingPage.getCurrentPhase()).toBe('result_phase')
	})

	test('admin can advance to next round', async () => {
		await backendSetup.initializeBackend(true)

		await authPage.goto()
		await authPage.loginAsAdmin()
		await adminPage.goto()

		// Show results first
		await adminPage.showResults()
		await adminPage.nextRound()

		const currentRound = await adminPage.getCurrentRound()
		expect(currentRound).toBe(2)
	})
})
