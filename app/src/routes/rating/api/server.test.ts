import { describe, it, expect } from 'vitest'
import { GET, POST } from './+server'
import { createPBMock, jsonOf, makeUser, makeURL } from '../../../test/mocks'

interface MakeEventOptions {
	search?: string
	method?: string
	body?: Record<string, unknown>
	user?: Record<string, unknown> | null
	pb?: Record<string, unknown>
}

function makeEvent(pathname: string, opts?: Partial<MakeEventOptions>) {
	const url = makeURL(pathname, opts?.search || '')
	const reqInit: RequestInit =
		opts?.method === 'POST'
			? {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: opts?.body ? JSON.stringify(opts.body) : undefined
				}
			: { method: 'GET' }
	const request = new Request(url, reqInit)
	return { request, url, locals: { user: opts?.user ?? null, pb: opts?.pb ?? createPBMock() } }
}

describe('rating/api GET', () => {
	it('401 when not authenticated', async () => {
		const event = makeEvent('/rating/api')
		const res = await GET(event as unknown as Parameters<typeof GET>[0])
		expect(res.status).toBe(401)
	})

	it('403 when role is participant', async () => {
		const user = makeUser({ role: 'participant' })
		const event = makeEvent('/rating/api', { user })
		const res = await GET(event as unknown as Parameters<typeof GET>[0])
		expect(res.status).toBe(403)
	})

	it('400 on invalid round', async () => {
		const user = makeUser({ role: 'spectator' })
		const event = makeEvent('/rating/api', { user, search: '?round=0' })
		const res = await GET(event as unknown as Parameters<typeof GET>[0])
		expect(res.status).toBe(400)
	})

	it('returns participants and existing ratings for juror', async () => {
		const user = makeUser({ id: 'me', role: 'juror', name: 'Me' })
		const pb = createPBMock({
			users: {
				getFullList: async () => [
					makeUser({ id: 'me', role: 'juror', name: 'Me' }),
					makeUser({ id: 'p1', role: 'participant', name: 'Alice', eliminated: false }),
					makeUser({ id: 'p2', role: 'participant', name: 'Bob', eliminated: true }),
					makeUser({ id: 'p3', role: 'participant', name: 'Carol', eliminated: false })
				]
			},
			ratings: {
				getFullList: async () => [
					{ id: 'r1', ratedUser: 'p1', rating: 5, comment: 'Great!', author: user.id },
					{ id: 'r2', ratedUser: 'p3', rating: 4, comment: 'Nice', author: user.id }
				]
			}
		})
		const event = makeEvent('/rating/api', { user, pb, search: '?round=1' })
		const res = await GET(event as unknown as Parameters<typeof GET>[0])
		expect(res.status).toBe(200)
		const body = (await jsonOf(res)) as {
			round: number
			participants: { id: string }[]
			ratings: unknown[]
		}
		expect(body.round).toBe(1)
		// should exclude eliminated and self, include p1 and p3
		expect(body.participants.map((p: { id: string }) => p.id)).toEqual(['p1', 'p3'])
		expect(body.ratings).toHaveLength(2)
	})
})

describe('rating/api POST', () => {
	it('401 when not authenticated', async () => {
		const event = makeEvent('/rating/api', { method: 'POST', body: {} })
		const res = await POST(event as unknown as Parameters<typeof POST>[0])
		expect(res.status).toBe(401)
	})

	it('403 when not spectator', async () => {
		const user = makeUser({ role: 'juror' })
		const event = makeEvent('/rating/api', { method: 'POST', user, body: {} })
		const res = await POST(event as unknown as Parameters<typeof POST>[0])
		expect(res.status).toBe(403)
	})

	it('400 for invalid JSON body', async () => {
		const user = makeUser({ role: 'spectator' })
		const url = makeURL('/rating/api')
		const request = new Request(url, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: '{invalid'
		})
		const res = await POST({
			request,
			url,
			locals: { user, pb: createPBMock() }
		} as unknown as Parameters<typeof POST>[0])
		expect(res.status).toBe(400)
	})

	it('validates inputs and rejects self rating', async () => {
		const user = makeUser({ id: 'me', role: 'spectator' })
		const pb = createPBMock({
			competition_state: { getList: async () => ({ items: [{ roundState: 'rating_phase' }] }) }
		})
		const base = { round: 1, ratedUser: 'me', rating: 3 }
		const event = makeEvent('/rating/api', { method: 'POST', user, pb, body: base })
		const res = await POST(event as unknown as Parameters<typeof POST>[0])
		expect(res.status).toBe(400)
	})

	it('rejects when rating phase is closed', async () => {
		const user = makeUser({ role: 'spectator' })
		const pb = createPBMock({
			competition_state: { getList: async () => ({ items: [{ roundState: 'singing_phase' }] }) }
		})
		const body = { round: 1, ratedUser: 'p1', rating: 3 }
		const res = await POST(
			makeEvent('/rating/api', { method: 'POST', user, pb, body }) as unknown as Parameters<
				typeof POST
			>[0]
		)
		expect(res.status).toBe(400)
		const data = (await jsonOf(res)) as { error: string }
		expect(data.error).toBe('rating_closed')
	})

	it('creates new rating when none exists', async () => {
		const user = makeUser({ id: 'me', role: 'spectator' })
		const pb = createPBMock({
			competition_state: { getList: async () => ({ items: [{ roundState: 'rating_phase' }] }) },
			ratings: {
				getList: async () => ({ items: [] }),
				create: async (data: Record<string, unknown>) => ({ id: 'new-rating', ...data })
			}
		})
		const body = { round: 1, ratedUser: 'p1', rating: 5, comment: 'Great'.repeat(30) }
		const res = await POST(
			makeEvent('/rating/api', { method: 'POST', user, pb, body }) as unknown as Parameters<
				typeof POST
			>[0]
		)
		expect(res.status).toBe(200)
		const data = (await jsonOf(res)) as { ok: boolean; id: string }
		expect(data.ok).toBe(true)
		expect(data.id).toBe('new-rating')
	})

	it('updates existing rating', async () => {
		const user = makeUser({ id: 'me', role: 'spectator' })
		const pb = createPBMock({
			competition_state: { getList: async () => ({ items: [{ roundState: 'rating_phase' }] }) },
			ratings: {
				getList: async () => ({ items: [{ id: 'r1', author: 'me', ratedUser: 'p1', round: 1 }] }),
				update: async (id: string, data: Record<string, unknown>) => ({ id, ...data })
			}
		})
		const body = { round: 1, ratedUser: 'p1', rating: 4, comment: 'ok' }
		const res = await POST(
			makeEvent('/rating/api', { method: 'POST', user, pb, body }) as unknown as Parameters<
				typeof POST
			>[0]
		)
		expect(res.status).toBe(200)
		const data = (await jsonOf(res)) as { ok: boolean; id: string }
		expect(data.ok).toBe(true)
		expect(data.id).toBe('r1')
	})
})
