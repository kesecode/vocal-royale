import { describe, it, expect, vi } from 'vitest'
import { actions } from '../../../../src/routes/auth/confirm-password-reset/[token]/+page.server'
import { createPBMock } from '../../../utils/mocks'
import type { TypedPocketBase } from '$lib/pocketbase-types'

function reqOf(fields: Record<string, unknown>): Request {
	const request = {
		formData: async () =>
			({
				get: (k: string) =>
					(k in fields
						? ((fields as Record<string, unknown>)[k] ?? null)
						: null) as unknown as FormDataEntryValue | null
			}) as Pick<FormData, 'get'>
	}
	return request as unknown as Request
}

describe('Confirm Password Reset Action', () => {
	it('should reset password with valid token and matching passwords', async () => {
		const confirmPasswordReset = vi.fn(async () => undefined)
		const pb = createPBMock({ users: { confirmPasswordReset } })

		const event = {
			request: reqOf({ password: 'newPassword123', passwordConfirm: 'newPassword123' }),
			params: { token: 'valid-reset-token' },
			locals: { pb: pb as unknown as TypedPocketBase }
		} as unknown as Parameters<typeof actions.default>[0]

		await expect(actions.default(event)).rejects.toMatchObject({
			status: 303,
			location: '/auth?reason=password_reset_success'
		})

		expect(confirmPasswordReset).toHaveBeenCalledWith(
			'valid-reset-token',
			'newPassword123',
			'newPassword123'
		)
	})

	it('should reject mismatched passwords', async () => {
		const pb = createPBMock()

		const event = {
			request: reqOf({ password: 'newPassword123', passwordConfirm: 'differentPassword' }),
			params: { token: 'valid-reset-token' },
			locals: { pb: pb as unknown as TypedPocketBase }
		} as unknown as Parameters<typeof actions.default>[0]

		const result = (await actions.default(event)) as unknown
		const failRes = result as { status: number; data?: { message?: string } }

		expect(failRes.status).toBe(400)
		expect(failRes.data?.message).toContain('nicht überein')
	})

	it('should enforce minimum password length', async () => {
		const pb = createPBMock()

		const event = {
			request: reqOf({ password: 'short', passwordConfirm: 'short' }),
			params: { token: 'valid-reset-token' },
			locals: { pb: pb as unknown as TypedPocketBase }
		} as unknown as Parameters<typeof actions.default>[0]

		const result = (await actions.default(event)) as unknown
		const failRes = result as { status: number; data?: { message?: string } }

		expect(failRes.status).toBe(400)
		expect(failRes.data?.message).toContain('mindestens 8 Zeichen')
	})

	it('should handle expired token', async () => {
		const confirmPasswordReset = vi.fn(async () => {
			throw new Error('Token expired')
		})
		const pb = createPBMock({ users: { confirmPasswordReset } })

		const event = {
			request: reqOf({ password: 'newPassword123', passwordConfirm: 'newPassword123' }),
			params: { token: 'expired-token' },
			locals: { pb: pb as unknown as TypedPocketBase }
		} as unknown as Parameters<typeof actions.default>[0]

		const result = (await actions.default(event)) as unknown
		const failRes = result as { status: number; data?: { message?: string } }

		expect(failRes.status).toBe(400)
		expect(failRes.data?.message).toContain('ungültig oder abgelaufen')
	})

	it('should validate all fields are provided', async () => {
		const pb = createPBMock()

		const event = {
			request: reqOf({ password: '', passwordConfirm: '' }),
			params: { token: 'valid-reset-token' },
			locals: { pb: pb as unknown as TypedPocketBase }
		} as unknown as Parameters<typeof actions.default>[0]

		const result = (await actions.default(event)) as unknown
		const failRes = result as { status: number; data?: { message?: string } }

		expect(failRes.status).toBe(400)
		expect(failRes.data?.message).toContain('alle Felder ausfüllen')
	})
})
