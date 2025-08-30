import { describe, it, expect, vi } from 'vitest'
// Mock PocketBase used in hooks so we can control auth via cookie
vi.mock('pocketbase', () => {
  return {
    default: function MockPB() {
      const self: any = this
      self.collection = vi.fn(() => ({}))
      self.authStore = {
        record: null as any,
        loadFromCookie: vi.fn((cookie: string) => {
          // allow tests to set role via a simple cookie string like "role=spectator; id=u1"
          const role = /role=([^;]+)/.exec(cookie || '')?.[1]
          const id = /id=([^;]+)/.exec(cookie || '')?.[1] || 'u1'
          if (role) self.authStore.record = { id, role }
        }),
        exportToCookie: vi.fn(() => 'pb_auth=stub; Path=/; HttpOnly'),
        clear: vi.fn()
      }
    }
  }
})
import { handle as hookHandle } from './hooks.server'
import { makeURL } from './test/mocks'

function makeEvent(pathname: string, cookie = '') {
  const url = makeURL(pathname)
  const req = new Request(url, { headers: cookie ? { cookie } : {} as any })
  return {
    request: req,
    url,
    locals: { pb: null as any, user: null },
    cookies: { get: () => null, set: () => {}, delete: () => {} }
  }
}

describe('hooks.server route guard', () => {
  it('redirects unauthenticated to /auth', async () => {
    const event = makeEvent('/rating')
    const resolve = () => Promise.resolve(new Response('ok'))
    // pb has no auth record => unauthenticated
    await expect(hookHandle({ event, resolve })).rejects.toMatchObject({ status: 303 })
  })

  it('redirects logged-in users away from /auth', async () => {
    const event = makeEvent('/auth', 'role=spectator; id=u1')
    const resolve = () => Promise.resolve(new Response('ok'))
    await expect(hookHandle({ event, resolve })).rejects.toMatchObject({ status: 303 })
  })

  it('allows participant on /song-choice and denies /rating', async () => {
    // Allowed route
    const event1 = makeEvent('/song-choice', 'role=participant; id=u2')
    const resolve = () => Promise.resolve(new Response('ok'))
    const resp = await hookHandle({ event: event1, resolve })
    expect(resp.status).toBe(200)

    // Forbidden route
    const event2 = makeEvent('/rating', 'role=participant; id=u2')
    await expect(hookHandle({ event: event2, resolve })).rejects.toMatchObject({ status: 303 })
  })

  it('allows spectator on /rating and denies /song-choice', async () => {
    const resolve = () => Promise.resolve(new Response('ok'))

    const event1 = makeEvent('/rating', 'role=spectator; id=u3')
    const resp = await hookHandle({ event: event1, resolve })
    expect(resp.status).toBe(200)

    const event2 = makeEvent('/song-choice', 'role=spectator; id=u3')
    await expect(hookHandle({ event: event2, resolve })).rejects.toMatchObject({ status: 303 })
  })

  it('allows admin on /admin', async () => {
    const resolve = () => Promise.resolve(new Response('ok'))
    const event = makeEvent('/admin', 'role=admin; id=admin1')
    const resp = await hookHandle({ event, resolve })
    expect(resp.status).toBe(200)
  })
})
