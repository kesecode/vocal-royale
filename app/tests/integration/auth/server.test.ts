import { describe, it, expect, vi } from 'vitest'
import { actions } from '../../../src/routes/auth/+page.server'
import { createPBMock } from '../../utils/mocks'
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

describe('auth actions', () => {
	it('login validates missing fields', async () => {
		const event = {
			request: reqOf({ email: '', password: '' }),
			locals: { pb: createPBMock() as unknown as TypedPocketBase }
		} as unknown as Parameters<typeof actions.login>[0]

		const res = (await actions.login(event)) as unknown
		const failRes = res as { status: number; data?: { message?: string } }
		expect(failRes.status).toBe(400)
		expect(failRes.data?.message).toBe('Bitte E-Mail und Passwort angeben.')
	})

	it('login authenticates and redirects', async () => {
		const authWithPassword = vi.fn(async () => ({}))
		const pb = createPBMock({ users: { authWithPassword } })

		const event = {
			request: reqOf({ email: 'e@x.com', password: 'pass', next: '/profile' }),
			locals: { pb: pb as unknown as TypedPocketBase }
		} as unknown as Parameters<typeof actions.login>[0]

		await expect(actions.login(event)).rejects.toMatchObject({ status: 303, location: '/profile' })
		expect(authWithPassword).toHaveBeenCalledWith('e@x.com', 'pass')
	})

	it('signup validates required fields', async () => {
		const event = {
			request: reqOf({
				email: '',
				password: '',
				passwordConfirm: '',
				firstName: '',
				lastName: '',
				artistName: ''
			}),
			locals: { pb: createPBMock() as unknown as TypedPocketBase, user: null }
		} as unknown as Parameters<typeof actions.signup>[0]

		const res = (await actions.signup(event)) as unknown
		const failRes = res as { status: number; data?: { message?: string } }
		expect(failRes.status).toBe(400)
		expect(failRes.data?.message).toBe('Bitte alle Felder ausfüllen.')
	})

	it('signup validates password confirmation', async () => {
		const event = {
			request: reqOf({
				email: 'e@x.com',
				password: 'a',
				passwordConfirm: 'b',
				firstName: 'F',
				lastName: 'L',
				artistName: 'A'
			}),
			locals: { pb: createPBMock() as unknown as TypedPocketBase, user: null }
		} as unknown as Parameters<typeof actions.signup>[0]

		const res = (await actions.signup(event)) as unknown
		const failRes = res as { status: number; data?: { message?: string } }
		expect(failRes.status).toBe(400)
		expect(failRes.data?.message).toBe('Passwörter stimmen nicht überein.')
	})

	it('signup creates user, logs in and redirects', async () => {
		const create = vi.fn(async (data: Record<string, unknown>) => ({ id: 'new-user', ...data }))
		const authWithPassword = vi.fn(async () => ({}))
		const pb = createPBMock({ users: { create, authWithPassword } })

		const event = {
			request: reqOf({
				email: 'e@x.com',
				password: 'pass',
				passwordConfirm: 'pass',
				firstName: 'F',
				lastName: 'L',
				artistName: 'A',
				next: '/'
			}),
			locals: { pb: pb as unknown as TypedPocketBase, user: null }
		} as unknown as Parameters<typeof actions.signup>[0]

		await expect(actions.signup(event)).rejects.toMatchObject({ status: 303, location: '/' })
		expect(create).toHaveBeenCalled()
		expect(authWithPassword).toHaveBeenCalledWith('e@x.com', 'pass')
	})

	it('logout clears auth and redirects', async () => {
		const pb = createPBMock()

		const event = {
			locals: { pb: pb as unknown as TypedPocketBase }
		} as unknown as Parameters<typeof actions.logout>[0]

		await expect(actions.logout(event)).rejects.toMatchObject({ status: 303, location: '/auth' })
		expect(pb.authStore.clear).toHaveBeenCalled()
	})
})
