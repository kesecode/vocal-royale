import { describe, it, expect, vi } from 'vitest'
import { actions } from '../../../src/routes/profile/+page.server'
import { createPBMock, makeUser, makeSettings } from '../../utils/mocks'
import type { TypedPocketBase, UsersResponse } from '$lib/pocketbase-types'

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

describe('profile actions', () => {
	it('changePassword redirects unauthenticated', async () => {
		const event = {
			request: reqOf({}),
			locals: { user: null, pb: createPBMock() as unknown as TypedPocketBase }
		} as unknown as Parameters<typeof actions.changePassword>[0]

		await expect(actions.changePassword(event)).rejects.toMatchObject({ status: 303 })
	})

	it('changePassword validates mismatch', async () => {
		const user = makeUser({ id: 'u1', role: 'participant' }) as unknown as UsersResponse
		const pb = createPBMock({ users: { update: vi.fn(async () => ({})) } })

		const event = {
			request: reqOf({ password: 'a', passwordConfirm: 'b' }),
			locals: { user, pb: pb as unknown as TypedPocketBase }
		} as unknown as Parameters<typeof actions.changePassword>[0]

		const res = (await actions.changePassword(event)) as unknown
		const failRes = res as { status: number; data?: { message?: string } }
		expect(failRes.status).toBe(400)
		expect(failRes.data?.message).toBe('Passwörter stimmen nicht überein.')
	})

	it('changePassword updates and returns success', async () => {
		const user = makeUser({ id: 'u2', role: 'participant' }) as unknown as UsersResponse
		const update = vi.fn(async (id: string, data: Record<string, unknown>) => ({ id, ...data }))
		const pb = createPBMock({ users: { update } })

		const event = {
			request: reqOf({ password: 'secret123', passwordConfirm: 'secret123' }),
			locals: { user, pb: pb as unknown as TypedPocketBase }
		} as unknown as Parameters<typeof actions.changePassword>[0]

		const res = (await actions.changePassword(event)) as unknown
		expect(update).toHaveBeenCalledWith(
			user.id,
			expect.objectContaining({ password: 'secret123', passwordConfirm: 'secret123' })
		)
		expect(res).toMatchObject({ message: 'Passwort erfolgreich aktualisiert.', variant: 'success' })
	})

	it('changeArtist requires non-empty artistName', async () => {
		const user = makeUser({ id: 'u3', role: 'participant' }) as unknown as UsersResponse
		const pb = createPBMock({ users: { update: vi.fn(async () => ({})) } })

		const event = {
			request: reqOf({ artistName: '' }),
			locals: { user, pb: pb as unknown as TypedPocketBase }
		} as unknown as Parameters<typeof actions.changeArtist>[0]

		const res = (await actions.changeArtist(event)) as unknown
		const failRes = res as { status: number; data?: { message?: string } }
		expect(failRes.status).toBe(400)
		expect(failRes.data?.message).toBe('Bitte einen Künstlernamen eingeben.')
	})

	it('changeArtist updates and returns success', async () => {
		const user = makeUser({ id: 'u4', role: 'participant' }) as unknown as UsersResponse
		const update = vi.fn(async (id: string, data: Record<string, unknown>) => ({ id, ...data }))
		const pb = createPBMock({ users: { update } })

		const event = {
			request: reqOf({ artistName: 'New Name' }),
			locals: { user, pb: pb as unknown as TypedPocketBase }
		} as unknown as Parameters<typeof actions.changeArtist>[0]

		const res = (await actions.changeArtist(event)) as unknown
		expect(update).toHaveBeenCalledWith(
			user.id,
			expect.objectContaining({ artistName: 'New Name' })
		)
		expect(res).toMatchObject({ message: 'Künstlername gespeichert.', variant: 'success' })
	})

	it('logout clears auth and redirects', async () => {
		const user = makeUser({ id: 'u5', role: 'participant' }) as unknown as UsersResponse
		const pb = createPBMock()
		const event = {
			locals: { user, pb: pb as unknown as TypedPocketBase }
		} as unknown as Parameters<typeof actions.logout>[0]

		await expect(actions.logout(event)).rejects.toMatchObject({ status: 303 })
		expect(pb.authStore.clear).toHaveBeenCalled()
	})

	it('deleteAccount deletes user, clears auth and redirects to /auth?reason=account_deleted', async () => {
		const user = makeUser({ id: 'del1', role: 'participant' }) as unknown as UsersResponse
		const del = vi.fn(async () => {})
		const pb = createPBMock({ users: { delete: del } })

		const event = {
			locals: { user, pb: pb as unknown as TypedPocketBase }
		} as unknown as Parameters<typeof actions.deleteAccount>[0]

		await expect(actions.deleteAccount(event)).rejects.toMatchObject({
			status: 303,
			location: '/auth?reason=account_deleted'
		})
		expect(del).toHaveBeenCalledWith(user.id)
		expect(pb.authStore.clear).toHaveBeenCalled()
	})

	it('deleteAccount returns failure on error without clearing auth', async () => {
		const user = makeUser({ id: 'del2', role: 'participant' }) as unknown as UsersResponse
		const del = vi.fn(async () => {
			throw new Error('db fail')
		})
		const pb = createPBMock({ users: { delete: del } })

		const event = {
			locals: { user, pb: pb as unknown as TypedPocketBase }
		} as unknown as Parameters<typeof actions.deleteAccount>[0]

		const res = (await actions.deleteAccount(event)) as unknown
		const failRes = res as { status: number; data?: { message?: string } }
		expect(failRes.status).toBe(400)
		expect(failRes.data?.message).toBe('Löschen fehlgeschlagen.')
		expect(pb.authStore.clear).not.toHaveBeenCalled()
	})

	describe('changeRole', () => {
		it('should delete song choices when changing from participant to spectator', async () => {
			const user = makeUser({ id: 'u_role1', role: 'participant' }) as unknown as UsersResponse
			const deleteFn = vi.fn(async () => {})
			const pb = createPBMock({
				users: {
					getFullList: () => Promise.resolve([]),
					update: vi.fn(async (id: string, data: Record<string, unknown>) => ({ id, ...data }))
				},
				settings: {
					getFullList: () =>
						Promise.resolve([
							makeSettings({
								songChoiceDeadline: undefined // No deadline
							})
						])
				},
				song_choices: {
					getFullList: () =>
						Promise.resolve([
							{ id: 'sc1', user: 'u_role1', round: 1, artist: 'Artist1', songTitle: 'Song1' },
							{ id: 'sc2', user: 'u_role1', round: 2, artist: 'Artist2', songTitle: 'Song2' }
						]),
					delete: deleteFn
				}
			})

			const event = {
				request: reqOf({ role: 'spectator' }),
				locals: { user, pb: pb as unknown as TypedPocketBase }
			} as unknown as Parameters<typeof actions.changeRole>[0]

			const res = (await actions.changeRole(event)) as unknown
			expect(res).toMatchObject({
				message: 'Rolle erfolgreich zu "spectator" geändert.',
				variant: 'success'
			})
			// Should delete both song choices
			expect(deleteFn).toHaveBeenCalledTimes(2)
			expect(deleteFn).toHaveBeenCalledWith('sc1')
			expect(deleteFn).toHaveBeenCalledWith('sc2')
		})

		it('should NOT delete song choices when changing from spectator to juror', async () => {
			const user = makeUser({ id: 'u_role2', role: 'spectator' }) as unknown as UsersResponse
			const deleteFn = vi.fn(async () => {})
			const pb = createPBMock({
				users: {
					getFullList: () => Promise.resolve([]),
					update: vi.fn(async (id: string, data: Record<string, unknown>) => ({ id, ...data }))
				},
				settings: {
					getFullList: () =>
						Promise.resolve([
							makeSettings({
								songChoiceDeadline: undefined
							})
						])
				},
				song_choices: {
					delete: deleteFn
				}
			})

			const event = {
				request: reqOf({ role: 'juror' }),
				locals: { user, pb: pb as unknown as TypedPocketBase }
			} as unknown as Parameters<typeof actions.changeRole>[0]

			const res = (await actions.changeRole(event)) as unknown
			expect(res).toMatchObject({
				message: 'Rolle erfolgreich zu "juror" geändert.',
				variant: 'success'
			})
			// Should NOT delete any song choices
			expect(deleteFn).not.toHaveBeenCalled()
		})

		it('should reject role change after deadline', async () => {
			const user = makeUser({ id: 'u_role3', role: 'spectator' }) as unknown as UsersResponse
			// Deadline in the past
			const pastDeadline = new Date(Date.now() - 1000 * 60 * 60).toISOString()
			const pb = createPBMock({
				users: {
					getFullList: () => Promise.resolve([])
				},
				settings: {
					getFullList: () =>
						Promise.resolve([
							makeSettings({
								songChoiceDeadline: pastDeadline
							})
						])
				}
			})

			const event = {
				request: reqOf({ role: 'participant' }),
				locals: { user, pb: pb as unknown as TypedPocketBase }
			} as unknown as Parameters<typeof actions.changeRole>[0]

			const res = (await actions.changeRole(event)) as unknown
			const failRes = res as { status: number; data?: { message?: string } }
			expect(failRes.status).toBe(403)
			expect(failRes.data?.message).toBe(
				'Rollenwechsel nicht mehr möglich. Die Deadline ist abgelaufen.'
			)
		})

		it('should allow role change before deadline', async () => {
			const user = makeUser({ id: 'u_role4', role: 'spectator' }) as unknown as UsersResponse
			// Deadline in the future
			const futureDeadline = new Date(Date.now() + 1000 * 60 * 60).toISOString()
			const updateFn = vi.fn(async (id: string, data: Record<string, unknown>) => ({ id, ...data }))
			const pb = createPBMock({
				users: {
					getFullList: () => Promise.resolve([]),
					update: updateFn
				},
				settings: {
					getFullList: () =>
						Promise.resolve([
							makeSettings({
								songChoiceDeadline: futureDeadline
							})
						])
				}
			})

			const event = {
				request: reqOf({ role: 'juror' }),
				locals: { user, pb: pb as unknown as TypedPocketBase }
			} as unknown as Parameters<typeof actions.changeRole>[0]

			const res = (await actions.changeRole(event)) as unknown
			expect(res).toMatchObject({
				message: 'Rolle erfolgreich zu "juror" geändert.',
				variant: 'success'
			})
			expect(updateFn).toHaveBeenCalledWith('u_role4', { role: 'juror' })
		})

		it('should allow changing from participant to spectator and back to participant (before deadline)', async () => {
			const futureDeadline = new Date(Date.now() + 1000 * 60 * 60).toISOString()

			// First: participant to spectator
			const user1 = makeUser({ id: 'u_role5', role: 'participant' }) as unknown as UsersResponse
			const deleteFn = vi.fn(async () => {})
			const pb1 = createPBMock({
				users: {
					getFullList: () => Promise.resolve([]),
					update: vi.fn(async (id: string, data: Record<string, unknown>) => ({ id, ...data }))
				},
				settings: {
					getFullList: () =>
						Promise.resolve([
							makeSettings({
								songChoiceDeadline: futureDeadline
							})
						])
				},
				song_choices: {
					getFullList: () =>
						Promise.resolve([
							{ id: 'sc1', user: 'u_role5', round: 1, artist: 'Artist1', songTitle: 'Song1' }
						]),
					delete: deleteFn
				}
			})

			const event1 = {
				request: reqOf({ role: 'spectator' }),
				locals: { user: user1, pb: pb1 as unknown as TypedPocketBase }
			} as unknown as Parameters<typeof actions.changeRole>[0]

			const res1 = (await actions.changeRole(event1)) as unknown
			expect(res1).toMatchObject({ variant: 'success' })
			expect(deleteFn).toHaveBeenCalledTimes(1) // Song choices deleted

			// Second: spectator back to participant (no song choices to delete)
			const user2 = makeUser({ id: 'u_role5', role: 'spectator' }) as unknown as UsersResponse
			const updateFn = vi.fn(async (id: string, data: Record<string, unknown>) => ({ id, ...data }))
			const pb2 = createPBMock({
				users: {
					getFullList: () => Promise.resolve([]),
					update: updateFn
				},
				settings: {
					getFullList: () =>
						Promise.resolve([
							makeSettings({
								songChoiceDeadline: futureDeadline
							})
						])
				}
			})

			const event2 = {
				request: reqOf({ role: 'participant' }),
				locals: { user: user2, pb: pb2 as unknown as TypedPocketBase }
			} as unknown as Parameters<typeof actions.changeRole>[0]

			const res2 = (await actions.changeRole(event2)) as unknown
			expect(res2).toMatchObject({
				message: 'Rolle erfolgreich zu "participant" geändert.',
				variant: 'success'
			})
			expect(updateFn).toHaveBeenCalledWith('u_role5', { role: 'participant' })
		})

		it('should reject invalid role', async () => {
			const user = makeUser({ id: 'u_role6', role: 'spectator' }) as unknown as UsersResponse
			const pb = createPBMock()

			const event = {
				request: reqOf({ role: 'invalid_role' }),
				locals: { user, pb: pb as unknown as TypedPocketBase }
			} as unknown as Parameters<typeof actions.changeRole>[0]

			const res = (await actions.changeRole(event)) as unknown
			const failRes = res as { status: number; data?: { message?: string } }
			expect(failRes.status).toBe(400)
			expect(failRes.data?.message).toBe('Ungültige Rolle ausgewählt.')
		})

		it('should reject admin role', async () => {
			const user = makeUser({ id: 'u_role7', role: 'spectator' }) as unknown as UsersResponse
			const pb = createPBMock()

			const event = {
				request: reqOf({ role: 'admin' }),
				locals: { user, pb: pb as unknown as TypedPocketBase }
			} as unknown as Parameters<typeof actions.changeRole>[0]

			const res = (await actions.changeRole(event)) as unknown
			const failRes = res as { status: number; data?: { message?: string } }
			// Admin role is caught by the general validation check first (400), not the specific admin check (403)
			expect(failRes.status).toBe(400)
			expect(failRes.data?.message).toBe('Ungültige Rolle ausgewählt.')
		})
	})
})
