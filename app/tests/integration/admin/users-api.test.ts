import { describe, expect, it } from 'vitest'
import { PATCH, PUT } from '../../../src/routes/admin/users/api/+server'
import { createPBMock, createRequestEvent, jsonOf, makeUser, makeURL } from '../../utils/mocks'

function makeRequest(
	method: 'PATCH' | 'PUT',
	body: Record<string, unknown>,
	locals: Record<string, unknown>
) {
	return createRequestEvent(
		locals,
		new Request(makeURL('/admin/users/api').toString(), {
			method,
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body)
		})
	) as unknown
}

describe('admin/users/api restrictions', () => {
	it('denies check-in changes during active rounds', async () => {
		const admin = makeUser({ role: 'admin' })
		const pb = createPBMock({
			competition_state: {
				getList: async () => ({
					items: [{ id: 'state1', competitionStarted: true, roundState: 'singing_phase', round: 1 }]
				})
			}
		})

		const res = await PATCH(
			makeRequest('PATCH', { userId: 'any', checkedIn: true }, { user: admin, pb }) as Parameters<
				typeof PATCH
			>[0]
		)

		expect(res.status).toBe(400)
		const data = (await jsonOf(res)) as { error: string }
		expect(data.error).toBe('checkin_not_allowed')
	})

	it('blocks assigning participant or juror while competition is running', async () => {
		const admin = makeUser({ role: 'admin' })
		const pb = createPBMock({
			competition_state: {
				getList: async () => ({
					items: [{ id: 'state1', competitionStarted: true, roundState: 'singing_phase', round: 1 }]
				})
			}
		})

		const res = await PUT(
			makeRequest('PUT', { userId: 'any', role: 'participant' }, { user: admin, pb }) as Parameters<
				typeof PUT
			>[0]
		)

		expect(res.status).toBe(400)
		const data = (await jsonOf(res)) as { error: string }
		expect(data.error).toBe('role_locked')
	})
})
