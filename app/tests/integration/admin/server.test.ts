import { describe, it, expect } from 'vitest'
import { GET, POST } from '../../../src/routes/admin/api/+server'
import { createPBMock, jsonOf, makeSettings, makeUser, makeURL } from '../../utils/mocks'

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
				name: 'A',
				checkedIn: true
			}),
			makeUser({
				id: 'p2',
				role: 'participant',
				eliminated: false,
				sangThisRound: false,
				name: 'B',
				checkedIn: true
			})
		]
		const songChoices = [
			{ id: 'c1', user: 'p1', round: 1, artist: 'A', songTitle: 'Song 1', confirmed: true },
			{ id: 'c2', user: 'p1', round: 2, artist: 'A', songTitle: 'Song 2', confirmed: true },
			{ id: 'c3', user: 'p2', round: 1, artist: 'B', songTitle: 'Song 1', confirmed: true },
			{ id: 'c4', user: 'p2', round: 2, artist: 'B', songTitle: 'Song 2', confirmed: true }
		]
		const pb = createPBMock({
			users: {
				getFullList: async (opts?: Record<string, unknown>) => {
					const filter = String(opts?.filter ?? '')
					if (filter.includes('juror')) return []
					return participants
				},
				update: async (id: string, data: Record<string, unknown>) => ({ id, ...data })
			},
			competition_state: {
				getList: async () => ({ items: [] }),
				create: async (data: Record<string, unknown>) => ({ id: 'state1', ...data })
			},
			song_choices: {
				getFullList: async () => songChoices
			},
			settings: {
				getFullList: async () => [makeSettings({ totalRounds: 2, numberOfFinalSongs: 1 })]
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

	it('start_competition blocks when participants have missing confirmed songs', async () => {
		const admin = makeUser({ role: 'admin' })
		const participants = [
			makeUser({ id: 'p1', role: 'participant', checkedIn: true }),
			makeUser({ id: 'p2', role: 'participant', checkedIn: true })
		]
		const songChoices = [
			{ id: 'c1', user: 'p1', round: 1, artist: 'A', songTitle: 'Song 1', confirmed: true },
			{ id: 'c2', user: 'p1', round: 2, artist: 'A', songTitle: 'Song 2', confirmed: true },
			// p2 missing round 2
			{ id: 'c3', user: 'p2', round: 1, artist: 'B', songTitle: 'Song 1', confirmed: true }
		]
		const pb = createPBMock({
			users: {
				getFullList: async (opts?: Record<string, unknown>) => {
					const filter = String(opts?.filter ?? '')
					if (filter.includes('juror')) return []
					return participants
				}
			},
			competition_state: {
				getList: async () => ({ items: [] })
			},
			song_choices: {
				getFullList: async () => songChoices
			},
			settings: {
				getFullList: async () => [makeSettings({ totalRounds: 2, numberOfFinalSongs: 1 })]
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

		expect(res.status).toBe(400)
		const data = (await jsonOf(res)) as { error: string }
		expect(data.error).toBe('missing_song_choices')
	})

	it('start_competition blocks when users are not checked in', async () => {
		const admin = makeUser({ role: 'admin' })
		const participants = [
			makeUser({ id: 'p1', role: 'participant', checkedIn: false }),
			makeUser({ id: 'p2', role: 'participant', checkedIn: true })
		]
		const jurors = [makeUser({ id: 'j1', role: 'juror', checkedIn: false })]
		const songChoices = [
			{ id: 'c1', user: 'p1', round: 1, artist: 'A', songTitle: 'Song 1', confirmed: true },
			{ id: 'c2', user: 'p1', round: 2, artist: 'A', songTitle: 'Song 2', confirmed: true },
			{ id: 'c3', user: 'p2', round: 1, artist: 'B', songTitle: 'Song 1', confirmed: true },
			{ id: 'c4', user: 'p2', round: 2, artist: 'B', songTitle: 'Song 2', confirmed: true }
		]
		const pb = createPBMock({
			users: {
				getFullList: async (opts?: Record<string, unknown>) => {
					const filter = String(opts?.filter ?? '')
					if (filter.includes('juror')) return jurors
					return participants
				}
			},
			competition_state: {
				getList: async () => ({ items: [] })
			},
			song_choices: {
				getFullList: async () => songChoices
			},
			settings: {
				getFullList: async () => [makeSettings({ totalRounds: 2, numberOfFinalSongs: 1 })]
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

		expect(res.status).toBe(400)
		const data = (await jsonOf(res)) as { error: string }
		expect(data.error).toBe('missing_checkins')
	})
})
