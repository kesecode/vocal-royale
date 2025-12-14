import type { RequestHandler } from './$types'
import { json } from '@sveltejs/kit'
import type { UsersResponse } from '$lib/pocketbase-types'
import { logger } from '$lib/server/logger'

const COLLECTION = 'users' as const
const PER_PAGE = 10

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) {
		return json({ error: 'not_authenticated' }, { status: 401 })
	}
	if (locals.user.role !== 'admin') {
		return json({ error: 'forbidden' }, { status: 403 })
	}

	try {
		const page = Number(url.searchParams.get('page')) || 1
		logger.info('Admin Users GET', { page, perPage: PER_PAGE })

		const result = await locals.pb.collection(COLLECTION).getList(page, PER_PAGE, {
			sort: '-created',
			filter: 'role != "admin"'
		})

		logger.info('Admin Users GET success', {
			page: result.page,
			totalPages: result.totalPages,
			totalItems: result.totalItems
		})

		return json({
			items: result.items,
			page: result.page,
			perPage: result.perPage,
			totalItems: result.totalItems,
			totalPages: result.totalPages
		})
	} catch (e: unknown) {
		const err = e as Error & { status?: number; message?: string }
		logger.error('Admin Users GET failed', {
			status: err?.status,
			message: err?.message
		})
		return json({ error: 'fetch_failed' }, { status: 500 })
	}
}

export const PATCH: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'not_authenticated' }, { status: 401 })
	}
	if (locals.user.role !== 'admin') {
		return json({ error: 'forbidden' }, { status: 403 })
	}

	let payload: { userId?: string; checkedIn?: boolean }
	try {
		payload = await request.json()
	} catch {
		return json({ error: 'invalid_json' }, { status: 400 })
	}

	const { userId, checkedIn } = payload
	if (!userId || typeof checkedIn !== 'boolean') {
		logger.warn('Admin Users PATCH invalid payload', { userId, checkedIn })
		return json({ error: 'invalid_payload' }, { status: 400 })
	}

	try {
		logger.info('Admin Users PATCH (check-in toggle)', { userId, checkedIn })

		const updated = (await locals.pb.collection(COLLECTION).update(userId, {
			checkedIn
		})) as UsersResponse

		logger.info('Admin Users PATCH success', { id: updated.id, checkedIn: updated.checkedIn })
		return json({ ok: true, user: updated })
	} catch (e: unknown) {
		const err = e as Error & { status?: number; message?: string }
		logger.error('Admin Users PATCH failed', {
			status: err?.status,
			message: err?.message
		})
		return json({ error: 'update_failed' }, { status: 500 })
	}
}

export const PUT: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'not_authenticated' }, { status: 401 })
	}
	if (locals.user.role !== 'admin') {
		return json({ error: 'forbidden' }, { status: 403 })
	}

	let payload: { userId?: string; role?: string }
	try {
		payload = await request.json()
	} catch {
		return json({ error: 'invalid_json' }, { status: 400 })
	}

	const { userId, role } = payload
	const validRoles = ['default', 'participant', 'spectator', 'juror', 'admin']
	if (!userId || !role || !validRoles.includes(role)) {
		logger.warn('Admin Users PUT invalid payload', { userId, role })
		return json({ error: 'invalid_payload' }, { status: 400 })
	}

	try {
		logger.info('Admin Users PUT (role change by admin)', { userId, newRole: role })

		// Admin role change: NO song choice deletion
		const updated = (await locals.pb.collection(COLLECTION).update(userId, {
			role
		})) as UsersResponse

		logger.info('Admin Users PUT success - role changed without deleting song choices', {
			id: updated.id,
			newRole: updated.role
		})
		return json({ ok: true, user: updated })
	} catch (e: unknown) {
		const err = e as Error & { status?: number; message?: string }
		logger.error('Admin Users PUT failed', {
			status: err?.status,
			message: err?.message
		})
		return json({ error: 'update_failed' }, { status: 500 })
	}
}

export const DELETE: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'not_authenticated' }, { status: 401 })
	}
	if (locals.user.role !== 'admin') {
		return json({ error: 'forbidden' }, { status: 403 })
	}

	let payload: { userId?: string }
	try {
		payload = await request.json()
	} catch {
		return json({ error: 'invalid_json' }, { status: 400 })
	}

	const { userId } = payload
	if (!userId) {
		logger.warn('Admin Users DELETE invalid payload', { userId })
		return json({ error: 'invalid_payload' }, { status: 400 })
	}

	// Prevent self-deletion
	if (userId === locals.user.id) {
		logger.warn('Admin Users DELETE attempted self-deletion', { userId })
		return json({ error: 'cannot_delete_self' }, { status: 400 })
	}

	try {
		logger.info('Admin Users DELETE - starting cascade delete', { userId })

		// First, delete all song_choices for this user (cascade)
		const songChoices = await locals.pb.collection('song_choices').getFullList({
			filter: `user = "${userId}"`
		})

		for (const choice of songChoices) {
			await locals.pb.collection('song_choices').delete(choice.id)
			logger.info('Deleted song_choice', { songChoiceId: choice.id, userId })
		}

		// Now delete the user
		await locals.pb.collection(COLLECTION).delete(userId)

		logger.info('Admin Users DELETE success', {
			userId,
			deletedSongChoices: songChoices.length
		})
		return json({ ok: true, deletedSongChoices: songChoices.length })
	} catch (e: unknown) {
		const err = e as Error & { status?: number; message?: string }
		logger.error('Admin Users DELETE failed', {
			status: err?.status,
			message: err?.message
		})
		return json({ error: 'delete_failed', message: err?.message }, { status: 500 })
	}
}
