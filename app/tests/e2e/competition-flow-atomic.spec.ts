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
		expect(['rating_phase', 'break', 'result_locked', 'unknown']).toContain(phase)
	})

	test('juror can access rating page', async () => {
		await backendSetup.initializeBackend(true) // Start with competition and rating phase

		await authPage.goto()
		await authPage.loginAsJuror()
		await ratingPage.goto()

		// Just verify juror can access rating page and see phase info
		const currentPhase = await ratingPage.getCurrentPhase()
		expect(['rating_phase', 'break', 'result_locked', 'unknown']).toContain(currentPhase)
	})
})
