import { describe, it, expect, beforeEach } from 'vitest'
import { POST } from '../../../src/routes/api/role/+server'
import { createPBMock, makeUser, makeSettings } from '../../utils/mocks'

type TestLocals = {
	pb: ReturnType<typeof createPBMock>
	user: ReturnType<typeof makeUser> | null
}

describe('/api/role endpoint', () => {
	let locals: TestLocals
	let mockPB: ReturnType<typeof createPBMock>

	beforeEach(() => {
		mockPB = createPBMock({
			users: {
				getFullList: () =>
					Promise.resolve([
						makeUser({ id: 'p1', role: 'participant' }),
						makeUser({ id: 'p2', role: 'participant' }),
						makeUser({ id: 'j1', role: 'juror' }),
						makeUser({ id: 's1', role: 'spectator' })
					]),
				update: (id: string, data: Record<string, unknown>) => Promise.resolve({ id, ...data })
			},
			settings: {
				getFullList: () =>
					Promise.resolve([
						makeSettings('maxParticipantCount', 5),
						makeSettings('maxJurorCount', 3)
					])
			}
		})

		locals = {
			pb: mockPB,
			user: makeUser({ id: 'testuser', role: 'default' }) // User with default role
		}
	})

	describe('Authentication', () => {
		it('should return 401 if user is not authenticated', async () => {
			locals.user = null
			const request = new Request('http://localhost/api/role', {
				method: 'POST',
				body: JSON.stringify({ role: 'participant' })
			})

			const response = await POST({ locals, request } as { locals: TestLocals; request: Request })
			expect(response.status).toBe(401)
		})
	})

	describe('Role validation', () => {
		it('should accept valid participant role', async () => {
			const request = new Request('http://localhost/api/role', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ role: 'participant' })
			})

			const response = await POST({ locals, request } as { locals: TestLocals; request: Request })
			expect(response.status).toBe(200)
		})

		it('should accept valid spectator role', async () => {
			const request = new Request('http://localhost/api/role', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ role: 'spectator' })
			})

			const response = await POST({ locals, request } as { locals: TestLocals; request: Request })
			expect(response.status).toBe(200)
		})

		it('should accept valid juror role', async () => {
			const request = new Request('http://localhost/api/role', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ role: 'juror' })
			})

			const response = await POST({ locals, request } as { locals: TestLocals; request: Request })
			expect(response.status).toBe(200)
		})

		it('should reject admin role', async () => {
			const request = new Request('http://localhost/api/role', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ role: 'admin' })
			})

			const response = await POST({ locals, request } as { locals: TestLocals; request: Request })
			expect(response.status).toBe(403)

			const data = await response.json()
			expect(data.error).toContain('Admin Rolle')
		})

		it('should reject invalid role', async () => {
			const request = new Request('http://localhost/api/role', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ role: 'invalid' })
			})

			const response = await POST({ locals, request } as { locals: TestLocals; request: Request })
			expect(response.status).toBe(400)

			const data = await response.json()
			expect(data.error).toContain('Ungültige Rolle')
		})

		it('should reject missing role', async () => {
			const request = new Request('http://localhost/api/role', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({})
			})

			const response = await POST({ locals, request } as { locals: TestLocals; request: Request })
			expect(response.status).toBe(400)
		})
	})

	describe('Role limits', () => {
		it('should reject participant role when limit reached', async () => {
			// Mock 5 participants already (reaching the limit of 5)
			mockPB = createPBMock({
				users: {
					getFullList: () =>
						Promise.resolve([
							makeUser({ id: 'p1', role: 'participant' }),
							makeUser({ id: 'p2', role: 'participant' }),
							makeUser({ id: 'p3', role: 'participant' }),
							makeUser({ id: 'p4', role: 'participant' }),
							makeUser({ id: 'p5', role: 'participant' })
						])
				},
				settings: {
					getFullList: () =>
						Promise.resolve([
							makeSettings({
								maxParticipantCount: 5,
								maxJurorCount: 3
							})
						])
				}
			})
			locals.pb = mockPB

			const request = new Request('http://localhost/api/role', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ role: 'participant' })
			})

			const response = await POST({ locals, request } as { locals: TestLocals; request: Request })
			expect(response.status).toBe(400)

			const data = await response.json()
			expect(data.error).toContain('Maximale Anzahl Teilnehmer erreicht')
		})

		it('should reject juror role when limit reached', async () => {
			// Mock 3 jurors already (reaching the limit of 3)
			mockPB = createPBMock({
				users: {
					getFullList: () =>
						Promise.resolve([
							makeUser({ id: 'j1', role: 'juror' }),
							makeUser({ id: 'j2', role: 'juror' }),
							makeUser({ id: 'j3', role: 'juror' })
						])
				},
				settings: {
					getFullList: () =>
						Promise.resolve([
							makeSettings({
								maxParticipantCount: 5,
								maxJurorCount: 3
							})
						])
				}
			})
			locals.pb = mockPB

			const request = new Request('http://localhost/api/role', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ role: 'juror' })
			})

			const response = await POST({ locals, request } as { locals: TestLocals; request: Request })
			expect(response.status).toBe(400)

			const data = await response.json()
			expect(data.error).toContain('Maximale Anzahl Juroren erreicht')
		})

		it('should not limit spectator role', async () => {
			const request = new Request('http://localhost/api/role', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ role: 'spectator' })
			})

			const response = await POST({ locals, request } as { locals: TestLocals; request: Request })
			expect(response.status).toBe(200)
		})
	})

	describe('Existing role check', () => {
		it('should reject if user already has a role', async () => {
			locals.user = makeUser({ id: 'testuser', role: 'participant' })

			const request = new Request('http://localhost/api/role', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ role: 'spectator' })
			})

			const response = await POST({ locals, request } as { locals: TestLocals; request: Request })
			expect(response.status).toBe(400)

			const data = await response.json()
			expect(data.error).toContain('Rolle bereits vergeben')
		})
	})

	describe('Settings fallback', () => {
		it('should use default limits when settings collection is unavailable', async () => {
			mockPB = createPBMock({
				users: {
					getFullList: () => Promise.resolve([])
				},
				settings: {
					getFullList: () => Promise.reject(new Error('Settings collection not found'))
				}
			})
			locals.pb = mockPB

			const request = new Request('http://localhost/api/role', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ role: 'participant' })
			})

			const response = await POST({ locals, request } as { locals: TestLocals; request: Request })
			expect(response.status).toBe(200)
		})
	})

	describe('Edge cases', () => {
		it('should handle malformed JSON', async () => {
			const request = new Request('http://localhost/api/role', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: 'invalid json'
			})

			const response = await POST({ locals, request } as { locals: TestLocals; request: Request })
			expect(response.status).toBe(400)

			const data = await response.json()
			expect(data.error).toContain('Ungültiger Request Body')
		})

		it('should handle database errors gracefully', async () => {
			mockPB = createPBMock({
				users: {
					getFullList: () => Promise.resolve([]),
					update: () => Promise.reject(new Error('Database error'))
				},
				settings: {
					getFullList: () => Promise.resolve([])
				}
			})
			locals.pb = mockPB

			const request = new Request('http://localhost/api/role', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ role: 'spectator' })
			})

			const response = await POST({ locals, request } as { locals: TestLocals; request: Request })
			expect(response.status).toBe(500)

			const data = await response.json()
			expect(data.error).toContain('Fehler beim Speichern der Rolle')
		})
	})
})
