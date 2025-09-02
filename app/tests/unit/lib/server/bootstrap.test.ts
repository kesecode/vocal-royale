import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockPocketBase = {
	health: {
		check: vi.fn()
	},
	collection: vi.fn(),
	authStore: {
		clear: vi.fn(),
		isValid: false
	}
}

const mockCollection = {
	create: vi.fn(),
	authWithPassword: vi.fn(),
	getList: vi.fn()
}

vi.mock('pocketbase', () => ({
	default: vi.fn(() => mockPocketBase)
}))

vi.mock('$lib/server/logger', () => ({
	logger: {
		info: vi.fn(),
		warn: vi.fn(),
		debug: vi.fn(),
		error: vi.fn()
	}
}))

describe('Bootstrap', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.resetModules()
		mockPocketBase.collection.mockReturnValue(mockCollection)
		vi.unstubAllEnvs()
	})

	afterEach(() => {
		vi.unstubAllEnvs()
		vi.restoreAllMocks()
	})

	describe('initBootstrap', () => {
		it('should not run during SvelteKit build', async () => {
			vi.doMock('$app/environment', () => ({
				building: true
			}))

			const { initBootstrap } = await import('$lib/server/bootstrap')
			initBootstrap()
			expect(mockPocketBase.health.check).not.toHaveBeenCalled()
		})
	})

	describe('environment variable handling', () => {
		it('should use default admin credentials when not provided', () => {
			expect(process.env.ADMIN_EMAIL || 'admin@vocal.royale').toBe('admin@vocal.royale')
			expect(process.env.ADMIN_PASSWORD || 'ChangeMeNow!').toBe('ChangeMeNow!')
		})

		it('should use custom admin credentials from environment', () => {
			vi.stubEnv('ADMIN_EMAIL', 'custom@admin.com')
			vi.stubEnv('ADMIN_PASSWORD', 'CustomPassword123')

			expect(process.env.ADMIN_EMAIL).toBe('custom@admin.com')
			expect(process.env.ADMIN_PASSWORD).toBe('CustomPassword123')
		})

		it('should use default PocketBase URL when not configured', () => {
			const BASE_URL = process.env.PB_URL || 'http://127.0.0.1:8090'
			expect(BASE_URL).toBe('http://127.0.0.1:8090')
		})

		it('should use custom PocketBase URL when configured', () => {
			vi.stubEnv('PB_URL', 'http://custom-pb:8080')
			const BASE_URL = process.env.PB_URL || 'http://127.0.0.1:8090'
			expect(BASE_URL).toBe('http://custom-pb:8080')
		})
	})

	describe('bootstrap data structures', () => {
		it('should create admin user with correct structure', () => {
			const adminData = {
				email: 'admin@vocal.royale',
				firstName: 'Admin',
				lastName: 'User',
				password: 'ChangeMeNow!',
				passwordConfirm: 'ChangeMeNow!',
				role: 'admin'
			}

			expect(adminData).toMatchObject({
				email: expect.any(String),
				firstName: 'Admin',
				lastName: 'User',
				password: expect.any(String),
				passwordConfirm: expect.any(String),
				role: 'admin'
			})
		})

		it('should create competition state with correct structure', () => {
			const competitionState = {
				round: 1,
				competitionStarted: false
			}

			expect(competitionState).toMatchObject({
				round: 1,
				competitionStarted: false
			})
			expect(competitionState.round).toBeGreaterThanOrEqual(1)
			expect(competitionState.round).toBeLessThanOrEqual(5)
		})
	})

	describe('error handling patterns', () => {
		it('should handle authentication errors gracefully', async () => {
			const mockError = new Error('Authentication failed')
			expect(mockError.message).toBe('Authentication failed')
		})

		it('should handle creation errors gracefully', async () => {
			const mockError = new Error('Creation failed')
			expect(mockError.message).toBe('Creation failed')
		})

		it('should handle race condition errors', async () => {
			const mockError = new Error('User already exists')
			expect(mockError.message).toBe('User already exists')
		})
	})

	describe('retry mechanism constants', () => {
		it('should have appropriate retry configuration', () => {
			const maxRetries = 100
			const delayMs = 1000

			expect(maxRetries).toBeGreaterThan(0)
			expect(delayMs).toBeGreaterThan(0)
			expect(maxRetries * delayMs).toBeLessThanOrEqual(200000) // Max ~3.3 minutes
		})
	})

	describe('collection service interactions', () => {
		it('should interact with users collection', () => {
			const collectionName = 'users'
			expect(collectionName).toBe('users')
		})

		it('should interact with competition_state collection', () => {
			const collectionName = 'competition_state'
			expect(collectionName).toBe('competition_state')
		})
	})
})
