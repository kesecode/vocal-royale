import { describe, it, expect, vi } from 'vitest'
import { actions } from './+page.server'
import { createPBMock, makeUser } from '../../test/mocks'
import type { TypedPocketBase, UsersResponse } from '$lib/pocketbase-types'

function reqOf(fields: Record<string, unknown>): Request {
  const request = {
    formData: async () => ({
      get: (k: string) => (k in fields ? (fields as Record<string, unknown>)[k] ?? null : null) as unknown as FormDataEntryValue | null
    } as Pick<FormData, 'get'>)
  }
  return request as unknown as Request
}

describe('profile actions', () => {
  it('changePassword redirects unauthenticated', async () => {
    const event = {
      request: reqOf({}),
      locals: { user: null, pb: createPBMock() as unknown as TypedPocketBase }
    } as unknown as Parameters<typeof actions.changePassword>[0]

    await expect(actions.changePassword(event)).rejects.toMatchObject({ status: 303 })
  })

  it('changePassword validates mismatch', async () => {
    const user = makeUser({ id: 'u1', role: 'participant' }) as unknown as UsersResponse
    const pb = createPBMock({ users: { update: vi.fn(async () => ({})) } })

    const event = {
      request: reqOf({ password: 'a', passwordConfirm: 'b' }),
      locals: { user, pb: pb as unknown as TypedPocketBase }
    } as unknown as Parameters<typeof actions.changePassword>[0]

    const res = (await actions.changePassword(event)) as unknown
    const failRes = res as { status: number; data?: { message?: string } }
    expect(failRes.status).toBe(400)
    expect(failRes.data?.message).toBe('Passwörter stimmen nicht überein.')
  })

  it('changePassword updates and returns success', async () => {
    const user = makeUser({ id: 'u2', role: 'participant' }) as unknown as UsersResponse
    const update = vi.fn(async (id: string, data: Record<string, unknown>) => ({ id, ...data }))
    const pb = createPBMock({ users: { update } })

    const event = {
      request: reqOf({ password: 'secret123', passwordConfirm: 'secret123' }),
      locals: { user, pb: pb as unknown as TypedPocketBase }
    } as unknown as Parameters<typeof actions.changePassword>[0]

    const res = (await actions.changePassword(event)) as unknown
    expect(update).toHaveBeenCalledWith(user.id, expect.objectContaining({ password: 'secret123', passwordConfirm: 'secret123' }))
    expect(res).toMatchObject({ message: 'Passwort erfolgreich aktualisiert.', variant: 'success' })
  })

  it('changeArtist requires non-empty artistName', async () => {
    const user = makeUser({ id: 'u3', role: 'participant' }) as unknown as UsersResponse
    const pb = createPBMock({ users: { update: vi.fn(async () => ({})) } })

    const event = {
      request: reqOf({ artistName: '' }),
      locals: { user, pb: pb as unknown as TypedPocketBase }
    } as unknown as Parameters<typeof actions.changeArtist>[0]

    const res = (await actions.changeArtist(event)) as unknown
    const failRes = res as { status: number; data?: { message?: string } }
    expect(failRes.status).toBe(400)
    expect(failRes.data?.message).toBe('Bitte einen Künstlernamen eingeben.')
  })

  it('changeArtist updates and returns success', async () => {
    const user = makeUser({ id: 'u4', role: 'participant' }) as unknown as UsersResponse
    const update = vi.fn(async (id: string, data: Record<string, unknown>) => ({ id, ...data }))
    const pb = createPBMock({ users: { update } })

    const event = {
      request: reqOf({ artistName: 'New Name' }),
      locals: { user, pb: pb as unknown as TypedPocketBase }
    } as unknown as Parameters<typeof actions.changeArtist>[0]

    const res = (await actions.changeArtist(event)) as unknown
    expect(update).toHaveBeenCalledWith(user.id, expect.objectContaining({ artistName: 'New Name' }))
    expect(res).toMatchObject({ message: 'Künstlername gespeichert.', variant: 'success' })
  })

  it('logout clears auth and redirects', async () => {
    const user = makeUser({ id: 'u5', role: 'participant' }) as unknown as UsersResponse
    const pb = createPBMock()
    const event = {
      locals: { user, pb: pb as unknown as TypedPocketBase }
    } as unknown as Parameters<typeof actions.logout>[0]

    await expect(actions.logout(event)).rejects.toMatchObject({ status: 303 })
    expect(pb.authStore.clear).toHaveBeenCalled()
  })

  it('deleteAccount deletes user, clears auth and redirects to /auth?reason=account_deleted', async () => {
    const user = makeUser({ id: 'del1', role: 'participant' }) as unknown as UsersResponse
    const del = vi.fn(async () => {})
    const pb = createPBMock({ users: { delete: del } })

    const event = {
      locals: { user, pb: pb as unknown as TypedPocketBase }
    } as unknown as Parameters<typeof actions.deleteAccount>[0]

    await expect(actions.deleteAccount(event)).rejects.toMatchObject({ status: 303, location: '/auth?reason=account_deleted' })
    expect(del).toHaveBeenCalledWith(user.id)
    expect(pb.authStore.clear).toHaveBeenCalled()
  })

  it('deleteAccount returns failure on error without clearing auth', async () => {
    const user = makeUser({ id: 'del2', role: 'participant' }) as unknown as UsersResponse
    const del = vi.fn(async () => { throw new Error('db fail') })
    const pb = createPBMock({ users: { delete: del } })

    const event = {
      locals: { user, pb: pb as unknown as TypedPocketBase }
    } as unknown as Parameters<typeof actions.deleteAccount>[0]

    const res = (await actions.deleteAccount(event)) as unknown
    const failRes = res as { status: number; data?: { message?: string } }
    expect(failRes.status).toBe(400)
    expect(failRes.data?.message).toBe('Löschen fehlgeschlagen.')
    expect(pb.authStore.clear).not.toHaveBeenCalled()
  })
})
