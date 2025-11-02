import { describe, it, expect, vi } from 'vitest'
import { load } from '../../../../src/routes/auth/confirm-verification/[token]/+page.server'
import { createPBMock } from '../../../utils/mocks'
import type { TypedPocketBase } from '$lib/pocketbase-types'

describe('Email Verification Load Function', () => {
	it('should successfully verify email with valid token', async () => {
		const confirmVerification = vi.fn(async () => undefined)
		const pb = createPBMock({ users: { confirmVerification } })

		const event = {
			params: { token: 'valid-token' },
			locals: { pb: pb as unknown as TypedPocketBase }
		} as unknown as Parameters<typeof load>[0]

		const result = (await load(event)) as { success: boolean; message: string }

		expect(result.success).toBe(true)
		expect(result.message).toContain('erfolgreich verifiziert')
		expect(confirmVerification).toHaveBeenCalledWith('valid-token')
	})

	it('should handle expired or invalid token', async () => {
		const confirmVerification = vi.fn(async () => {
			throw new Error('Invalid token')
		})
		const pb = createPBMock({ users: { confirmVerification } })

		const event = {
			params: { token: 'invalid-token' },
			locals: { pb: pb as unknown as TypedPocketBase }
		} as unknown as Parameters<typeof load>[0]

		const result = (await load(event)) as { success: boolean; message: string }

		expect(result.success).toBe(false)
		expect(result.message).toContain('ungültig oder abgelaufen')
	})

	it('should throw error when no token provided', async () => {
		const pb = createPBMock()

		const event = {
			params: { token: '' },
			locals: { pb: pb as unknown as TypedPocketBase }
		} as unknown as Parameters<typeof load>[0]

		await expect(load(event)).rejects.toMatchObject({
			status: 400
		})
	})
})
