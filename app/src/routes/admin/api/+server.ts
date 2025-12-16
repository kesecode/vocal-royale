import type { RequestHandler } from './$types'
import { json } from '@sveltejs/kit'
import type {
	CompetitionStateRecord,
	CompetitionStateResponse,
	RatingsResponse,
	UsersResponse,
	SettingsResponse,
	SongChoicesResponse
} from '$lib/pocketbase-types'
import { logger } from '$lib/server/logger'
import {
	parseSettings,
	parseEliminationPattern,
	calculateTotalSongs
} from '$lib/utils/competition-settings'
import { getLatestCompetitionState } from '$lib/server/competition-state'

const STATE_COLLECTION = 'competition_state' as const
const USERS_COLLECTION = 'users' as const
const RATINGS_COLLECTION = 'ratings' as const

async function getLatestState(locals: App.Locals): Promise<CompetitionStateResponse | null> {
	return getLatestCompetitionState(locals.pb)
}

async function getCompetitionSettings(locals: App.Locals) {
	try {
		const settingsList = (await locals.pb
			.collection('settings')
			.getFullList()) as SettingsResponse[]
		if (settingsList.length > 0) {
			return parseSettings(settingsList[0])
		}
	} catch (error) {
		logger.warn('Failed to load competition settings, using defaults', { error })
	}
	return parseSettings(null) // Returns defaults
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

type MissingVoter = {
	id: string
	name: string
	role: string
}

async function computeMissingRatings(
	locals: App.Locals,
	round: number,
	activeParticipantId: string
): Promise<{ missingCount: number; expectedCount: number; missingVoters: MissingVoter[] }> {
	// Only consider checked-in voters (non-checked-in users can't rate anyway)
	const voters = (await locals.pb.collection(USERS_COLLECTION).getFullList({
		filter: '(role = "spectator" || role = "juror") && checkedIn = true'
	})) as UsersResponse[]

	const roundNum = Number(round) || 1
	const existing = (await locals.pb.collection(RATINGS_COLLECTION).getFullList({
		filter: `round = ${roundNum} && ratedUser = "${activeParticipantId}"`
	})) as RatingsResponse[]
	const authors = new Set(existing.map((r) => r.author))

	const missingVoters: MissingVoter[] = []
	for (const voter of voters) {
		if (!authors.has(voter.id)) {
			// Build full name from firstName + lastName, fallback to other fields
			let fullName = ''
			if (voter.firstName && voter.lastName) {
				fullName = `${voter.firstName} ${voter.lastName}`
			} else {
				fullName = voter.firstName || voter.name || voter.username || voter.email || voter.id
			}
			missingVoters.push({
				id: voter.id,
				name: fullName,
				role: voter.role || 'unknown'
			})
		}
	}
	return { missingCount: missingVoters.length, expectedCount: voters.length, missingVoters }
}

function toName(u: UsersResponse | null | undefined): string | null {
	if (!u) return null
	return u.firstName || u.name || u.username || u.email || u.id
}

type FinalRanking = {
	rank: number
	id: string
	name: string | null
	artistName?: string
	eliminatedInRound: number | null // null = Finalist
	avg: number
	count: number
}

async function computeFinalRankings(
	locals: App.Locals,
	finalRound: number
): Promise<FinalRanking[]> {
	// 1. Load ALL participants (including eliminated)
	const allParticipants = (await locals.pb.collection(USERS_COLLECTION).getFullList({
		filter: 'role = "participant"'
	})) as UsersResponse[]

	// 2. Load ALL ratings for all rounds (with author for juror weighting)
	const allRatings = (await locals.pb.collection(RATINGS_COLLECTION).getFullList({
		expand: 'author'
	})) as (RatingsResponse & { expand?: { author?: UsersResponse } })[]

	// 3. Sum ALL ratings per user (across all rounds) for total score
	const totalRatingsByUser = new Map<string, { sum: number; count: number }>()
	const lastRoundByUser = new Map<string, number>()
	for (const r of allRatings) {
		const rating = Number(r.rating) || 0
		const authorRole = r.expand?.author?.role
		const weight = authorRole === 'juror' ? 2 : 1
		// Aggregate ALL ratings for each user
		const g = totalRatingsByUser.get(r.ratedUser) || { sum: 0, count: 0 }
		g.sum += rating * weight
		g.count += weight
		totalRatingsByUser.set(r.ratedUser, g)
		// Track highest round with ratings for each user
		const currentLast = lastRoundByUser.get(r.ratedUser) || 0
		if (r.round > currentLast) {
			lastRoundByUser.set(r.ratedUser, r.round)
		}
	}

	// 4. Build ranking data for each participant using ALL ratings
	const rankings: FinalRanking[] = allParticipants.map((p) => {
		// Use ALL ratings across all rounds
		const g = totalRatingsByUser.get(p.id) || { sum: 0, count: 0 }
		const avg = g.count > 0 ? g.sum / g.count : 0

		// Determine eliminatedInRound from p.round (which stores elimination round when eliminated)
		const lastRoundWithRatings = lastRoundByUser.get(p.id) || finalRound
		const eliminatedInRound = p.eliminated ? (p.round ?? lastRoundWithRatings) : null

		return {
			rank: 0, // Will be set after sorting
			id: p.id,
			name: toName(p),
			artistName: p.artistName,
			eliminatedInRound,
			avg,
			count: g.count
		}
	})

	// 5. Sort: Primary by eliminatedInRound DESC (null = finalist = best), Secondary by avg DESC
	rankings.sort((a, b) => {
		// Finalists (null) come first, then highest round number
		const roundA = a.eliminatedInRound ?? finalRound + 1 // null = finalist, treated as highest
		const roundB = b.eliminatedInRound ?? finalRound + 1
		if (roundB !== roundA) {
			return roundB - roundA // Higher round = better
		}
		// Within same round, higher avg is better
		if (b.avg !== a.avg) {
			return b.avg - a.avg
		}
		// Tiebreaker: more votes is better
		if (b.count !== a.count) {
			return b.count - a.count
		}
		// Final tiebreaker: alphabetical
		return a.name?.localeCompare(b.name || '') || 0
	})

	// 6. Assign ranks
	rankings.forEach((r, i) => {
		r.rank = i + 1
	})

	return rankings
}

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user || locals.user.role !== 'admin') {
		return json({ error: 'forbidden' }, { status: 403 })
	}

	// Handle missing ratings query
	if (url.searchParams.get('missing_ratings') === '1') {
		const state = await getLatestState(locals)
		const active = await getActiveParticipant(locals)
		if (!state || !active) {
			return json({ missingVoters: [], missingCount: 0, expectedCount: 0 })
		}
		const round = Number(state.round) || 1
		const result = await computeMissingRatings(locals, round, active.id)
		return json(result)
	}

	const state = await getLatestState(locals)
	const active = await getActiveParticipant(locals)

	// Load song choice for active participant in current round
	let activeSongChoice: { artist: string; songTitle: string; appleMusicSongId?: string } | null =
		null
	if (active && state) {
		try {
			const round = Number(state.round) || 1
			const choices = (await locals.pb.collection('song_choices').getFullList({
				filter: `user = "${active.id}" && round = ${round}`
			})) as SongChoicesResponse[]
			if (choices.length > 0) {
				activeSongChoice = {
					artist: choices[0].artist,
					songTitle: choices[0].songTitle,
					appleMusicSongId: choices[0].appleMusicSongId || undefined
				}
			}
		} catch (error) {
			logger.warn('Failed to load song choice for active participant', { error })
		}
	}

	// Calculate remaining participants count for rating phase
	let remainingParticipantsCount = 0
	if (state?.competitionStarted && state?.roundState === 'rating_phase') {
		const remaining = (await locals.pb.collection(USERS_COLLECTION).getFullList({
			filter: 'role = "participant" && eliminated != true && sangThisRound != true'
		})) as UsersResponse[]
		remainingParticipantsCount = remaining.length
	}

	// Load results if in result_locked or publish_result
	type ResultRow = {
		id: string
		name: string | null
		artistName?: string
		avg: number
		sum: number
		count: number
		eliminated: boolean
		isTied?: boolean
	}
	let results: ResultRow[] | null = null
	let winner: ResultRow | null = null
	let hasTie = false
	let remainingToEliminate = 0
	let tiedParticipantIds: string[] = []
	let finalRankings: FinalRanking[] | null = null

	const roundState = state?.roundState
	if (roundState === 'result_locked' || roundState === 'publish_result') {
		try {
			const round = Number(state?.round ?? 1) || 1
			const settings = await getCompetitionSettings(locals)
			const isFinale = round === settings.totalRounds

			// In finale, compute full rankings with all participants
			if (isFinale) {
				finalRankings = await computeFinalRankings(locals, round)
				// Convert finalRankings to results format for admin display
				results = finalRankings.map((r) => ({
					id: r.id,
					name: r.name,
					artistName: r.artistName,
					avg: r.avg,
					sum: 0,
					count: r.count,
					eliminated: r.eliminatedInRound !== null
				}))
				// Set winner from final rankings (first place)
				if (finalRankings.length > 0) {
					const first = finalRankings[0]
					winner = {
						id: first.id,
						name: first.name,
						artistName: first.artistName,
						avg: first.avg,
						sum: 0,
						count: first.count,
						eliminated: false
					}
				}
			} else {
				// Normal round: load ALL participants (including those eliminated this round)
				const allParticipants = (await locals.pb.collection(USERS_COLLECTION).getFullList({
					filter: 'role = "participant"'
				})) as UsersResponse[]

				// Filter: not eliminated OR eliminated in this specific round
				const roundParticipants = allParticipants.filter(
					(p) => !p.eliminated || (p.eliminated && p.round === round)
				)
				const participantIds = new Set(roundParticipants.map((p) => p.id))

				const allRatings = (await locals.pb.collection(RATINGS_COLLECTION).getFullList({
					filter: `round = ${round}`,
					expand: 'author'
				})) as (RatingsResponse & { expand?: { author?: UsersResponse } })[]

				const grouped = new Map<string, { sum: number; count: number }>()
				for (const r of allRatings) {
					if (!participantIds.has(r.ratedUser)) continue
					const g = grouped.get(r.ratedUser) || { sum: 0, count: 0 }
					const rating = Number(r.rating) || 0
					const authorRole = r.expand?.author?.role
					const weight = authorRole === 'juror' ? 2 : 1
					g.sum += rating * weight
					g.count += weight
					grouped.set(r.ratedUser, g)
				}

				const rows: ResultRow[] = roundParticipants.map((p) => {
					const g = grouped.get(p.id) || { sum: 0, count: 0 }
					const avg = g.count > 0 ? g.sum / g.count : 0
					return {
						id: p.id,
						name: toName(p),
						artistName: p.artistName,
						avg,
						sum: g.sum,
						count: g.count,
						// Mark as eliminated if they were eliminated in THIS round
						eliminated: Boolean(p.eliminated) && p.round === round
					}
				})

				// Sort descending by average (highest = best)
				rows.sort(
					(a, b) => b.avg - a.avg || b.count - a.count || a.name?.localeCompare(b.name || '') || 0
				)

				// Get elimination count for this round
				const currentRound = Number(state?.round ?? 1) || 1
				let eliminateCount = 0
				if (currentRound >= 1 && currentRound < settings.totalRounds) {
					const pattern = parseEliminationPattern(settings.roundEliminationPattern)
					eliminateCount = Math.max(0, Number(pattern?.[currentRound - 1] ?? 0))
				}

				// Count how many have already been eliminated this round
				const alreadyEliminated = rows.filter((r) => r.eliminated).length

				// How many more need to be eliminated?
				remainingToEliminate = Math.max(0, eliminateCount - alreadyEliminated)

				const roundAvg = (avg: number) => Math.round(avg * 100) / 100

				// For tie check, only consider NON-eliminated participants
				const activeRows = rows.filter((r) => !r.eliminated)
				// Sort ascending for tie check (lowest = worst)
				const sortedAsc = activeRows.slice().sort((a, b) => a.avg - b.avg)

				// Check for tie only if there are still eliminations needed
				if (remainingToEliminate > 0 && remainingToEliminate < sortedAsc.length) {
					const lastToEliminate = sortedAsc[remainingToEliminate - 1]
					const firstToSurvive = sortedAsc[remainingToEliminate]
					if (roundAvg(lastToEliminate.avg) === roundAvg(firstToSurvive.avg)) {
						hasTie = true
						const tiedAvg = roundAvg(lastToEliminate.avg)
						// Mark only non-eliminated participants as tied
						tiedParticipantIds = activeRows
							.filter((r) => roundAvg(r.avg) === tiedAvg)
							.map((r) => r.id)
						for (const row of rows) {
							if (!row.eliminated && roundAvg(row.avg) === tiedAvg) {
								row.isTied = true
							}
						}
					}
				}

				results = rows
				winner = activeRows.sort((a, b) => b.avg - a.avg)[0] ?? null
			}
		} catch (error) {
			logger.warn('Failed to load results', { error })
		}
	}

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
					firstName: active.firstName,
					lastName: active.lastName,
					artistName: active.artistName,
					sangThisRound: !!active.sangThisRound
				}
			: null,
		activeSongChoice,
		results,
		winner,
		hasTie,
		remainingToEliminate,
		tiedParticipantIds,
		finalRankings,
		isProduction: process.env.NODE_ENV === 'production',
		remainingParticipantsCount
	})
}

