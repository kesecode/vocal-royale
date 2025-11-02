import { describe, it, expect, vi } from 'vitest'
import { actions } from '../../../../src/routes/auth/forgot-password/+page.server'
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

describe('Forgot Password Action', () => {
	it('should send reset email for valid email address', async () => {
		const requestPasswordReset = vi.fn(async () => undefined)
		const pb = createPBMock({ users: { requestPasswordReset } })

		const event = {
			request: reqOf({ email: 'test@example.com' }),
			locals: { pb: pb as unknown as TypedPocketBase }
		} as unknown as Parameters<typeof actions.default>[0]

		const result = (await actions.default(event)) as { success: boolean; message: string }

		expect(result.success).toBe(true)
		expect(result.message).toContain('E-Mail gesendet')
		expect(requestPasswordReset).toHaveBeenCalledWith('test@example.com')
	})

	it('should return same message for invalid email (security)', async () => {
		const requestPasswordReset = vi.fn(async () => {
			throw new Error('User not found')
		})
		const pb = createPBMock({ users: { requestPasswordReset } })

		const event = {
			request: reqOf({ email: 'nonexistent@example.com' }),
			locals: { pb: pb as unknown as TypedPocketBase }
		} as unknown as Parameters<typeof actions.default>[0]

		const result = (await actions.default(event)) as { success: boolean; message: string }

		// Should return success message to prevent email enumeration
		expect(result.success).toBe(true)
		expect(result.message).toContain('E-Mail gesendet')
	})

	it('should validate email is provided', async () => {
		const pb = createPBMock()

		const event = {
			request: reqOf({ email: '' }),
			locals: { pb: pb as unknown as TypedPocketBase }
		} as unknown as Parameters<typeof actions.default>[0]

		const result = (await actions.default(event)) as unknown
		const failRes = result as { status: number; data?: { message?: string } }

		expect(failRes.status).toBe(400)
		expect(failRes.data?.message).toContain('E-Mail-Adresse angeben')
	})

	it('should trim whitespace from email', async () => {
		const requestPasswordReset = vi.fn(async () => undefined)
		const pb = createPBMock({ users: { requestPasswordReset } })

		const event = {
			request: reqOf({ email: '  test@example.com  ' }),
			locals: { pb: pb as unknown as TypedPocketBase }
		} as unknown as Parameters<typeof actions.default>[0]

		await actions.default(event)

		expect(requestPasswordReset).toHaveBeenCalledWith('test@example.com')
	})
})
