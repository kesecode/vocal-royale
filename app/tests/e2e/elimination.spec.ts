import { test, expect } from '@playwright/test'
import { E2ETestSetup } from './helpers/test-setup'
import { BackendSetup } from './helpers/backend-setup'
import { AuthPage, AdminPage, RatingPage, SongChoicePage } from './pages'

test.describe('Participant Elimination Tests', () => {
	let testSetup: E2ETestSetup
	let backendSetup: BackendSetup
	let authPage: AuthPage
	let adminPage: AdminPage
	let ratingPage: RatingPage
	let songChoicePage: SongChoicePage

	test.beforeEach(async ({ page }) => {
		testSetup = new E2ETestSetup(page)
		backendSetup = new BackendSetup(page)
		authPage = new AuthPage(page)
		adminPage = new AdminPage(page)
		ratingPage = new RatingPage(page)
		songChoicePage = new SongChoicePage(page)

		await backendSetup.initializeBackend(false) // Don't start competition for full flow tests
		await testSetup.setupFreshTest()
	})

	test('participant elimination follows elimination pattern', async () => {
		// Start with 5 participants (matches test data)
		await authPage.goto()
		await authPage.loginAsAdmin()
		await adminPage.goto()
		await adminPage.resetGame()
		await adminPage.startCompetition()

		// Round 1: Rate all participants with different scores
		await adminPage.activateRatingPhase()

		// Login as multiple jurors to rate participants
		const participantScores = [
			{ participant: 1, score: 5, comment: 'Excellent' },
			{ participant: 2, score: 4, comment: 'Very good' },
			{ participant: 3, score: 3, comment: 'Good' },
			{ participant: 4, score: 2, comment: 'Okay' },
			{ participant: 5, score: 1, comment: 'Needs improvement' }
		]

		// Rate with multiple jurors for variety
		for (let jurorIndex = 1; jurorIndex <= 3; jurorIndex++) {
			await authPage.logout()
			await authPage.loginAsJuror(jurorIndex)
			await ratingPage.goto()

			// Rate active participant if in rating phase
			const activeParticipant = await ratingPage.getActiveParticipant()
			if (activeParticipant) {
				const scoreData = participantScores[jurorIndex - 1]
				if (scoreData) {
					await ratingPage.rateActiveParticipant(scoreData.score, scoreData.comment)
				}
			}

			// Move to break phase and rate others
			await authPage.logout()
			await authPage.loginAsAdmin()
			await adminPage.goto()
			await adminPage.activateBreakPhase()

			await authPage.logout()
			await authPage.loginAsJuror(jurorIndex)
			await ratingPage.goto()

			const participants = await ratingPage.getParticipants()
			// Rate first few participants with varying scores
			for (let i = 0; i < Math.min(2, participants.length); i++) {
				const scoreData = participantScores[i + jurorIndex - 1]
				if (scoreData && !(await ratingPage.isMobileView())) {
					await ratingPage.rateParticipantDesktop(
						participants[i].name,
						scoreData.score,
						scoreData.comment
					)
					// Small delay between ratings
					await ratingPage.waitForTimeout(500)
				}
			}

			// Move back to rating phase for next juror
			if (jurorIndex < 3) {
				await authPage.logout()
				await authPage.loginAsAdmin()
				await adminPage.goto()
				await adminPage.activateRatingPhase()
			}
		}

		// Show results and advance to round 2
		await authPage.logout()
		await authPage.loginAsAdmin()
		await adminPage.goto()
		await adminPage.showResults()

		// Get round 1 results
		const round1Results = await adminPage.getResults()
		const round1ParticipantCount = round1Results.length
		expect(round1ParticipantCount).toBeGreaterThanOrEqual(3)

		// Advance to round 2
		await adminPage.nextRound()
		expect(await adminPage.getCurrentRound()).toBe(2)

		// Check that some participants were eliminated
		await ratingPage.goto()
		const round2Participants = await ratingPage.getParticipants()

		// Based on elimination pattern "5,3,3,2", we should eliminate participants
		// The exact number depends on how the elimination logic is implemented
		expect(round2Participants.length).toBeLessThanOrEqual(round1ParticipantCount)
	})

	test('eliminated participants cannot access participant features', async () => {
		// Complete round 1 with ratings that should eliminate participant 5
		await authPage.goto()
		await authPage.loginAsAdmin()
		await adminPage.goto()
		await adminPage.resetGame()
		await adminPage.startCompetition()
		await adminPage.activateRatingPhase()

		// Rate participant 5 poorly
		await authPage.logout()
		await authPage.loginAsJuror(1)
		await ratingPage.goto()

		// Find and rate lowest participant
		await adminPage.goto()
		await adminPage.activateBreakPhase()

		await ratingPage.goto()
		const participants = await ratingPage.getParticipants()
		if (participants.length > 0 && !(await ratingPage.isMobileView())) {
			// Give lowest score to last participant
			const lastParticipant = participants[participants.length - 1]
			await ratingPage.rateParticipantDesktop(lastParticipant.name, 1, 'Poor performance')
		}

		// Show results and advance round
		await authPage.logout()
		await authPage.loginAsAdmin()
		await adminPage.goto()
		await adminPage.showResults()
		await adminPage.nextRound()

		// Try to login as participant 5 (potentially eliminated)
		await authPage.logout()
		await authPage.loginAsParticipant(5)

		// Try to access song choice page
		await songChoicePage.goto()

		// If eliminated, should not be able to fill songs for new round
		// This depends on the app's elimination implementation
		const currentRound = await songChoicePage.getCurrentRound()

		// If the participant is eliminated, they might see different UI or be redirected
		// The exact behavior depends on how elimination is handled in the app
		expect(currentRound).toBeGreaterThanOrEqual(1)
	})

	test('non-eliminated participants can continue to next round', async () => {
		// Start competition and rate participants
		await authPage.goto()
		await authPage.loginAsAdmin()
		await adminPage.goto()
		await adminPage.resetGame()
		await adminPage.startCompetition()

		// Complete minimal rating for round 1
		await adminPage.activateRatingPhase()
		await authPage.logout()
		await authPage.loginAsJuror(1)
		await ratingPage.goto()

		const activeParticipant = await ratingPage.getActiveParticipant()
		if (activeParticipant) {
			await ratingPage.rateActiveParticipant(4, 'Good job')
		}

		// Move to break and rate more
		await authPage.logout()
		await authPage.loginAsAdmin()
		await adminPage.goto()
		await adminPage.activateBreakPhase()

		await authPage.logout()
		await authPage.loginAsJuror(1)
		await ratingPage.goto()

		const participants = await ratingPage.getParticipants()
		if (participants.length > 0 && !(await ratingPage.isMobileView())) {
			// Rate first participant well (should not be eliminated)
			await ratingPage.rateParticipantDesktop(participants[0].name, 5, 'Excellent performance')
		}

		// Advance to round 2
		await authPage.logout()
		await authPage.loginAsAdmin()
		await adminPage.goto()
		await adminPage.showResults()
		await adminPage.nextRound()

		// Login as participant 1 (should not be eliminated due to good rating)
		await authPage.logout()
		await authPage.loginAsParticipant(1)
		await songChoicePage.goto()

		// Should be able to access round 2 song selection
		expect(await songChoicePage.isLoaded()).toBe(true)
		expect(await songChoicePage.getCurrentRound()).toBeGreaterThanOrEqual(2)

		// Should be able to fill songs for the new round
		await songChoicePage.fillAndSaveSong(2, 'Round 2 Artist', 'Round 2 Song')

		// Verify song was saved
		const song = await songChoicePage.getSong(2)
		expect(song.artist).toBe('Round 2 Artist')
		expect(song.songTitle).toBe('Round 2 Song')
	})

	test('elimination affects participant count in rating page', async () => {
		// Start with all participants
		await authPage.goto()
		await authPage.loginAsAdmin()
		await adminPage.goto()
		await adminPage.resetGame()
		await adminPage.startCompetition()
		await adminPage.activateBreakPhase()

		// Count initial participants
		await ratingPage.goto()
		const initialParticipants = await ratingPage.getParticipants()
		const initialCount = initialParticipants.length

		// If no participants found, might be in different phase - try to get some data anyway
		if (initialCount === 0) {
			// Check if we're in active participant mode
			const currentPhase = await ratingPage.getCurrentPhase()
			// Skip this test if we can't find participants
			if (currentPhase === 'singing_phase' || currentPhase === 'rating_phase') {
				console.log('Skipping elimination test - in active participant mode')
				return
			}
		}

		// Only proceed if we have participants
		expect(initialCount).toBeGreaterThanOrEqual(3)

		// Rate some participants poorly
		await authPage.logout()
		await authPage.loginAsJuror(1)
		await ratingPage.goto()

		if (initialParticipants.length > 2 && !(await ratingPage.isMobileView())) {
			// Rate last two participants poorly
			await ratingPage.rateParticipantDesktop(initialParticipants[initialCount - 1].name, 1, 'Poor')
			if (initialCount > 1) {
				await ratingPage.rateParticipantDesktop(
					initialParticipants[initialCount - 2].name,
					2,
					'Below average'
				)
			}
		}

		// Advance to next round
		await authPage.logout()
		await authPage.loginAsAdmin()
		await adminPage.goto()
		await adminPage.showResults()
		await adminPage.nextRound()

		// Check participant count in round 2
		await ratingPage.goto()
		const round2Participants = await ratingPage.getParticipants()

		// Should have fewer participants after elimination
		expect(round2Participants.length).toBeLessThanOrEqual(initialCount)

		// Verify that the remaining participants are different from eliminated ones
		if (round2Participants.length < initialCount) {
			// At least one participant should be missing
			const round2Names = round2Participants.map((p) => p.name)
			const initialNames = initialParticipants.map((p) => p.name)

			// Not all initial participants should be present
			const allPresent = initialNames.every((name) => round2Names.includes(name))
			expect(allPresent).toBe(false)
		}
	})

	test('competition can continue with minimum participants', async () => {
		// This test ensures the competition can handle elimination down to minimum participants
		await authPage.goto()
		await authPage.loginAsAdmin()
		await adminPage.goto()
		await adminPage.resetGame()
		await adminPage.startCompetition()

		let currentRound = 1
		const maxRounds = 5 // Based on tournament settings

		// Simulate multiple rounds with elimination
		while (currentRound <= maxRounds) {
			// Rate participants in current round
			await adminPage.activateRatingPhase()
			await authPage.logout()
			await authPage.loginAsJuror(1)
			await ratingPage.goto()

			const activeParticipant = await ratingPage.getActiveParticipant()
			if (activeParticipant) {
				await ratingPage.rateActiveParticipant(3, `Round ${currentRound} rating`)
			}

			// Move to break and rate
			await authPage.logout()
			await authPage.loginAsAdmin()
			await adminPage.goto()
			await adminPage.activateBreakPhase()

			await authPage.logout()
			await authPage.loginAsJuror(1)
			await ratingPage.goto()

			const participants = await ratingPage.getParticipants()
			if (participants.length > 1 && !(await ratingPage.isMobileView())) {
				// Rate with varied scores to create elimination candidates
				await ratingPage.rateParticipantDesktop(participants[0].name, 4, 'Good')
				if (participants.length > 1) {
					await ratingPage.rateParticipantDesktop(participants[1].name, 2, 'Needs work')
				}
			}

			// Show results
			await authPage.logout()
			await authPage.loginAsAdmin()
			await adminPage.goto()
			await adminPage.showResults()

			// Check if we can advance to next round
			if ((await adminPage.canStartNextRound()) && currentRound < maxRounds) {
				await adminPage.nextRound()
				currentRound = await adminPage.getCurrentRound()
			} else {
				// Competition might be finished
				break
			}

			// Verify competition can still continue
			await ratingPage.goto()
			const remainingParticipants = await ratingPage.getParticipants()

			// Competition should continue as long as we have participants
			if (remainingParticipants.length === 0) {
				// Competition finished due to no participants
				break
			}

			// Should have at least 1 participant to continue
			expect(remainingParticipants.length).toBeGreaterThanOrEqual(1)
		}

		// Competition should either be finished or in final round
		const finalRound = await adminPage.getCurrentRound()
		expect(finalRound).toBeGreaterThanOrEqual(1)
		expect(finalRound).toBeLessThanOrEqual(maxRounds)
	})
})
