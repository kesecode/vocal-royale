import { describe, it, expect } from 'vitest'
import { POST } from '../../../src/routes/admin/settings/api/+server'
import { createPBMock, makeUser, makeURL } from '../../utils/mocks'

function makeSettingsEvent(body: Record<string, unknown>) {
	const url = makeURL('/admin/settings/api')
	const request = new Request(url, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(body)
	})
	const admin = makeUser({ role: 'admin' })
	const pb = createPBMock({
		settings: {
			getList: async () => ({ totalItems: 0, items: [] }),
			create: async (data: Record<string, unknown>) => ({ id: 'settings1', ...data })
		}
	})
	return { request, url, locals: { user: admin, pb } }
}

describe('elimination pattern validation', () => {
	it('should accept valid pattern that leaves exactly 2 participants for finale', async () => {
		const event = makeSettingsEvent({
			action: 'update',
			settings: {
				totalRounds: 5,
				numberOfFinalSongs: 3, // 3 finale songs, aber Validierung erwartet trotzdem nur 2 Teilnehmer
				maxParticipantCount: 15,
				roundEliminationPattern: '5,3,3,2' // 15 - (5+3+3+2) = 2 bleiben für das Finale
			}
		})

		const res = await POST(event as unknown as Parameters<typeof POST>[0])
		expect(res.status).toBe(200)
	})

	it('should reject pattern that leaves more than 2 participants for finale', async () => {
		const event = makeSettingsEvent({
			action: 'update',
			settings: {
				totalRounds: 5,
				numberOfFinalSongs: 4, // 4 finale songs, aber sollte trotzdem 2 Teilnehmer erwarten
				maxParticipantCount: 15,
				roundEliminationPattern: '5,3,2,1' // 15 - (5+3+2+1) = 4 bleiben, sollte 2 sein
			}
		})

		const res = await POST(event as unknown as Parameters<typeof POST>[0])
		expect(res.status).toBe(400)
		const data = await res.json()
		expect(data.error).toContain('bleiben 4 für das Finale, erwartet werden 2')
	})

	it('should reject pattern that leaves less than 2 participants for finale', async () => {
		const event = makeSettingsEvent({
			action: 'update',
			settings: {
				totalRounds: 4,
				numberOfFinalSongs: 1, // 1 finale song, aber sollte trotzdem 2 Teilnehmer erwarten
				maxParticipantCount: 10,
				roundEliminationPattern: '3,3,3' // 10 - (3+3+3) = 1 bleibt, sollte 2 sein
			}
		})

		const res = await POST(event as unknown as Parameters<typeof POST>[0])
		expect(res.status).toBe(400)
		const data = await res.json()
		expect(data.error).toContain('bleiben 1 für das Finale, erwartet werden 2')
	})

	it('should accept different numberOfFinalSongs but still expect 2 finale participants', async () => {
		const testCases = [
			{ numberOfFinalSongs: 1, expected: 'should work' },
			{ numberOfFinalSongs: 2, expected: 'should work' },
			{ numberOfFinalSongs: 3, expected: 'should work' },
			{ numberOfFinalSongs: 5, expected: 'should work' }
		]

		for (const testCase of testCases) {
			const event = makeSettingsEvent({
				action: 'update',
				settings: {
					totalRounds: 4,
					numberOfFinalSongs: testCase.numberOfFinalSongs,
					maxParticipantCount: 12,
					roundEliminationPattern: '3,3,4' // 12 - (3+3+4) = 2 bleiben für das Finale
				}
			})

			const res = await POST(event as unknown as Parameters<typeof POST>[0])
			expect(res.status).toBe(200) // Sollte immer erfolgreich sein, da 2 Teilnehmer übrig bleiben
		}
	})
})
