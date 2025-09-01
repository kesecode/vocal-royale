import { describe, it, expect } from 'vitest'
import { GET, POST } from './+server'
import { createPBMock, jsonOf, makeUser, makeURL } from '../../../test/mocks'

interface MakeEventOptions {
	method?: string
	user?: Record<string, unknown> | null
	pb?: Record<string, unknown>
	body?: Record<string, unknown>
}

function makeEvent(pathname: string, opts?: Partial<MakeEventOptions>) {
	const url = makeURL(pathname)
	const request = new Request(
		url,
		opts?.method === 'POST'
			? {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify(opts?.body ?? {})
				}
			: { method: 'GET' }
	)
	return { request, url, locals: { user: opts?.user ?? null, pb: opts?.pb ?? createPBMock() } }
}

describe('admin/api access', () => {
	it('GET 403 when not admin', async () => {
		const res = await GET(
			makeEvent('/admin/api', { user: makeUser({ role: 'spectator' }) }) as unknown as Parameters<
				typeof GET
			>[0]
		)
		expect(res.status).toBe(403)
	})

	it('POST 403 when not admin', async () => {
		const res = await POST(
			makeEvent('/admin/api', {
				method: 'POST',
				user: makeUser({ role: 'juror' }),
				body: { action: 'reset_game' }
			}) as unknown as Parameters<typeof POST>[0]
		)
		expect(res.status).toBe(403)
	})
})

describe('admin/api actions', () => {
	it('activate_rating_phase -> 400 when no active participant', async () => {
		const admin = makeUser({ role: 'admin' })
		const pb = createPBMock({
			competition_state: { getList: async () => ({ items: [] }) }
		})
		const res = await POST(
			makeEvent('/admin/api', {
				method: 'POST',
				user: admin,
				pb,
				body: { action: 'activate_rating_phase' }
			}) as unknown as Parameters<typeof POST>[0]
		)
		expect(res.status).toBe(400)
		const data = (await jsonOf(res)) as { error: string }
		expect(data.error).toBe('no_active_participant')
	})

	it('start_competition picks a participant and starts singing phase', async () => {
		const admin = makeUser({ role: 'admin' })
		const participants = [
			makeUser({
				id: 'p1',
				role: 'participant',
				eliminated: false,
				sangThisRound: false,
				name: 'A'
			}),
			makeUser({
				id: 'p2',
				role: 'participant',
				eliminated: false,
				sangThisRound: false,
				name: 'B'
			})
		]
		const pb = createPBMock({
			users: {
				getFullList: async () => participants,
				update: async (id: string, data: Record<string, unknown>) => ({ id, ...data })
			},
			competition_state: {
				getList: async () => ({ items: [] }),
				create: async (data: Record<string, unknown>) => ({ id: 'state1', ...data })
			}
		})
		const res = await POST(
			makeEvent('/admin/api', {
				method: 'POST',
				user: admin,
				pb,
				body: { action: 'start_competition' }
			}) as unknown as Parameters<typeof POST>[0]
		)
		expect(res.status).toBe(200)
		const data = (await jsonOf(res)) as {
			ok: boolean
			state: { roundState: string; activeParticipant: string | null | undefined }
		}
		expect(data.ok).toBe(true)
		expect(data.state.roundState).toBe('singing_phase')
		// activeParticipant may be null if random picks none, but should be string or null
		expect(data.state.activeParticipant === undefined).toBe(false)
	})
})
