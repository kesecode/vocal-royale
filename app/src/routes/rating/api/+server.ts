import type { RequestHandler } from './$types'
import { json } from '@sveltejs/kit'
import type { ListResult } from 'pocketbase'
import type {
	RatingsRecord,
	RatingsResponse,
	UsersResponse,
	CompetitionStateResponse
} from '$lib/pocketbase-types'
import { logger } from '$lib/server/logger'

const COLLECTION = 'ratings' as const

type Participant = {
	id: string
	name: string
	firstName?: string
	artistName?: string
	eliminated?: boolean
	sangThisRound?: boolean
}

type RatingDTO = {
	ratedUser: string
	rating: number
	comment?: string
}

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) {
		return json({ error: 'not_authenticated' }, { status: 401 })
	}
	const role = locals.user.role
	if (role !== 'spectator' && role !== 'juror') {
		return json({ error: 'forbidden' }, { status: 403 })
	}

	const roundParam = url.searchParams.get('round') || '1'
	const round = Number(roundParam)
	if (!Number.isFinite(round) || round < 1 || round > 5) {
		return json({ error: 'invalid_round' }, { status: 400 })
	}

	try {
		const users = (await locals.pb.collection('users').getFullList()) as UsersResponse[]
		const participants: Participant[] = users
			.filter((u) => u.id !== locals.user!.id)
			.filter((u) => u.role === 'participant')
			.filter((u) => !Boolean(u.eliminated ?? false))
			.map((u) => {
				const name =
					u.name ||
					`${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() ||
					u.email ||
					u.username ||
					u.id
				return {
					id: u.id,
					name,
					firstName: u.firstName,
					artistName: u.artistName,
					eliminated: Boolean(u.eliminated ?? false),
					sangThisRound: Boolean(u.sangThisRound ?? false)
				}
			})
			.sort((a, b) => a.name.localeCompare(b.name, 'de')) // simple stable order

		// Fetch ratings authored by current user for this round
		const list = (await locals.pb.collection(COLLECTION).getFullList({
			filter: `author = "${locals.user.id}" && round = ${round}`
		})) as RatingsResponse[]

		const ratings: RatingDTO[] = list.map((r) => ({
			ratedUser: r.ratedUser,
			rating: Number(r.rating) || 0,
			comment: (r.comment ?? '').slice(0, 100)
		}))

		logger.info('Ratings GET success', {
			participants: participants.length,
			ratings: ratings.length
		})
		return json({ round, participants, ratings })
	} catch (e: unknown) {
		const err = e as Error & { status?: number; url?: string; data?: unknown }
		logger.error('Ratings GET failed', {
			status: err?.status,
			message: err?.message,
			url: err?.url,
			data: err?.data
		})
		return json({ error: 'fetch_failed' }, { status: 500 })
	}
}

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'not_authenticated' }, { status: 401 })
	}
	// Nur Zuschauer (spectator) dürfen Bewertungen schreiben
	if (locals.user.role !== 'spectator') {
		return json({ error: 'forbidden' }, { status: 403 })
	}

	type Payload = { round?: number; ratedUser?: string; rating?: number; comment?: string }
	let payload: Payload
	try {
		payload = await request.json()
	} catch {
		return json({ error: 'invalid_json' }, { status: 400 })
	}

	const round = Number(payload?.round)
	const ratedUser = String(payload?.ratedUser ?? '').trim()
	const rating = Number(payload?.rating)
	const comment = String(payload?.comment ?? '').slice(0, 100)

	logger.info('Ratings POST', { userId: locals.user.id, round, ratedUser })

	if (!Number.isFinite(round) || round < 1 || round > 5) {
		return json({ error: 'invalid_round' }, { status: 400 })
	}
	if (!ratedUser) {
		return json({ error: 'invalid_ratedUser' }, { status: 400 })
	}
	if (ratedUser === locals.user.id) {
		return json({ error: 'self_rating_not_allowed' }, { status: 400 })
	}
	if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
		return json({ error: 'invalid_rating' }, { status: 400 })
	}

	// Guard: block saving outside of rating_phase
	try {
		const stateList = (await locals.pb.collection('competition_state').getList(1, 1, {
			sort: '-updated'
		})) as ListResult<CompetitionStateResponse>
		const stateRec = stateList.items[0]
		const phase = stateRec?.roundState ?? 'result_locked'
		if (
			phase === 'singing_phase' ||
			phase === 'result_locked' ||
			phase === 'result_phase' ||
			phase === 'break'
		) {
			return json({ error: 'rating_closed' }, { status: 400 })
		}
	} catch (e: unknown) {
		const err = e as Error & { status?: number; url?: string; data?: unknown }
		if (err?.status === 404) {
			// No state configured yet => default to closed
			return json({ error: 'rating_closed' }, { status: 400 })
		}
		logger.error('CompetitionState check failed', {
			status: err?.status,
			message: err?.message,
			url: err?.url,
			data: err?.data
		})
		return json({ error: 'save_failed' }, { status: 500 })
	}

	try {
		// Find existing record for (author, ratedUser, round)
		const list = (await locals.pb.collection(COLLECTION).getList(1, 1, {
			filter: `author = "${locals.user.id}" && ratedUser = "${ratedUser}" && round = ${round}`
		})) as ListResult<RatingsResponse>

		if (list.items.length) {
			const rec = list.items[0]
			const updateData: Partial<RatingsRecord> = { rating, comment }
			const updated = await locals.pb.collection(COLLECTION).update(rec.id, updateData)
			logger.info('Ratings update', { id: rec.id, round, ratedUser })
			return json({ ok: true, id: updated.id })
		}

		const createData: RatingsRecord = {
			author: locals.user.id,
			ratedUser,
			round,
			rating,
			comment
		}
		const created = await locals.pb.collection(COLLECTION).create(createData)
		logger.info('Ratings create', { id: created.id, round, ratedUser })
		return json({ ok: true, id: created.id })
	} catch (e: unknown) {
		const err = e as Error & { status?: number; url?: string; data?: unknown }
		logger.error('Ratings save failed', {
			status: err?.status,
			message: err?.message,
			url: err?.url,
			data: err?.data
		})
		return json({ error: 'save_failed' }, { status: 500 })
	}
}
