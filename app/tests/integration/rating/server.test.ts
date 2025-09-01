import { describe, it, expect } from 'vitest'
import { GET } from '../../../src/routes/rating/state/+server'
import { createPBMock, jsonOf, makeUser, makeURL } from '../../utils/mocks'

function makeEvent(pathname: string, opts?: Partial<{ user: unknown; pb: unknown }>) {
	const url = makeURL(pathname)
	const request = new Request(url)
	return { request, url, locals: { user: opts?.user ?? null, pb: opts?.pb ?? createPBMock() } }
}

describe('rating/state GET', () => {
	it('401 when not authenticated', async () => {
		const res = await GET(makeEvent('/rating/state') as Parameters<typeof GET>[0])
		expect(res.status).toBe(401)
	})

	it('returns safe defaults when collection missing', async () => {
		const user = makeUser({ role: 'spectator' })
		const pb = createPBMock({
			competition_state: {
				getList: async () => {
					throw Object.assign(new Error('missing'), { status: 404 })
				}
			}
		})
		const res = await GET(makeEvent('/rating/state', { user, pb }) as Parameters<typeof GET>[0])
		expect(res.status).toBe(200)
		const body = (await jsonOf(res)) as {
			competitionStarted: boolean
			roundState: string
			round: number
		}
		expect(body.competitionStarted).toBe(false)
		expect(body.roundState).toBe('result_locked')
		expect(body.round).toBe(1)
	})
})