type AdminAction =
	| 'start_competition'
	| 'activate_rating_phase'
	| 'next_participant'
	| 'activate_rating_refinement'
	| 'finalize_ratings'
	| 'publish_results'
	| 'eliminate_from_tie'
	| 'start_next_round'
	| 'reset_game'
	| 'reroll_participant'
	| 'toggle_break'

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user || locals.user.role !== 'admin') {
		return json({ error: 'forbidden' }, { status: 403 })
	}

	type Payload = { action?: AdminAction; eliminateId?: string }
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
			const currentState = await getLatestState(locals)
			if (currentState?.competitionStarted) {
				return json({ error: 'competition_already_started' }, { status: 400 })
			}

			const settings = await getCompetitionSettings(locals)
			const requiredSongs = calculateTotalSongs(settings.totalRounds, settings.numberOfFinalSongs)

			const participants = (await locals.pb.collection(USERS_COLLECTION).getFullList({
				filter: 'role = "participant" && eliminated != true'
			})) as UsersResponse[]

			if (participants.length === 0) {
				return json({ error: 'no_participants_available' }, { status: 400 })
			}

			const jurors = (await locals.pb.collection(USERS_COLLECTION).getFullList({
				filter: 'role = "juror"'
			})) as UsersResponse[]

			const missingParticipantCheckins = participants.filter((p) => !p.checkedIn)
			const missingJurorCheckins = jurors.filter((j) => !j.checkedIn)
			if (missingParticipantCheckins.length || missingJurorCheckins.length) {
				return json(
					{
						error: 'missing_checkins',
						missingParticipants: missingParticipantCheckins.map((p) => p.id),
						missingJurors: missingJurorCheckins.map((j) => j.id)
					},
					{ status: 400 }
				)
			}

			const allChoices = (await locals.pb
				.collection('song_choices')
				.getFullList()) as SongChoicesResponse[]
			const participantsMissingSongs = participants.filter((participant) => {
				const confirmedRounds = new Set<number>()
				for (const choice of allChoices) {
					if (choice.user !== participant.id) continue
					const roundNum = Number(choice.round) || 0
					if (
						roundNum >= 1 &&
						choice.confirmed &&
						(choice.artist?.trim() ?? '') &&
						(choice.songTitle?.trim() ?? '')
					) {
						confirmedRounds.add(roundNum)
					}
				}
				for (let round = 1; round <= requiredSongs; round++) {
					if (!confirmedRounds.has(round)) return true
				}
				return false
			})

			if (participantsMissingSongs.length > 0) {
				return json(
					{
						error: 'missing_song_choices',
						requiredSongs,
						missingParticipants: participantsMissingSongs.map((p) => p.id)
					},
					{ status: 400 }
				)
			}

			// Reset sangThisRound and set round to 1 for all participants
			try {
				await Promise.all(
					participants.map((p) =>
						locals.pb.collection(USERS_COLLECTION).update(p.id, { sangThisRound: false, round: 1 })
					)
				)
			} catch {
				logger.warn('Admin API: reset sangThisRound/round failed (continuing)', {})
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
					? {
							id: active.id,
							name: toName(active),
							firstName: active.firstName,
							lastName: active.lastName,
							artistName: active.artistName
						}
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
			try {
				await locals.pb.collection(USERS_COLLECTION).update(active.id, { sangThisRound: true })
			} catch (err) {
				const e = err as Error & { status?: number; message?: string }
				logger.error('failed to mark sangThisRound', {
					activeId: active.id,
					status: e?.status,
					message: e?.message
				})
				// If the record vanished or is inaccessible, clear the pointer to avoid stale state
				if (
					(e?.status === 404 || e?.status === 403) &&
					(await getLatestState(locals))?.activeParticipant
				) {
					await upsertState(locals, { activeParticipant: undefined })
					return json({ error: 'active_participant_not_updatable', id: active.id }, { status: 400 })
				}
				throw err
			}
			const updated = await upsertState(locals, { roundState: 'rating_phase' })
			logger.info('Admin API: activate_rating_phase', { activeParticipant: active.id })
			return json({
				ok: true,
				state: updated,
				activeParticipant: {
					id: active.id,
					name: toName(active),
					firstName: active.firstName,
					lastName: active.lastName,
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
				activeParticipant: {
					id: picked.id,
					name: toName(picked),
					firstName: picked.firstName,
					lastName: picked.lastName,
					artistName: picked.artistName
				}
			})
		}

		if (action === 'activate_rating_refinement') {
			const updated = await upsertState(locals, { roundState: 'rating_refinement' })
			logger.info('Admin API: activate_rating_refinement -> rating_refinement')
			const active = await getActiveParticipant(locals)
			return json({
				ok: true,
				state: updated,
				activeParticipant: active
					? {
							id: active.id,
							name: toName(active),
							firstName: active.firstName,
							lastName: active.lastName,
							artistName: active.artistName
						}
					: null
			})
		}

		if (action === 'finalize_ratings') {
			const state = await getLatestState(locals)
			const round = Number(state?.round ?? 1) || 1

			// Fetch active participants (non-eliminated)
			const participants = (await locals.pb.collection(USERS_COLLECTION).getFullList({
				filter: 'role = "participant" && eliminated != true'
			})) as UsersResponse[]
			const participantIds = new Set(participants.map((p) => p.id))

			// Fetch all ratings this round with author relation expanded
			const allRatings = (await locals.pb.collection(RATINGS_COLLECTION).getFullList({
				filter: `round = ${round}`,
				expand: 'author'
			})) as (RatingsResponse & { expand?: { author?: UsersResponse } })[]

			// Build user role map for weighting (juror = 2x weight)
			const grouped = new Map<string, { sum: number; count: number }>()
			for (const r of allRatings) {
				if (!participantIds.has(r.ratedUser)) continue
				const g = grouped.get(r.ratedUser) || { sum: 0, count: 0 }
				const rating = Number(r.rating) || 0
				const authorRole = r.expand?.author?.role
				// Juror votes count double
				const weight = authorRole === 'juror' ? 2 : 1
				g.sum += rating * weight
				g.count += weight
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
				isTied?: boolean
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

			// Get settings to determine elimination pattern
			const settings = await getCompetitionSettings(locals)

			let eliminateCount = 0
			if (round >= 1 && round < settings.totalRounds) {
				const pattern = parseEliminationPattern(settings.roundEliminationPattern)
				eliminateCount = Math.max(0, Number(pattern?.[round - 1] ?? 0))
			}
			// In finale round no elimination, show winner only
			if (round === settings.totalRounds) eliminateCount = 0
			// Ensure at least one participant remains
			eliminateCount = Math.min(eliminateCount, Math.max(rows.length - 1, 0))

			// Helper to round avg to 2 decimal places for comparison
			const roundAvg = (avg: number) => Math.round(avg * 100) / 100

			// Check for tie at elimination boundary
			let hasTie = false
			let tiedParticipantIds: string[] = []
			let tiedAvg: number | null = null
			if (eliminateCount > 0 && eliminateCount < rows.length) {
				// Last participant to be eliminated vs first to survive
				const lastEliminated = rows[eliminateCount - 1]
				const firstSurvivor = rows[eliminateCount]
				if (roundAvg(lastEliminated.avg) === roundAvg(firstSurvivor.avg)) {
					hasTie = true
					tiedAvg = roundAvg(lastEliminated.avg)
					// Find ALL participants with this tied average
					tiedParticipantIds = rows.filter((r) => roundAvg(r.avg) === tiedAvg).map((r) => r.id)
					// Mark them as tied
					for (const row of rows) {
						if (tiedParticipantIds.includes(row.id)) {
							row.isTied = true
						}
					}
				}
			}

			// Calculate how many still need to be eliminated from the tie
			let remainingToEliminate = 0
			if (hasTie && tiedAvg !== null) {
				// Eliminate all participants BELOW the tie boundary (they're definitely out)
				const belowTie = rows.filter((r) => roundAvg(r.avg) < tiedAvg!)
				if (belowTie.length > 0) {
					await Promise.all(
						belowTie.map((r) =>
							locals.pb.collection(USERS_COLLECTION).update(r.id, { eliminated: true })
						)
					)
					for (const r of belowTie) r.eliminated = true
				}
				// How many from the tie group still need to be eliminated?
				remainingToEliminate = eliminateCount - belowTie.length
			} else {
				// No tie - normal elimination
				const toEliminate = rows.slice(0, eliminateCount)
				if (toEliminate.length > 0) {
					await Promise.all(
						toEliminate.map((r) =>
							locals.pb.collection(USERS_COLLECTION).update(r.id, { eliminated: true })
						)
					)
					for (const r of toEliminate) r.eliminated = true
				}
			}

			// Set result_locked; finalize competition on finale round (only if no tie)
			const updated = await upsertState(locals, {
				roundState: 'result_locked',
				...(round === settings.totalRounds && !hasTie ? { competitionFinished: true } : {})
			})

			// Winner convenience
			const winner =
				rows
					.slice()
					.sort(
						(a, b) => b.avg - a.avg || b.count - a.count || a.name?.localeCompare(b.name || '') || 0
					)[0] ?? null

			// In finale, compute full rankings
			const isFinale = round === settings.totalRounds
			let finalRankings: FinalRanking[] | null = null
			if (isFinale) {
				finalRankings = await computeFinalRankings(locals, round)
			}

			logger.info('Admin API: finalize_ratings -> result_locked', {
				round,
				eliminateCount,
				participants: rows.length,
				hasTie,
				tiedParticipantIds,
				competitionFinished: round === settings.totalRounds && !hasTie
			})
			return json({
				ok: true,
				state: updated,
				results: rows,
				winner,
				hasTie,
				tiedParticipantIds,
				eliminateCount,
				remainingToEliminate,
				finalRankings
			})
		}

		if (action === 'publish_results') {
			const updated = await upsertState(locals, { roundState: 'publish_result' })
			logger.info('Admin API: publish_results -> publish_result')
			return json({ ok: true, state: updated })
		}

		if (action === 'eliminate_from_tie') {
			const eliminateId = payload.eliminateId

			if (!eliminateId) {
				return json({ error: 'missing_eliminate_id' }, { status: 400 })
			}

			const state = await getLatestState(locals)
			const round = Number(state?.round ?? 1) || 1
			const settings = await getCompetitionSettings(locals)

			// Eliminate the participant immediately in DB
			try {
				await locals.pb.collection(USERS_COLLECTION).update(eliminateId, { eliminated: true })
			} catch (err) {
				const pbErr = err as { status?: number; message?: string; data?: unknown }
				logger.error('Failed to eliminate participant from tie', {
					eliminateId,
					status: pbErr.status,
					message: pbErr.message,
					data: pbErr.data
				})
				return json(
					{ error: 'elimination_failed', details: pbErr.message || String(err) },
					{ status: 500 }
				)
			}

			// Re-fetch ALL participants (including those eliminated this round)
			const allParticipants = (await locals.pb.collection(USERS_COLLECTION).getFullList({
				filter: 'role = "participant"'
			})) as UsersResponse[]

			// Filter: not eliminated OR eliminated in this specific round
			const roundParticipants = allParticipants.filter(
				(p) => !p.eliminated || (p.eliminated && p.round === round)
			)
			const participantIds = new Set(roundParticipants.map((p) => p.id))

			// Fetch all ratings this round with author relation expanded
			const allRatings = (await locals.pb.collection(RATINGS_COLLECTION).getFullList({
				filter: `round = ${round}`,
				expand: 'author'
			})) as (RatingsResponse & { expand?: { author?: UsersResponse } })[]

			// Calculate averages for all round participants
			const grouped = new Map<string, { sum: number; count: number }>()
			for (const r of allRatings) {
				if (!participantIds.has(r.ratedUser)) continue
				const g = grouped.get(r.ratedUser) || { sum: 0, count: 0 }
				const rating = Number(r.rating) || 0
				const authorRole = r.expand?.author?.role
				const weight = authorRole === 'juror' ? 2 : 1
				g.sum += rating * weight
				g.count += weight
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
				isTied?: boolean
			}
			const rows: Row[] = roundParticipants.map((p) => {
				const g = grouped.get(p.id) || { sum: 0, count: 0 }
				const avg = g.count > 0 ? g.sum / g.count : 0
				return {
					id: p.id,
					name: toName(p),
					artistName: p.artistName,
					avg,
					sum: g.sum,
					count: g.count,
					// Mark as eliminated if they were eliminated in THIS round
					eliminated: Boolean(p.eliminated) && p.round === round
				}
			})

			// Sort descending by average (highest = best) for display
			rows.sort(
				(a, b) => b.avg - a.avg || b.count - a.count || a.name?.localeCompare(b.name || '') || 0
			)

			// Get original elimination count for this round
			let eliminateCount = 0
			if (round >= 1 && round < settings.totalRounds) {
				const pattern = parseEliminationPattern(settings.roundEliminationPattern)
				eliminateCount = Math.max(0, Number(pattern?.[round - 1] ?? 0))
			}

			// Count how many have already been eliminated this round
			const alreadyEliminated = rows.filter((r) => r.eliminated).length

			// How many more need to be eliminated?
			const remainingToEliminate = Math.max(0, eliminateCount - alreadyEliminated)

			// Round avg helper
			const roundAvg = (avg: number) => Math.round(avg * 100) / 100

			// For tie check, only consider NON-eliminated participants
			const activeRows = rows.filter((r) => !r.eliminated)
			// Sort ascending for tie check (lowest = worst)
			const sortedAsc = activeRows.slice().sort((a, b) => a.avg - b.avg)

			// Check if there's still a tie (only if more eliminations needed)
			let hasTie = false
			let tiedParticipantIds: string[] = []
			if (remainingToEliminate > 0 && remainingToEliminate < sortedAsc.length) {
				// Check if there's a tie at the elimination boundary
				const lastToEliminate = sortedAsc[remainingToEliminate - 1]
				const firstToSurvive = sortedAsc[remainingToEliminate]
				if (roundAvg(lastToEliminate.avg) === roundAvg(firstToSurvive.avg)) {
					hasTie = true
					const tiedAvg = roundAvg(lastToEliminate.avg)
					// Mark only non-eliminated participants as tied
					tiedParticipantIds = activeRows
						.filter((r) => roundAvg(r.avg) === tiedAvg)
						.map((r) => r.id)
					for (const row of rows) {
						if (!row.eliminated && roundAvg(row.avg) === tiedAvg) {
							row.isTied = true
						}
					}
				}
			}

			// Winner convenience (best non-eliminated)
			const winner = activeRows.sort((a, b) => b.avg - a.avg)[0] ?? null

			logger.info('Admin API: eliminate_from_tie', {
				round,
				eliminateId,
				alreadyEliminated,
				remainingToEliminate,
				hasTie
			})

			return json({
				ok: true,
				results: rows,
				winner,
				hasTie,
				tiedParticipantIds,
				eliminateCount,
				remainingToEliminate
			})
		}

		if (action === 'start_next_round') {
			const state = await getLatestState(locals)
			const settings = await getCompetitionSettings(locals)
			const currentRound = Number(state?.round ?? 1) || 1
			if (currentRound >= settings.totalRounds) {
				return json({ error: 'no_next_round' }, { status: 400 })
			}
			const nextRound = currentRound + 1
			// Reset sangThisRound for all participants and update round for non-eliminated
			try {
				const participants = (await locals.pb.collection(USERS_COLLECTION).getFullList({
					filter: 'role = "participant"'
				})) as UsersResponse[]
				await Promise.all(
					participants.map((p) =>
						locals.pb.collection(USERS_COLLECTION).update(p.id, {
							sangThisRound: false,
							// Only update round for non-eliminated participants
							...(p.eliminated !== true ? { round: nextRound } : {})
						})
					)
				)
			} catch {
				logger.warn('Admin API: reset sangThisRound/round for next round failed (continuing)')
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
					? {
							id: picked.id,
							name: toName(picked),
							firstName: picked.firstName,
							lastName: picked.lastName,
							artistName: picked.artistName
						}
					: null
			})
		}

		if (action === 'reroll_participant') {
			const state = await getLatestState(locals)
			if (!state?.competitionStarted || state?.roundState !== 'singing_phase') {
				return json({ error: 'reroll_not_allowed' }, { status: 400 })
			}
			const picked = await pickRandomEligibleParticipant(locals)
			if (!picked) {
				return json({ error: 'no_participants_available' }, { status: 400 })
			}
			const updated = await upsertState(locals, { activeParticipant: picked.id })
			logger.info('Admin API: reroll_participant', { activeParticipant: picked.id })
			return json({
				ok: true,
				state: updated,
				activeParticipant: {
					id: picked.id,
					name: toName(picked),
					firstName: picked.firstName,
					lastName: picked.lastName,
					artistName: picked.artistName
				}
			})
		}

		if (action === 'toggle_break') {
			const state = await getLatestState(locals)
			const updated = await upsertState(locals, { break: !state?.break })
			logger.info('Admin API: toggle_break', { break: updated.break })
			return json({ ok: true, state: updated })
		}

		if (action === 'reset_game') {
			// Block reset in production
			if (process.env.NODE_ENV === 'production') {
				logger.warn('Admin API: reset_game blocked in production')
				return json({ error: 'reset_blocked_in_production' }, { status: 403 })
			}

			// Reset all participants
			try {
				const participants = (await locals.pb.collection(USERS_COLLECTION).getFullList({
					filter: 'role = "participant"'
				})) as UsersResponse[]
				await Promise.all(
					participants.map((p) =>
						locals.pb
							.collection(USERS_COLLECTION)
							.update(p.id, { eliminated: false, sangThisRound: false, round: 1 })
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

			// Reset competition state to initial defaults
			const current = await getLatestState(locals)
			let updated: CompetitionStateResponse
			if (current) {
				const patch: Partial<CompetitionStateRecord> & { activeParticipant?: string | null } = {
					competitionStarted: false,
					round: 1,
					roundState: 'singing_phase',
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
					roundState: 'singing_phase',
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
