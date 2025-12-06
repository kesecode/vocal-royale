import { describe, it, expect, vi } from 'vitest'
import { load } from '../../../../src/routes/auth/confirm-verification/[token]/+page.server'
import { createPBMock } from '../../../utils/mocks'
import type { TypedPocketBase } from '$lib/pocketbase-types'

// Helper to create mock cookies object
function createMockCookies() {
	return {
		get: vi.fn(),
		getAll: vi.fn(() => []),
		set: vi.fn(),
		delete: vi.fn(),
		serialize: vi.fn()
	}
}

describe('Email Verification Load Function', () => {
	it('should successfully verify email with valid token and redirect to home', async () => {
		const confirmVerification = vi.fn(async () => undefined)
		const authRefresh = vi.fn(async () => ({}))
		const pb = createPBMock({ users: { confirmVerification, authRefresh } })
		// Set authStore as valid so authRefresh is called
		pb.authStore.isValid = true
		// Set token and record for cookie export
		Object.assign(pb.authStore, {
			token: 'test-jwt-token',
			record: { id: 'user123', verified: true }
		})

		const mockCookies = createMockCookies()

		const event = {
			params: { token: 'valid-token' },
			locals: { pb: pb as unknown as TypedPocketBase },
			cookies: mockCookies,
			url: new URL('https://example.com/auth/confirm-verification/valid-token')
		} as unknown as Parameters<typeof load>[0]

		// Should throw a redirect (SvelteKit uses thrown objects for redirects)
		await expect(load(event)).rejects.toMatchObject({
			status: 303,
			location: '/'
		})

		expect(confirmVerification).toHaveBeenCalledWith('valid-token')
		expect(authRefresh).toHaveBeenCalled()
		// Cookie should be set before redirect
		expect(mockCookies.set).toHaveBeenCalled()
	})

	it('should handle expired or invalid token', async () => {
		const confirmVerification = vi.fn(async () => {
			throw new Error('Invalid token')
		})
		const pb = createPBMock({ users: { confirmVerification } })
		const mockCookies = createMockCookies()

		const event = {
			params: { token: 'invalid-token' },
			locals: { pb: pb as unknown as TypedPocketBase },
			cookies: mockCookies,
			url: new URL('https://example.com/auth/confirm-verification/invalid-token')
		} as unknown as Parameters<typeof load>[0]

		const result = (await load(event)) as { success: boolean; message: string }

		expect(result.success).toBe(false)
		expect(result.message).toContain('ungültig oder abgelaufen')
	})

	it('should throw error when no token provided', async () => {
		const pb = createPBMock()
		const mockCookies = createMockCookies()

		const event = {
			params: { token: '' },
			locals: { pb: pb as unknown as TypedPocketBase },
			cookies: mockCookies,
			url: new URL('https://example.com/auth/confirm-verification/')
		} as unknown as Parameters<typeof load>[0]

		await expect(load(event)).rejects.toMatchObject({
			status: 400
		})
	})
})
