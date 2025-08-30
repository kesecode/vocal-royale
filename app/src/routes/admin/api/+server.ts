import type { RequestHandler } from './$types'
import { json } from '@sveltejs/kit'
import type { ListResult } from 'pocketbase'
import type {
	CompetitionStateRecord,
	CompetitionStateResponse,
	RatingsResponse,
	UsersResponse
} from '$lib/pocketbase-types'
import { logger } from '$lib/server/logger'
import configData from '$lib/config/config.json'
import { env } from '$env/dynamic/private'

type AppConfig = { PARTICIPANTS_TO_ELIMINATE?: number[] }
const config: AppConfig = configData as AppConfig 

function readParticipantsToEliminate(): number[] {
  const raw = env.PARTICIPANTS_TO_ELIMINATE
  if (raw && raw.trim()) {
    try {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr)) return arr.map((n) => Number(n) || 0)
    } catch {
      // allow comma-separated fallback like "1,0,0,0"
      const csv = raw.split(',').map((s) => Number(s.trim()) || 0)
      if (csv.length) return csv
    }
  }
  return (config.PARTICIPANTS_TO_ELIMINATE ?? []).map((n) => Number(n) || 0)
}

const STATE_COLLECTION = 'competition_state' as const
const USERS_COLLECTION = 'users' as const
const RATINGS_COLLECTION = 'ratings' as const

async function getLatestState(locals: App.Locals): Promise<CompetitionStateResponse | null> {
	try {
		const list = (await locals.pb.collection(STATE_COLLECTION).getList(1, 1, {
			sort: '-updated'
		})) as ListResult<CompetitionStateResponse>
		return list.items[0] ?? null
	} catch (e: unknown) {
		const err = e as Error & { status?: number }
		if (err?.status === 404) return null
		throw e
	}
}

async function upsertState(
	locals: App.Locals,
	patch: Partial<CompetitionStateRecord>
): Promise<CompetitionStateResponse> {
	const current = await getLatestState(locals)
	if (!current) {
		const createData: CompetitionStateRecord = {
			competitionStarted: Boolean(patch.competitionStarted ?? false),
			roundState: (patch.roundState ?? 'result_locked') as CompetitionStateRecord['roundState'],
			round: Number(patch.round ?? 1) || 1,
			activeParticipant: patch.activeParticipant,
			// Only include competitionFinished if explicitly provided to avoid schema mismatch
			...(patch.competitionFinished !== undefined
				? { competitionFinished: Boolean(patch.competitionFinished) }
				: {})
		}
		const created = (await locals.pb
			.collection(STATE_COLLECTION)
			.create(createData)) as CompetitionStateResponse
		return created
	}
	const updated = (await locals.pb
		.collection(STATE_COLLECTION)
		.update(current.id, patch)) as CompetitionStateResponse
	return updated
}

async function pickRandomEligibleParticipant(locals: App.Locals): Promise<UsersResponse | null> {
	// Eligible: role=participant AND eliminated != true AND sangThisRound != true
	const list = (await locals.pb.collection(USERS_COLLECTION).getFullList({
		filter: 'role = "participant" && eliminated != true && sangThisRound != true'
	})) as UsersResponse[]
	if (!list.length) return null
	const idx = Math.floor(Math.random() * list.length)
	return list[idx] ?? null
}

async function getActiveParticipant(locals: App.Locals): Promise<UsersResponse | null> {
	const state = await getLatestState(locals)
	const id = state?.activeParticipant
	if (!id) return null
	try {
		const rec = (await locals.pb.collection(USERS_COLLECTION).getOne(id)) as UsersResponse
		return rec
	} catch (e: unknown) {
		const err = e as Error & { status?: number }
		if (err?.status === 404) return null
		throw e
	}
}

