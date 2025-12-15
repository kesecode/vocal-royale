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
	performanceRating?: number
	vocalRating?: number
	difficultyRating?: number
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
			.filter((u) => !u.eliminated)
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
			comment: (r.comment ?? '').slice(0, 100),
			performanceRating: r.performanceRating ? Number(r.performanceRating) : undefined,
			vocalRating: r.vocalRating ? Number(r.vocalRating) : undefined,
			difficultyRating: r.difficultyRating ? Number(r.difficultyRating) : undefined
		}))

		logger.info('Ratings GET success', {
			participants: participants.length,
			ratings: ratings.length
		})
		return json({ round, participants, ratings, userRole: locals.user.role })
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
	// Nur Zuschauer (spectator) und Juroren (juror) dürfen Bewertungen schreiben
	if (locals.user.role !== 'spectator' && locals.user.role !== 'juror') {
		return json({ error: 'forbidden' }, { status: 403 })
	}

	// Check if user is checked in
	try {
		const user = (await locals.pb.collection('users').getOne(locals.user.id)) as UsersResponse
		if (!user.checkedIn) {
			return json({ error: 'not_checked_in' }, { status: 403 })
		}
	} catch {
		return json({ error: 'user_check_failed' }, { status: 500 })
	}

	type Payload = {
		round?: number
		ratedUser?: string
		rating?: number
		comment?: string
		performanceRating?: number
		vocalRating?: number
		difficultyRating?: number
	}
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
	const performanceRating = payload?.performanceRating
		? Number(payload.performanceRating)
		: undefined
	const vocalRating = payload?.vocalRating ? Number(payload.vocalRating) : undefined
	const difficultyRating = payload?.difficultyRating ? Number(payload.difficultyRating) : undefined

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
	// Für Juroren: Validiere die 3 separaten Ratings
	if (locals.user.role === 'juror') {
		if (
			performanceRating === undefined ||
			vocalRating === undefined ||
			difficultyRating === undefined
		) {
			return json({ error: 'missing_juror_ratings' }, { status: 400 })
		}
		if (!Number.isFinite(performanceRating) || performanceRating < 1 || performanceRating > 5) {
			return json({ error: 'invalid_performance_rating' }, { status: 400 })
		}
		if (!Number.isFinite(vocalRating) || vocalRating < 1 || vocalRating > 5) {
			return json({ error: 'invalid_vocal_rating' }, { status: 400 })
		}
		if (!Number.isFinite(difficultyRating) || difficultyRating < 1 || difficultyRating > 5) {
			return json({ error: 'invalid_difficulty_rating' }, { status: 400 })
		}
	} else {
		// Für Spectators: Validiere das normale Rating
		if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
			return json({ error: 'invalid_rating' }, { status: 400 })
		}
	}

	// Guard: block saving outside of rating_phase/rating_refinement AND only allow ratings for active participant (except in rating_refinement)
	try {
		const stateList = (await locals.pb.collection('competition_state').getList(1, 1, {
			sort: '-updated'
		})) as ListResult<CompetitionStateResponse>
		const stateRec = stateList.items[0]
		const phase = stateRec?.roundState ?? 'result_locked'

		// Only allow ratings in rating_phase or rating_refinement
		if (phase !== 'rating_phase' && phase !== 'rating_refinement') {
			return json({ error: 'rating_closed' }, { status: 400 })
		}

		// In rating_refinement, allow ratings for any participant (no active participant check)
		// In rating_phase, only allow ratings for the currently active participant
		if (phase === 'rating_phase') {
			const activeParticipant = stateRec?.activeParticipant
			if (!activeParticipant) {
				return json({ error: 'no_active_participant' }, { status: 400 })
			}
			if (ratedUser !== activeParticipant) {
				logger.warn('Ratings POST rejected: wrong participant', {
					ratedUser,
					activeParticipant,
					userId: locals.user.id
				})
				return json({ error: 'wrong_participant' }, { status: 400 })
			}
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
			const updateData: Partial<RatingsRecord> =
				locals.user.role === 'juror'
					? {
							rating:
								Math.round(((performanceRating! + vocalRating! + difficultyRating!) / 3) * 2) / 2,
							performanceRating,
							vocalRating,
							difficultyRating,
							comment
						}
					: { rating, comment }
			const updated = await locals.pb.collection(COLLECTION).update(rec.id, updateData)
			logger.info('Ratings update', { id: rec.id, round, ratedUser })
			return json({ ok: true, id: updated.id })
		}

		const createData: RatingsRecord =
			locals.user.role === 'juror'
				? {
						author: locals.user.id,
						ratedUser,
						round,
						rating:
							Math.round(((performanceRating! + vocalRating! + difficultyRating!) / 3) * 2) / 2,
						performanceRating,
						vocalRating,
						difficultyRating,
						comment
					}
				: {
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
