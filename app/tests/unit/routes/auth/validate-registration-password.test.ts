import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock PocketBase before importing the module
vi.mock('pocketbase', () => {
	return {
		default: vi.fn().mockImplementation(() => ({
			collection: vi.fn().mockReturnValue({
				authWithPassword: vi.fn().mockRejectedValue(new Error('Connection refused')),
				getList: vi.fn().mockResolvedValue({ totalItems: 0, items: [] })
			}),
			authStore: { clear: vi.fn() }
		}))
	}
})

// Import after mocking
const { POST } = await import('../../../../src/routes/auth/validate-registration-password/+server')

describe('validate-registration-password API', () => {
	// Note: Since the endpoint now uses its own admin-authenticated PocketBase client,
	// we mock PocketBase to simulate the fallback behavior (default password) in unit tests.
	// Integration tests with a real PocketBase instance should test custom password scenarios.

	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('should validate correct default password', async () => {
		const request = new Request('http://localhost', {
			method: 'POST',
			body: JSON.stringify({ password: 'vocal-royale-2025' })
		})

		const response = await POST({ request } as unknown as Parameters<typeof POST>[0])
		const data = await response.json()

		expect(response.status).toBe(200)
		expect(data.valid).toBe(true)
	})

	it('should reject incorrect password when using default', async () => {
		const request = new Request('http://localhost', {
			method: 'POST',
			body: JSON.stringify({ password: 'wrong-password' })
		})

		const response = await POST({ request } as unknown as Parameters<typeof POST>[0])
		const data = await response.json()

		expect(response.status).toBe(200)
		expect(data.valid).toBe(false)
	})

	it('should handle missing password in request', async () => {
		const request = new Request('http://localhost', {
			method: 'POST',
			body: JSON.stringify({})
		})

		const response = await POST({ request } as unknown as Parameters<typeof POST>[0])
		const data = await response.json()

		expect(response.status).toBe(400)
		expect(data.valid).toBe(false)
		expect(data.error).toBe('Passwort erforderlich')
	})

	it('should handle invalid JSON in request', async () => {
		const request = new Request('http://localhost', {
			method: 'POST',
			body: 'invalid json'
		})

		const response = await POST({ request } as unknown as Parameters<typeof POST>[0])
		const data = await response.json()

		expect(response.status).toBe(500)
		expect(data.valid).toBe(false)
		expect(data.error).toBe('Serverfehler')
	})

	it('should handle non-string password', async () => {
		const request = new Request('http://localhost', {
			method: 'POST',
			body: JSON.stringify({ password: 12345 })
		})

		const response = await POST({ request } as unknown as Parameters<typeof POST>[0])
		const data = await response.json()

		expect(response.status).toBe(400)
		expect(data.valid).toBe(false)
		expect(data.error).toBe('Passwort erforderlich')
	})

	it('should handle empty string password', async () => {
		const request = new Request('http://localhost', {
			method: 'POST',
			body: JSON.stringify({ password: '' })
		})

		const response = await POST({ request } as unknown as Parameters<typeof POST>[0])
		const data = await response.json()

		expect(response.status).toBe(400)
		expect(data.valid).toBe(false)
		expect(data.error).toBe('Passwort erforderlich')
	})
})
