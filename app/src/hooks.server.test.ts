import { describe, it, expect, vi } from 'vitest'
import type { TypedPocketBase } from '$lib/pocketbase-types'
// Mock PocketBase used in hooks so we can control auth via cookie
vi.mock('pocketbase', () => {
	return {
		default: function MockPB(this: {
			collection: (name: string) => Record<string, unknown>
			authStore: {
				record: unknown
				loadFromCookie: (cookie: string) => void
				exportToCookie: () => string
				clear: () => void
				isValid?: boolean
			}
		}) {
			this.collection = vi.fn(() => ({
				authRefresh: vi.fn(async () => ({}))
			}))
			const authStore = {
				record: null as unknown,
				isValid: false,
				loadFromCookie: vi.fn((cookie: string) => {
					// allow tests to set role via a simple cookie string like "role=spectator; id=u1"
					const role = /role=([^;]+)/.exec(cookie || '')?.[1]
					const id = /id=([^;]+)/.exec(cookie || '')?.[1] || 'u1'
					if (role) {
						authStore.record = { id, role }
						authStore.isValid = true
					}
				}),
				exportToCookie: vi.fn(() => 'pb_auth=stub; Path=/; HttpOnly'),
				clear: vi.fn()
			}
			this.authStore = authStore
		}
	}
})
import { handle as hookHandle } from './hooks.server'
import { createPBMock, makeURL } from './test/mocks'

type HookArg = Parameters<typeof hookHandle>[0]
type HookEvent = HookArg['event']
type HookResolve = HookArg['resolve']

function makeEvent(pathname: string, cookie = ''): HookEvent {
	const url = makeURL(pathname)
	const headers: HeadersInit | undefined = cookie ? { cookie } : undefined
	const request = new Request(url, headers ? { headers } : undefined)
	return {
		request,
		url,
		locals: { pb: createPBMock() as unknown as TypedPocketBase, user: null },
		cookies: { get: () => null, set: () => {}, delete: () => {} }
	} as unknown as HookEvent
}

describe('hooks.server route guard', () => {
	it('redirects unauthenticated to /auth', async () => {
		const event = makeEvent('/rating')
		const resolve: HookResolve = () => Promise.resolve(new Response('ok'))
		// pb has no auth record => unauthenticated
		await expect(hookHandle({ event, resolve })).rejects.toMatchObject({ status: 303 })
	})

	it('redirects logged-in users away from /auth', async () => {
		const event = makeEvent('/auth', 'role=spectator; id=u1')
		const resolve: HookResolve = () => Promise.resolve(new Response('ok'))
		await expect(hookHandle({ event, resolve })).rejects.toMatchObject({ status: 303 })
	})

	it('allows participant on /song-choice and denies /rating', async () => {
		// Allowed route
		const event1 = makeEvent('/song-choice', 'role=participant; id=u2')
		const resolve: HookResolve = () => Promise.resolve(new Response('ok'))
		const resp = await hookHandle({ event: event1, resolve })
		expect(resp.status).toBe(200)

		// Forbidden route
		const event2 = makeEvent('/rating', 'role=participant; id=u2')
		await expect(hookHandle({ event: event2, resolve })).rejects.toMatchObject({ status: 303 })
	})

	it('allows spectator on /rating and denies /song-choice', async () => {
		const resolve: HookResolve = () => Promise.resolve(new Response('ok'))

		const event1 = makeEvent('/rating', 'role=spectator; id=u3')
		const resp = await hookHandle({ event: event1, resolve })
		expect(resp.status).toBe(200)

		const event2 = makeEvent('/song-choice', 'role=spectator; id=u3')
		await expect(hookHandle({ event: event2, resolve })).rejects.toMatchObject({ status: 303 })
	})

	it('allows admin on /admin', async () => {
		const resolve: HookResolve = () => Promise.resolve(new Response('ok'))
		const event = makeEvent('/admin', 'role=admin; id=admin1')
		const resp = await hookHandle({ event, resolve })
		expect(resp.status).toBe(200)
	})
})

describe('hooks.server cookie sync', () => {
	it('appends set-cookie header via exportToCookie', async () => {
		const event = makeEvent('/song-choice', 'role=participant; id=u9')
		const resolve: HookResolve = () => Promise.resolve(new Response('ok'))
		const resp = await hookHandle({ event, resolve })
		expect(resp.status).toBe(200)
		// Our PocketBase mock returns this fixed cookie string
		expect(resp.headers.get('set-cookie')).toBe('pb_auth=stub; Path=/; HttpOnly')
	})
})