async function computeMissingRatings(
	locals: App.Locals,
	round: number,
	activeParticipantId: string
): Promise<{ missingCount: number; expectedCount: number }> {
	const voters = (await locals.pb.collection(USERS_COLLECTION).getFullList({
		filter: 'role = "spectator" || role = "juror"'
	})) as UsersResponse[]
	const expectedIds = new Set(voters.map((u) => u.id))

	const roundNum = Number(round) || 1
	const existing = (await locals.pb.collection(RATINGS_COLLECTION).getFullList({
		filter: `round = ${roundNum} && ratedUser = "${activeParticipantId}"`
	})) as RatingsResponse[]
	const authors = new Set(existing.map((r) => r.author))

	let missing = 0
	for (const id of expectedIds) {
		if (!authors.has(id)) missing++
	}
	return { missingCount: missing, expectedCount: expectedIds.size }
}

function toName(u: UsersResponse | null | undefined): string | null {
	if (!u) return null
	return u.firstName || u.name || u.username || u.email || u.id
}

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user || locals.user.role !== 'admin') {
		return json({ error: 'forbidden' }, { status: 403 })
	}
	const state = await getLatestState(locals)
	const active = await getActiveParticipant(locals)
	return json({
		state: state
			? {
					competitionStarted: !!state.competitionStarted,
					roundState: state.roundState,
					round: Number(state.round) || 1,
					competitionFinished: Boolean(state.competitionFinished ?? false),
					// sanitize: only expose activeParticipant if it exists
					activeParticipant: active ? active.id : null
				}
			: {
					competitionStarted: false,
					roundState: 'result_locked',
					round: 1,
					competitionFinished: false,
					activeParticipant: null
				},
		activeParticipant: active
			? {
					id: active.id,
					name: toName(active),
					artistName: active.artistName,
					sangThisRound: !!active.sangThisRound
				}
			: null
	})
}

