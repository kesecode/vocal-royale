import type { Page } from '@playwright/test'

/**
 * Backend Test Setup Helper
 *
 * Provides utilities to initialize the PocketBase backend
 * with test data for E2E tests
 */
export class BackendSetup {
	constructor(private page: Page) {}

	/**
	 * Initialize backend with basic test data
	 */
	async initializeBackend(startCompetition = true): Promise<void> {
		// Fast backend readiness check - app is responsive
		const maxRetries = 15 // 15 * 1s = 15s max wait
		for (let i = 0; i < maxRetries; i++) {
			try {
				const response = await fetch('http://127.0.0.1:7090/', {
					signal: AbortSignal.timeout(1000) // 1s timeout per request
				})
				// PocketBase responds with 404 for root path when ready
				if (response.status === 404) {
					console.log('✅ Backend is ready for E2E tests')
					await this.setupTestData(startCompetition)
					return
				}
			} catch {
				// Backend not ready yet, continue waiting
			}

			if (i < maxRetries - 1) {
				await new Promise((resolve) => setTimeout(resolve, 1000)) // 1s intervals
			}
		}

		throw new Error(`Backend not ready after ${maxRetries} seconds`)
	}

	/**
	 * Setup test data in PocketBase
	 */
	private async setupTestData(startCompetition = true): Promise<void> {
		try {
			// Import PocketBase client
			const { default: PocketBase } = await import('pocketbase')
			const pb = new PocketBase('http://127.0.0.1:7090')

			// Try to login first, create admin if needed
			try {
				await pb.admins.authWithPassword('admin_db@vocal.royale', 'vocal_royale_2025')
			} catch {
				// Admin doesn't exist, try to create
				try {
					await pb.admins.create({
						email: 'admin_db@vocal.royale',
						password: 'vocal_royale_2025',
						passwordConfirm: 'vocal_royale_2025'
					})
					console.log('✅ Created admin user for E2E tests')
					// adminCreated = true

					// Now login after creation
					await pb.admins.authWithPassword('admin_db@vocal.royale', 'vocal_royale_2025')
				} catch {
					// Race condition: another test created admin, try login again
					try {
						await pb.admins.authWithPassword('admin_db@vocal.royale', 'vocal_royale_2025')
						console.log('⚠️  Admin created by parallel test, logged in successfully')
					} catch (finalError) {
						throw new Error(
							`Failed to create or login admin: ${finalError instanceof Error ? finalError.message : 'Unknown error'}`
						)
					}
				}
			}

			// Create test users
			const users = await this.createTestUsers()

			// Create admin
			await this.createUserIfNotExists(
				pb,
				users.admin.email,
				users.admin.password,
				users.admin.name,
				'admin'
			)

			// Create participants
			for (const participant of users.participants) {
				await this.createUserIfNotExists(
					pb,
					participant.email,
					participant.password,
					participant.name,
					participant.role
				)
			}

			// Create jurors
			for (const juror of users.jurors) {
				await this.createUserIfNotExists(pb, juror.email, juror.password, juror.name, juror.role)
			}

			// Create spectators
			for (const spectator of users.spectators) {
				await this.createUserIfNotExists(
					pb,
					spectator.email,
					spectator.password,
					spectator.name,
					spectator.role
				)
			}

			// Ensure participants are not eliminated
			await this.ensureParticipantsNotEliminated(pb)

			// Setup competition state
			await this.setupCompetitionState(pb, startCompetition)

			console.log('✅ Test data setup completed')
		} catch (error) {
			console.warn('⚠️  Test data setup failed:', (error as Error)?.message ?? error)
		}
	}

	/**
	 * Create user if not exists
	 */
	private async createUserIfNotExists(
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		pb: any,
		email: string,
		password: string,
		name: string,
		role: string
	): Promise<void> {
		try {
			await pb.collection('users').getFirstListItem(`email="${email}"`)
			// User already exists - silent, no warning needed
		} catch {
			const userData = {
				email,
				password,
				passwordConfirm: password,
				name,
				role,
				...(role === 'participant' && { artistName: `Artist-${name}` })
			}
			await pb.collection('users').create(userData)
			console.log(`✅ Created user: ${email} (${role})`)
		}
	}

