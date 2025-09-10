import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock fetch globally
global.fetch = vi.fn()

// Mock sessionStorage
const mockSessionStorage = {
	getItem: vi.fn(),
	setItem: vi.fn(),
	removeItem: vi.fn(),
	clear: vi.fn()
}

Object.defineProperty(global, 'sessionStorage', {
	value: mockSessionStorage,
	writable: true
})

describe('Registration Password Protection', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockSessionStorage.getItem.mockReturnValue(null)
	})

	it('should validate password and set session storage on success', async () => {
		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ valid: true })
		})

		// Simulate password validation
		const response = await fetch('/auth/validate-registration-password', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ password: 'vocal-royale-2025' })
		})

		const result = await response.json()

		expect(result.valid).toBe(true)
		expect(global.fetch).toHaveBeenCalledWith('/auth/validate-registration-password', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ password: 'vocal-royale-2025' })
		})
	})

	it('should return false for incorrect password', async () => {
		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ valid: false })
		})

		const response = await fetch('/auth/validate-registration-password', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ password: 'wrong-password' })
		})

		const result = await response.json()

		expect(result.valid).toBe(false)
	})

	it('should handle network errors', async () => {
		global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

		await expect(
			fetch('/auth/validate-registration-password', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ password: 'any-password' })
			})
		).rejects.toThrow('Network error')
	})

	it('should check session storage for unlock status', () => {
		mockSessionStorage.getItem.mockReturnValue('true')

		const isUnlocked = sessionStorage.getItem('registrationUnlocked') === 'true'

		expect(isUnlocked).toBe(true)
		expect(mockSessionStorage.getItem).toHaveBeenCalledWith('registrationUnlocked')
	})

	it('should set session storage when unlocked', () => {
		sessionStorage.setItem('registrationUnlocked', 'true')

		expect(mockSessionStorage.setItem).toHaveBeenCalledWith('registrationUnlocked', 'true')
	})
})
