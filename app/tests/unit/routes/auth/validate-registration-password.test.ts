import { describe, it, expect } from 'vitest'
import { POST } from '../../../../src/routes/auth/validate-registration-password/+server'

describe('validate-registration-password API', () => {
	// Note: Since the endpoint now uses its own admin-authenticated PocketBase client,
	// we can only test the fallback behavior (default password) in unit tests.
	// Integration tests with a real PocketBase instance should test custom password scenarios.

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
