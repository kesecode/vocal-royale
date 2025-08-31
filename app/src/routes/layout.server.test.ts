import { describe, it, expect } from 'vitest'
import { load as layoutLoad } from './+layout.server'
import { createPBMock, makeURL, makeUser } from '../test/mocks'
import type { TypedPocketBase, UsersResponse } from '$lib/pocketbase-types'

describe('+layout.server guard', () => {
  it('redirects unauthenticated to /auth with next', async () => {
    const event = {
      locals: { user: null, pb: createPBMock() as unknown as TypedPocketBase },
      url: makeURL('/profile')
    } as unknown as Parameters<typeof layoutLoad>[0]

    await expect(layoutLoad(event)).rejects.toMatchObject({ status: 303, location: '/auth?reason=auth_required&next=%2Fprofile' })
  })

  it('redirects logged-in users away from /auth', async () => {
    const user = makeUser({ id: 'u1', role: 'participant' }) as unknown as UsersResponse
    const event = {
      locals: { user, pb: createPBMock() as unknown as TypedPocketBase },
      url: makeURL('/auth')
    } as unknown as Parameters<typeof layoutLoad>[0]

    await expect(layoutLoad(event)).rejects.toMatchObject({ status: 303, location: '/' })
  })

  it('returns user and reason when allowed', async () => {
    const user = makeUser({ id: 'u2', role: 'participant' }) as unknown as UsersResponse
    const event = {
      locals: { user, pb: createPBMock() as unknown as TypedPocketBase },
      url: makeURL('/profile', '?reason=account_deleted')
    } as unknown as Parameters<typeof layoutLoad>[0]

    const res = await layoutLoad(event)
    expect(res).toMatchObject({ user: expect.objectContaining({ id: user.id }), reason: 'account_deleted' })
  })
})