type AdminAction =
	| 'start_competition'
	| 'activate_rating_phase'
	| 'next_participant'
	| 'finalize_ratings'
	| 'show_results'
	| 'start_next_round'
	| 'reset_game'

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user || locals.user.role !== 'admin') {
		return json({ error: 'forbidden' }, { status: 403 })
	}

	type Payload = { action?: AdminAction }
	let payload: Payload
	try {
		payload = await request.json()
	} catch {
		return json({ error: 'invalid_json' }, { status: 400 })
	}

	const action = String(payload?.action ?? '').trim() as AdminAction
	logger.info('Admin API action', { action })
	if (!action) return json({ error: 'invalid_action' }, { status: 400 })

	try {
		if (action === 'start_competition') {
			// Reset sangThisRound for all participants to ensure fresh round start
			try {
				const participants = (await locals.pb.collection(USERS_COLLECTION).getFullList({
					filter: 'role = "participant"'
				})) as UsersResponse[]
				await Promise.all(
					participants.map((p) =>
						locals.pb.collection(USERS_COLLECTION).update(p.id, { sangThisRound: false })
					)
				)
			} catch {
				logger.warn('Admin API: reset sangThisRound failed (continuing)', {})
			}

			const picked = await pickRandomEligibleParticipant(locals)
			const updated = await upsertState(locals, {
				competitionStarted: true,
				roundState: 'singing_phase',
				activeParticipant: picked?.id
			})
			const active = picked ?? (await getActiveParticipant(locals))
			logger.info('Admin API: start_competition', { activeParticipant: updated.activeParticipant })
			return json({
				ok: true,
				state: updated,
				activeParticipant: active
					? { id: active.id, name: toName(active), artistName: active.artistName }
					: null
			})
		}

		if (action === 'activate_rating_phase') {
			const state = await getLatestState(locals)
			const active = await getActiveParticipant(locals)
			if (!state || !active) {
				// clear stale pointer if present
				if (state?.activeParticipant) {
					await upsertState(locals, { activeParticipant: undefined })
				}
				return json({ error: 'no_active_participant' }, { status: 400 })
			}
			// Mark participant as sangThisRound and switch to rating phase
			await locals.pb.collection(USERS_COLLECTION).update(active.id, { sangThisRound: true })
			const updated = await upsertState(locals, { roundState: 'rating_phase' })
			logger.info('Admin API: activate_rating_phase', { activeParticipant: active.id })
			return json({
				ok: true,
				state: updated,
				activeParticipant: {
					id: active.id,
					name: toName(active),
					artistName: active.artistName,
					sangThisRound: true
				}
			})
		}

		if (action === 'next_participant') {
			const state = await getLatestState(locals)
			const active = await getActiveParticipant(locals)
			const round = Number(state?.round ?? 1) || 1
			if (!state || !active) {
				if (state?.activeParticipant) {
					await upsertState(locals, { activeParticipant: undefined })
				}
				return json({ error: 'no_active_participant' }, { status: 400 })
			}

			// Ensure all jurors and spectators have submitted ratings for the active participant
			const { missingCount, expectedCount } = await computeMissingRatings(locals, round, active.id)
			if (missingCount > 0) {
				logger.info('Admin API: missing ratings', { missingCount, expectedCount })
				return json({ error: 'missing_ratings', missingCount, expectedCount }, { status: 400 })
			}

			// Pick next eligible participant
			const picked = await pickRandomEligibleParticipant(locals)
			if (!picked) {
				const updated = await upsertState(locals, {
					roundState: 'break',
					activeParticipant: undefined
				})
				logger.info('Admin API: no more participants, break phase')
				return json({ ok: true, state: updated, activeParticipant: null })
			}
			const updated = await upsertState(locals, {
				roundState: 'singing_phase',
				activeParticipant: picked.id
			})
			logger.info('Admin API: next_participant', { activeParticipant: picked.id })
			return json({
				ok: true,
				state: updated,
				activeParticipant: { id: picked.id, name: toName(picked), artistName: picked.artistName }
			})
		}

		if (action === 'finalize_ratings') {
			const updated = await upsertState(locals, { roundState: 'result_locked' })
			logger.info('Admin API: finalize_ratings -> result_locked')
			const active = await getActiveParticipant(locals)
			return json({
				ok: true,
				state: updated,
				activeParticipant: active
					? { id: active.id, name: toName(active), artistName: active.artistName }
					: null
			})
		}

		if (action === 'show_results') {
			const state = await getLatestState(locals)
			const round = Number(state?.round ?? 1) || 1
			// Fetch active participants (non-eliminated)
			const participants = (await locals.pb.collection(USERS_COLLECTION).getFullList({
				filter: 'role = "participant" && eliminated != true'
			})) as UsersResponse[]
			const participantIds = new Set(participants.map((p) => p.id))

			// Fetch all ratings this round
			const allRatings = (await locals.pb.collection(RATINGS_COLLECTION).getFullList({
				filter: `round = ${round}`
			})) as RatingsResponse[]
			const grouped = new Map<string, { sum: number; count: number }>()
			for (const r of allRatings) {
				if (!participantIds.has(r.ratedUser)) continue
				const g = grouped.get(r.ratedUser) || { sum: 0, count: 0 }
				g.sum += Number(r.rating) || 0
				g.count += 1
				grouped.set(r.ratedUser, g)
			}

			type Row = {
				id: string
				name: string | null
				artistName?: string
				avg: number
				sum: number
				count: number
				eliminated: boolean
			}
			const rows: Row[] = participants.map((p) => {
				const g = grouped.get(p.id) || { sum: 0, count: 0 }
				const avg = g.count > 0 ? g.sum / g.count : 0
				return {
					id: p.id,
					name: toName(p),
					artistName: p.artistName,
					avg,
					sum: g.sum,
					count: g.count,
					eliminated: false
				}
			})

			// Sort ascending by average (lowest = worst)
			rows.sort((a, b) => a.avg - b.avg || a.name?.localeCompare(b.name || '') || 0)

            let eliminateCount = 0
            if (round >= 1 && round <= 4) {
                const arr = readParticipantsToEliminate()
                eliminateCount = Math.max(0, Number(arr?.[round - 1] ?? 0))
            }
			// In round 5 (finale) no elimination, show winner only
			if (round === 5) eliminateCount = 0
			// Ensure at least one participant remains
			eliminateCount = Math.min(eliminateCount, Math.max(rows.length - 1, 0))

			// Mark eliminated and persist
			const toEliminate = rows.slice(0, eliminateCount)
			if (toEliminate.length > 0) {
				await Promise.all(
					toEliminate.map((r) =>
						locals.pb.collection(USERS_COLLECTION).update(r.id, { eliminated: true })
					)
				)
				for (const r of toEliminate) r.eliminated = true
			}

			// Switch to result_phase; finalize competition on finale (round 5)
			const updated = await upsertState(locals, {
				roundState: 'result_phase',
				...(round === 5 ? { competitionFinished: true } : {})
			})

			// Winner convenience
			const winner =
				rows
					.slice()
					.sort(
						(a, b) => b.avg - a.avg || b.count - a.count || a.name?.localeCompare(b.name || '') || 0
					)[0] ?? null

			logger.info('Admin API: show_results', {
				round,
				eliminateCount,
				participants: rows.length,
				competitionFinished: round === 5
			})
			return json({ ok: true, state: updated, results: rows, winner })
		}

		if (action === 'start_next_round') {
			const state = await getLatestState(locals)
			const currentRound = Number(state?.round ?? 1) || 1
			if (currentRound >= 5) {
				return json({ error: 'no_next_round' }, { status: 400 })
			}
			const nextRound = currentRound + 1
			// Reset sangThisRound for all participants
			try {
				const participants = (await locals.pb.collection(USERS_COLLECTION).getFullList({
					filter: 'role = "participant"'
				})) as UsersResponse[]
				await Promise.all(
					participants.map((p) =>
						locals.pb.collection(USERS_COLLECTION).update(p.id, { sangThisRound: false })
					)
				)
			} catch {
				logger.warn('Admin API: reset sangThisRound for next round failed (continuing)')
			}

			// Pick first participant for next round
			const picked = await pickRandomEligibleParticipant(locals)
			const updated = await upsertState(locals, {
				competitionStarted: true,
				round: nextRound,
				roundState: 'singing_phase',
				activeParticipant: picked?.id ?? undefined
			})
			logger.info('Admin API: start_next_round', {
				nextRound,
				activeParticipant: picked?.id ?? null
			})
			return json({
				ok: true,
				state: updated,
				activeParticipant: picked
					? { id: picked.id, name: toName(picked), artistName: picked.artistName }
					: null
			})
		}

		if (action === 'reset_game') {
			// Reset all participants
			try {
				const participants = (await locals.pb.collection(USERS_COLLECTION).getFullList({
					filter: 'role = "participant"'
				})) as UsersResponse[]
				await Promise.all(
					participants.map((p) =>
						locals.pb
							.collection(USERS_COLLECTION)
							.update(p.id, { eliminated: false, sangThisRound: false })
					)
				)
			} catch (err) {
				logger.warn('Admin API: reset participants failed (continuing)', {
					error: (err as Error)?.message
				})
			}

			// Delete all ratings
			try {
				const ratings = (await locals.pb
					.collection(RATINGS_COLLECTION)
					.getFullList()) as RatingsResponse[]
				await Promise.all(ratings.map((r) => locals.pb.collection(RATINGS_COLLECTION).delete(r.id)))
			} catch (err) {
				logger.warn('Admin API: delete ratings failed (continuing)', {
					error: (err as Error)?.message
				})
			}

			// Reset competition state
			const current = await getLatestState(locals)
			let updated: CompetitionStateResponse
			if (current) {
				const patch: Partial<CompetitionStateRecord> & { activeParticipant?: string | null } = {
					competitionStarted: false,
					round: 1,
					roundState: 'result_locked',
					competitionFinished: false,
					activeParticipant: undefined
				}
				updated = (await locals.pb
					.collection(STATE_COLLECTION)
					.update(current.id, patch)) as CompetitionStateResponse
			} else {
				const createData: CompetitionStateRecord = {
					competitionStarted: false,
					round: 1,
					roundState: 'result_locked',
					competitionFinished: false
				}
				updated = (await locals.pb
					.collection(STATE_COLLECTION)
					.create(createData)) as CompetitionStateResponse
			}
			logger.info('Admin API: reset_game done')
			return json({ ok: true, state: updated, activeParticipant: null })
		}

		return json({ error: 'unknown_action' }, { status: 400 })
	} catch (e: unknown) {
		const err = e as Error & { status?: number; message?: string; url?: string; data?: unknown }
		logger.error('Admin API failed', {
			status: err?.status,
			message: err?.message,
			url: err?.url,
			data: err?.data
		})
		return json({ error: 'internal_error' }, { status: 500 })
	}
}
