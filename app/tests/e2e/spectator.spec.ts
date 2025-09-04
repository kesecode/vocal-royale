import { test, expect } from '@playwright/test'
import { E2ETestSetup } from './helpers/test-setup'
import { BackendSetup } from './helpers/backend-setup'
import { AuthPage, AdminPage, RatingPage, SongChoicePage, ProfilePage } from './pages'

test.describe('Spectator User Tests', () => {
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

		await backendSetup.initializeBackend(false) // Don't start competition for full flow tests
		await testSetup.setupFreshTest()
	})

	test('spectator can login and access public pages', async ({ page }) => {
		// Login as spectator
		await authPage.goto()
		await authPage.loginAsSpectator()

		// Should be redirected to home page
		expect(page.url()).toContain('/')

		// Can access profile
		await profilePage.goto()
		expect(await profilePage.isLoaded()).toBe(true)

		// Can access rating page (read-only)
		await ratingPage.goto()
		expect(await ratingPage.isLoaded()).toBe(true)

		// Cannot access admin page
		await adminPage.goto()
		// Should be redirected away from admin page
		expect(page.url()).not.toContain('/admin')
	})

	test('spectator cannot access participant features', async ({ page }) => {
		// Login as spectator
		await authPage.goto()
		await authPage.loginAsSpectator()

		// Cannot access song choice page
		await songChoicePage.goto()
		// Should be redirected away or show access denied
		expect(page.url()).not.toContain('/song-choice')
	})

	test('spectator can view ratings but cannot rate', async () => {
		// Start competition as admin
		await authPage.goto()
		await authPage.loginAsAdmin()
		await adminPage.goto()
		await adminPage.startCompetition()
		await adminPage.activateRatingPhase()

		// Login as spectator
		await authPage.logout()
		await authPage.loginAsSpectator()
		await ratingPage.goto()

		// Should be able to see the page
		expect(await ratingPage.isLoaded()).toBe(true)

		// Should not have star rating controls for active participant
		const starRatings = ratingPage.getLocator('.stars')
		expect(await starRatings.count()).toBe(0)

		// Should not have comment input
		const commentInputs = ratingPage.getLocator('input[placeholder*="max. 100 Zeichen"]')
		expect(await commentInputs.count()).toBe(0)

		// Should not have save buttons
		const saveButtons = ratingPage.getLocator('button:has-text("Speichern")')
		expect(await saveButtons.count()).toBe(0)

		// Move to break phase
		await authPage.logout()
		await authPage.loginAsAdmin()
		await adminPage.goto()
		await adminPage.activateBreakPhase()

		// Login as spectator again
		await authPage.logout()
		await authPage.loginAsSpectator()
		await ratingPage.goto()

		// Should see participant table but no rate buttons
		const participants = await ratingPage.getParticipants()
		expect(participants.length).toBeGreaterThan(0)

		// Should not have rate buttons
		const rateButtons = ratingPage.getLocator('button:has-text("Bewerten")')
		expect(await rateButtons.count()).toBe(0)

		// Table rows should not be clickable for rating
		if (participants.length > 0) {
			await ratingPage.getLocator(`tr:has-text("${participants[0].name}")`).click()
			// Should not open rating modal
			expect(await ratingPage.isRatingModalOpen()).toBe(false)
		}
	})

	test('spectator can view competition progress and results', async () => {
		// Start competition and complete some ratings
		await authPage.goto()
		await authPage.loginAsAdmin()
		await adminPage.goto()
		await adminPage.startCompetition()
		await adminPage.activateRatingPhase()

		// Have juror rate someone
		await authPage.logout()
		await authPage.loginAsJuror()
		await ratingPage.goto()

		const activeParticipant = await ratingPage.getActiveParticipant()
		if (activeParticipant) {
			await ratingPage.rateActiveParticipant(4, 'Test rating')
		}

		// Move to results phase
		await authPage.logout()
		await authPage.loginAsAdmin()
		await adminPage.goto()
		await adminPage.activateBreakPhase()
		await adminPage.showResults()

		// Login as spectator to view results
		await authPage.logout()
		await authPage.loginAsSpectator()
		await ratingPage.goto()

		// Should be able to see results
		expect(await ratingPage.getCurrentPhase()).toBe('result_phase')

		// Should be able to see participant information (read-only)
		const participants = await ratingPage.getParticipants()
		expect(participants.length).toBeGreaterThan(0)
	})

	test('spectator sees consistent UI across different phases', async () => {
		// Login as spectator
		await authPage.goto()
		await authPage.loginAsSpectator()

		// Test singing phase
		await authPage.goto()
		await authPage.loginAsAdmin()
		await adminPage.goto()
		await adminPage.startCompetition()

		await authPage.logout()
		await authPage.loginAsSpectator()
		await ratingPage.goto()

		expect(await ratingPage.getCurrentPhase()).toBe('singing_phase')
		// Should see "Enjoy the show!" message
		const enjoyMessage = ratingPage.getLocator('text=Enjoy the show!')
		expect(await enjoyMessage.isVisible()).toBe(true)

		// Test rating phase
		await authPage.logout()
		await authPage.loginAsAdmin()
		await adminPage.goto()
		await adminPage.activateRatingPhase()

		await authPage.logout()
		await authPage.loginAsSpectator()
		await ratingPage.goto()

		// Should see active participant info but no rating controls
		const activeParticipant = await ratingPage.getActiveParticipant()
		if (activeParticipant) {
			expect(activeParticipant).toBeTruthy()
		}

		// Ensure no rating controls are visible
		const ratingControls = ratingPage.getLocator(
			'.stars, input[placeholder*="100 Zeichen"], button:has-text("Speichern")'
		)
		expect(await ratingControls.count()).toBe(0)
	})

	test('spectator profile shows correct role', async () => {
		// Login as spectator
		await authPage.goto()
		await authPage.loginAsSpectator()

		// Go to profile page
		await profilePage.goto()
		expect(await profilePage.isLoaded()).toBe(true)

		// Check that role is displayed as spectator
		const roleText = profilePage.getLocator('text=Rolle:')
		if (await roleText.isVisible()) {
			const roleSection = roleText.locator('..')
			expect(await roleSection.textContent()).toContain('spectator')
		}

		// Should not have participant-specific features
		const artistNameInput = profilePage.getLocator('input[name*="artist"]')
		expect(await artistNameInput.count()).toBe(0)
	})

	test('spectator cannot access restricted API endpoints', async ({ request }) => {
		// Login as spectator to get session
		await authPage.goto()
		await authPage.loginAsSpectator()

		// Try to access admin API endpoints
		const adminApiResponse = await request.post('/admin/api')
		expect(adminApiResponse.status()).toBeGreaterThanOrEqual(400)

		// Try to access rating API endpoints (should fail for POST)
		const ratingApiResponse = await request.post('/rating/api', {
			data: {
				participantId: 'test',
				rating: 5,
				comment: 'test'
			}
		})
		expect(ratingApiResponse.status()).toBeGreaterThanOrEqual(400)
	})

	test('spectator mobile experience', async () => {
		// Setup mobile viewport
		await testSetup.setupMobileTest()

		// Login as spectator
		await authPage.goto()
		await authPage.loginAsSpectator()

		// Start competition
		await authPage.logout()
		await authPage.loginAsAdmin()
		await adminPage.goto()
		await adminPage.startCompetition()
		await adminPage.activateBreakPhase()

		// Login as spectator on mobile
		await authPage.logout()
		await authPage.loginAsSpectator()
		await ratingPage.goto()

		expect(await ratingPage.isMobileView()).toBe(true)

		// Should see participants but no interactive elements
		const participants = await ratingPage.getParticipants()
		expect(participants.length).toBeGreaterThan(0)

		// Clicking on rows should not do anything
		if (participants.length > 0) {
			const beforeUrl = await ratingPage.getUrl()
			await ratingPage.getLocator(`tr:has-text("${participants[0].name}")`).click()
			await ratingPage.waitForTimeout(500)

			// URL should not change, no modal should open
			expect(await ratingPage.getUrl()).toBe(beforeUrl)
			expect(await ratingPage.isRatingModalOpen()).toBe(false)
		}
	})
})
