import { describe, expect, it } from 'vitest'
import { POST } from '../../../src/routes/song-choice/api/+server'
import { createPBMock, createRequestEvent, jsonOf, makeUser, makeURL } from '../../utils/mocks'

describe('song-choice/api POST', () => {
	it('blocks updates when competition already started', async () => {
		const participant = makeUser({ role: 'participant' })
		const pb = createPBMock({
			competition_state: {
				getList: async () => ({
					items: [
						{
							id: 'state1',
							competitionStarted: true,
							roundState: 'singing_phase',
							round: 1
						}
					]
				})
			}
		})

		const request = new Request(makeURL('/song-choice/api').toString(), {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ round: 1, artist: 'Test', songTitle: 'Song' })
		})

		const res = await POST(
			createRequestEvent({ user: participant, pb }, request) as unknown as Parameters<
				typeof POST
			>[0]
		)

		expect(res.status).toBe(403)
		const data = (await jsonOf(res)) as { error: string }
		expect(data.error).toBe('competition_started')
	})
})
