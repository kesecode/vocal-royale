import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../../../../src/routes/auth/validate-registration-password/+server'

interface MockPb {
	collection: ReturnType<typeof vi.fn>
}

interface MockLocals {
	pb: MockPb
}

describe('validate-registration-password API', () => {
	let mockPb: MockPb
	let mockLocals: MockLocals
	let mockGetList: ReturnType<typeof vi.fn>

	beforeEach(() => {
		mockGetList = vi.fn()
		mockPb = {
			collection: vi.fn(() => ({
				getList: mockGetList
			}))
		}
		mockLocals = {
			pb: mockPb
		}
	})

	it('should validate correct password from settings', async () => {
		const customPassword = 'custom-password-123'
		mockGetList.mockResolvedValue({
			totalItems: 1,
			items: [{ registrationPassword: customPassword }]
		})

		const request = new Request('http://localhost', {
			method: 'POST',
			body: JSON.stringify({ password: customPassword })
		})

		const response = await POST({ request, locals: mockLocals } as unknown as Parameters<
			typeof POST
		>[0])
		const data = await response.json()

		expect(response.status).toBe(200)
		expect(data.valid).toBe(true)
	})

	it('should use default password when not configured', async () => {
		mockGetList.mockResolvedValue({
			totalItems: 0,
			items: []
		})

		const request = new Request('http://localhost', {
			method: 'POST',
			body: JSON.stringify({ password: 'vocal-royale-2025' })
		})

		const response = await POST({ request, locals: mockLocals } as unknown as Parameters<
			typeof POST
		>[0])
		const data = await response.json()

		expect(response.status).toBe(200)
		expect(data.valid).toBe(true)
	})

	it('should reject incorrect password', async () => {
		mockGetList.mockResolvedValue({
			totalItems: 1,
			items: [{ registrationPassword: 'correct-password' }]
		})

		const request = new Request('http://localhost', {
			method: 'POST',
			body: JSON.stringify({ password: 'wrong-password' })
		})

		const response = await POST({ request, locals: mockLocals } as unknown as Parameters<
			typeof POST
		>[0])
		const data = await response.json()

		expect(response.status).toBe(200)
		expect(data.valid).toBe(false)
	})

	it('should handle missing password in request', async () => {
		const request = new Request('http://localhost', {
			method: 'POST',
			body: JSON.stringify({})
		})

		const response = await POST({ request, locals: mockLocals } as unknown as Parameters<
			typeof POST
		>[0])
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

		const response = await POST({ request, locals: mockLocals } as unknown as Parameters<
			typeof POST
		>[0])
		const data = await response.json()

		expect(response.status).toBe(500)
		expect(data.valid).toBe(false)
		expect(data.error).toBe('Serverfehler')
	})

	it('should handle database errors gracefully', async () => {
		mockGetList.mockRejectedValue(new Error('Database error'))

		const request = new Request('http://localhost', {
			method: 'POST',
			body: JSON.stringify({ password: 'any-password' })
		})

		const response = await POST({ request, locals: mockLocals } as unknown as Parameters<
			typeof POST
		>[0])
		const data = await response.json()

		expect(response.status).toBe(500)
		expect(data.valid).toBe(false)
		expect(data.error).toBe('Serverfehler')
	})

	it('should validate when settings exists but registrationPassword is null', async () => {
		mockGetList.mockResolvedValue({
			totalItems: 1,
			items: [{ registrationPassword: null }]
		})

		const request = new Request('http://localhost', {
			method: 'POST',
			body: JSON.stringify({ password: 'vocal-royale-2025' })
		})

		const response = await POST({ request, locals: mockLocals } as unknown as Parameters<
			typeof POST
		>[0])
		const data = await response.json()

		expect(response.status).toBe(200)
		expect(data.valid).toBe(true)
	})

	it('should validate when settings exists but registrationPassword is empty string', async () => {
		mockGetList.mockResolvedValue({
			totalItems: 1,
			items: [{ registrationPassword: '' }]
		})

		const request = new Request('http://localhost', {
			method: 'POST',
			body: JSON.stringify({ password: 'vocal-royale-2025' })
		})

		const response = await POST({ request, locals: mockLocals } as unknown as Parameters<
			typeof POST
		>[0])
		const data = await response.json()

		expect(response.status).toBe(200)
		expect(data.valid).toBe(true)
	})
})
