import { describe, it, expect, beforeEach, vi } from 'vitest'
import { POST, resetRateLimitForTesting } from '../../../src/routes/api/resend-verification/+server'
import { createPBMock, makeUser, createRequestEvent } from '../../utils/mocks'

type TestLocals = {
	pb: ReturnType<typeof createPBMock>
	user: ReturnType<typeof makeUser> | null
}

describe('/api/resend-verification endpoint', () => {
	let locals: TestLocals
	let mockPB: ReturnType<typeof createPBMock>
	let mockRequestVerification: ReturnType<typeof vi.fn>

	beforeEach(() => {
		// Reset rate limiting between tests
		resetRateLimitForTesting()
		vi.clearAllMocks()

		mockRequestVerification = vi.fn(() => Promise.resolve())

		mockPB = createPBMock({
			users: {
				requestVerification: mockRequestVerification
			}
		})

		locals = {
			pb: mockPB,
			user: makeUser({ id: 'testuser', role: 'default', verified: false })
		}
	})

	describe('Authentication', () => {
		it('should return 401 if user is not authenticated', async () => {
			locals.user = null
			const request = new Request('http://localhost/api/resend-verification', {
				method: 'POST'
			})

			const response = await POST(
				createRequestEvent(locals, request) as unknown as Parameters<typeof POST>[0]
			)
			expect(response.status).toBe(401)

			const data = await response.json()
			expect(data.error).toContain('Nicht authentifiziert')
		})
	})

	describe('Verification status', () => {
		it('should return 400 if user is already verified', async () => {
			locals.user = makeUser({ id: 'testuser', role: 'default', verified: true })
			const request = new Request('http://localhost/api/resend-verification', {
				method: 'POST'
			})

			const response = await POST(
				createRequestEvent(locals, request) as unknown as Parameters<typeof POST>[0]
			)
			expect(response.status).toBe(400)

			const data = await response.json()
			expect(data.error).toContain('bereits bestätigt')
		})

		it('should send verification email for unverified user', async () => {
			const request = new Request('http://localhost/api/resend-verification', {
				method: 'POST'
			})

			const response = await POST(
				createRequestEvent(locals, request) as unknown as Parameters<typeof POST>[0]
			)
			expect(response.status).toBe(200)

			const data = await response.json()
			expect(data.success).toBe(true)
			expect(data.message).toContain('Bestätigungs-Email wurde gesendet')

			// Verify that requestVerification was called
			expect(mockRequestVerification).toHaveBeenCalledWith(locals.user?.email)
		})
	})

	describe('Rate limiting', () => {
		it('should enforce rate limiting (2 minute cooldown)', async () => {
			const request1 = new Request('http://localhost/api/resend-verification', {
				method: 'POST'
			})

			// First request should succeed
			const response1 = await POST(
				createRequestEvent(locals, request1) as unknown as Parameters<typeof POST>[0]
			)
			expect(response1.status).toBe(200)

			// Second request immediately after should be rate limited
			const request2 = new Request('http://localhost/api/resend-verification', {
				method: 'POST'
			})

			const response2 = await POST(
				createRequestEvent(locals, request2) as unknown as Parameters<typeof POST>[0]
			)
			expect(response2.status).toBe(429)

			const data = await response2.json()
			expect(data.error).toContain('Bitte warte')
		})
	})

	describe('Error handling', () => {
		it('should handle PocketBase errors gracefully', async () => {
			mockPB = createPBMock({
				users: {
					requestVerification: vi.fn(() => Promise.reject(new Error('Email service unavailable')))
				}
			})
			locals.pb = mockPB

			const request = new Request('http://localhost/api/resend-verification', {
				method: 'POST'
			})

			const response = await POST(
				createRequestEvent(locals, request) as unknown as Parameters<typeof POST>[0]
			)
			expect(response.status).toBe(500)

			const data = await response.json()
			expect(data.error).toContain('Fehler beim Senden der Bestätigungs-Email')
		})
	})
})