	/**
	 * Ensure participants are not eliminated
	 */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	private async ensureParticipantsNotEliminated(pb: any): Promise<void> {
		try {
			const participants = await pb.collection('users').getFullList({
				filter: 'role = "participant"'
			})

			for (const participant of participants) {
				if (participant.eliminated) {
					await pb.collection('users').update(participant.id, {
						eliminated: false
					})
					console.log(`✅ Reset eliminated status for: ${participant.email}`)
				}
			}
		} catch (error) {
			console.warn('⚠️  Failed to update participant elimination status:', error)
		}
	}

	/**
	 * Setup competition state
	 */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	private async setupCompetitionState(pb: any, startCompetition = true): Promise<void> {
		try {
			// Check if competition state exists
			let competitionState
			try {
				const existingStates = await pb.collection('competition_state').getFullList()
				competitionState = existingStates[0]
			} catch {
				// No competition state exists, create one
			}

			// Get first participant to use as active participant if starting competition
			let activeParticipantId = null
			if (startCompetition) {
				try {
					const participants = await pb.collection('users').getFullList({
						filter: 'role = "participant"'
					})
					if (participants.length > 0) {
						activeParticipantId = participants[0].id
					}
				} catch (error) {
					console.warn('⚠️  Could not get participants for active participant setup:', error)
				}
			}

			const stateData = startCompetition
				? {
						competitionStarted: true,
						roundState: 'singing_phase', // Start in singing_phase so admin can activate rating
						round: 1,
						competitionFinished: false,
						...(activeParticipantId && { activeParticipant: activeParticipantId })
					}
				: {
						competitionStarted: false,
						roundState: 'result_locked',
						round: 1,
						competitionFinished: false
					}

			if (competitionState) {
				await pb.collection('competition_state').update(competitionState.id, stateData)
				console.log('✅ Updated competition state for testing')
			} else {
				await pb.collection('competition_state').create(stateData)
				console.log('✅ Created competition state for testing')
			}
		} catch (error) {
			console.warn('⚠️  Failed to setup competition state:', error)
		}
	}

	/**
	 * Create test users (admin, participants, jurors, spectators)
	 */
	async createTestUsers(): Promise<{
		admin: { email: string; password: string; name: string }
		participants: Array<{ email: string; password: string; name: string; role: string }>
		jurors: Array<{ email: string; password: string; name: string; role: string }>
		spectators: Array<{ email: string; password: string; name: string; role: string }>
	}> {
		return {
			admin: { email: 'admin@vocal.royale', password: 'ChangeMeNow!', name: 'Admin User' },
			participants: [
				{
					email: 'participant1@test.com',
					password: 'password123',
					name: 'Test Participant 1',
					role: 'participant'
				},
				{
					email: 'participant2@test.com',
					password: 'password123',
					name: 'Test Participant 2',
					role: 'participant'
				},
				{
					email: 'participant3@test.com',
					password: 'password123',
					name: 'Test Participant 3',
					role: 'participant'
				},
				{
					email: 'participant4@test.com',
					password: 'password123',
					name: 'Test Participant 4',
					role: 'participant'
				},
				{
					email: 'participant5@test.com',
					password: 'password123',
					name: 'Test Participant 5',
					role: 'participant'
				}
			],
			jurors: [
				{ email: 'juror1@test.com', password: 'password123', name: 'Test Juror 1', role: 'juror' },
				{ email: 'juror2@test.com', password: 'password123', name: 'Test Juror 2', role: 'juror' },
				{ email: 'juror3@test.com', password: 'password123', name: 'Test Juror 3', role: 'juror' }
			],
			spectators: [
				{
					email: 'spectator1@test.com',
					password: 'password123',
					name: 'Test Spectator 1',
					role: 'spectator'
				},
				{
					email: 'spectator2@test.com',
					password: 'password123',
					name: 'Test Spectator 2',
					role: 'spectator'
				}
			]
		}
	}

	/**
	 * Reset backend data between tests
	 */
	async resetBackend(): Promise<void> {
		// TODO: Implement data cleanup
		console.log('🔄 Backend reset for next test')
	}
}
