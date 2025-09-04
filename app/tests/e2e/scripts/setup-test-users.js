/**
 * Setup test users in PocketBase for E2E tests
 */
import PocketBase from 'pocketbase'

async function setupTestUsers() {
	try {
		const pb = new PocketBase('http://127.0.0.1:7090')

		// Login as admin
		await pb.admins.authWithPassword('admin_db@vocal.royale', 'vocal_royale_2025')
		console.log('✅ Connected to PocketBase as admin')

		// Test users to create
		const users = [
			{
				email: 'participant1@test.com',
				password: 'testpass123',
				passwordConfirm: 'testpass123',
				name: 'Test Participant 1',
				role: 'participant',
				artistName: 'Testartist1'
			},
			{
				email: 'participant2@test.com',
				password: 'testpass123',
				passwordConfirm: 'testpass123',
				name: 'Test Participant 2',
				role: 'participant',
				artistName: 'Testartist2'
			},
			{
				email: 'juror1@test.com',
				password: 'testpass123',
				passwordConfirm: 'testpass123',
				name: 'Test Juror 1',
				role: 'juror'
			},
			{
				email: 'juror2@test.com',
				password: 'testpass123',
				passwordConfirm: 'testpass123',
				name: 'Test Juror 2',
				role: 'juror'
			}
		]

		// Create users
		for (const user of users) {
			try {
				await pb.collection('users').getFirstListItem(`email="${user.email}"`)
				console.log(`⚠️  User ${user.email} already exists, skipping`)
			} catch {
				// User doesn't exist, create it
				await pb.collection('users').create(user)
				console.log(`✅ Created user: ${user.email} (${user.role})`)
			}
		}

		console.log('🎉 Test user setup completed')
	} catch (error) {
		console.error('❌ Error setting up test users:', error)
		process.exit(1)
	}
}

// Run setup
setupTestUsers()
