import { describe, it, expect, vi } from 'vitest'
import { GET, POST } from './+server'
import { createPBMock, jsonOf, makeUser, makeURL } from '../../../test/mocks'

// Mock Apple token module to always return a token
vi.mock('$lib/server/appleToken', () => ({
  getAppleMusicToken: () => 'test-token'
}))

interface MakeEventOptions {
  method?: 'GET' | 'POST'
  user?: { id?: string; role?: string }
  pb?: ReturnType<typeof createPBMock>
  body?: Record<string, unknown>
}

function makeEvent(pathname: string, opts?: MakeEventOptions) {
  const url = makeURL(pathname)
  const request = new Request(url, opts?.method === 'POST'
    ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(opts?.body ?? {}) }
    : { method: 'GET' })
  return {
    request,
    url,
    locals: { user: opts?.user ?? null, pb: opts?.pb ?? createPBMock() },
    // stub fetch for Apple API
    fetch: vi.fn(async () => new Response(JSON.stringify({
      results: {
        songs: {
          data: [
            { id: 'apple:1', attributes: { artistName: 'Artist', name: 'Title', hasLyrics: true } }
          ]
        }
      }
    }), { status: 200, headers: { 'content-type': 'application/json' } }))
  }
}

describe('song-choice/api GET', () => {
  it('401 for unauthenticated users', async () => {
    const res = await GET(makeEvent('/song-choice/api') as unknown as Parameters<typeof GET>[0])
    expect(res.status).toBe(401)
  })

  it('403 for non-participants', async () => {
    const user = makeUser({ role: 'spectator' })
    const res = await GET(makeEvent('/song-choice/api', { user }) as unknown as Parameters<typeof GET>[0])
    expect(res.status).toBe(403)
  })

  it('returns 5 slots and fills existing choices', async () => {
    const user = makeUser({ id: 'u1', role: 'participant' })
    const pb = createPBMock({
      song_choices: {
        getFullList: async () => [
          { id: 'c1', round: 1, artist: 'A', songTitle: 'X', confirmed: true, appleMusicSongId: 'apple:1' },
          { id: 'c3', round: 3, artist: 'B', songTitle: 'Y', confirmed: false }
        ]
      }
    })
    const res = await GET(makeEvent('/song-choice/api', { user, pb }) as unknown as Parameters<typeof GET>[0])
    expect(res.status).toBe(200)
    const body = await jsonOf(res) as { songs: Array<{ artist?: string; songTitle?: string; confirmed?: boolean }> }
    expect(body.songs).toHaveLength(5)
    expect(body.songs[2]).toMatchObject({ artist: 'B', songTitle: 'Y', confirmed: false })
  })
})

describe('song-choice/api POST', () => {
  it('401 for unauthenticated users', async () => {
    const res = await POST(makeEvent('/song-choice/api', { method: 'POST', body: {} }) as unknown as Parameters<typeof GET>[0])
    expect(res.status).toBe(401)
  })
  it('403 for non-participants', async () => {
    const user = makeUser({ role: 'spectator' })
    const res = await POST(makeEvent('/song-choice/api', { method: 'POST', user, body: {} }) as unknown as Parameters<typeof GET>[0])
    expect(res.status).toBe(403)
  })
  it('validates fields', async () => {
    const user = makeUser({ role: 'participant' })
    const res = await POST(makeEvent('/song-choice/api', { method: 'POST', user, body: { round: 1, artist: '', songTitle: '' } }) as unknown as Parameters<typeof GET>[0])
    expect(res.status).toBe(400)
  })
  it('verifies via Apple and creates choice when none exists', async () => {
    const user = makeUser({ id: 'u1', role: 'participant' })
    const pb = createPBMock({
      song_choices: {
        getList: async () => ({ items: [] }),
        create: async (data: Record<string, unknown>) => ({ id: 'new-choice', ...data })
      }
    })
    const body = { round: 2, artist: 'Artist', songTitle: 'Title', confirmed: true }
    const res = await POST(makeEvent('/song-choice/api', { method: 'POST', user, pb, body }) as unknown as Parameters<typeof GET>[0])
    expect(res.status).toBe(200)
    const data = await jsonOf(res) as { ok: boolean; id: string }
    expect(data.ok).toBe(true)
    expect(data.id).toBe('new-choice')
  })
  it('updates existing choice', async () => {
    const user = makeUser({ id: 'u1', role: 'participant' })
    const pb = createPBMock({
      song_choices: {
        getList: async () => ({ items: [{ id: 'c1', user: 'u1', round: 3 }] }),
        update: async (id: string, data: Record<string, unknown>) => ({ id, ...data })
      }
    })
    const body = { round: 3, artist: 'New', songTitle: 'Song', confirmed: false }
    const res = await POST(makeEvent('/song-choice/api', { method: 'POST', user, pb, body }) as unknown as Parameters<typeof GET>[0])
    expect(res.status).toBe(200)
    const data = await jsonOf(res) as { ok: boolean; id: string }
    expect(data.ok).toBe(true)
    expect(data.id).toBe('c1')
  })
})

