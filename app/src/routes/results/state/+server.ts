import type { RequestHandler } from './$types'
import { json } from '@sveltejs/kit'
import { logger } from '$lib/server/logger'
import type {
	CompetitionStateResponse,
	RatingsResponse,
	UsersResponse,
	SongChoicesResponse,
	SettingsResponse
} from '$lib/pocketbase-types'
import { parseSettings, DEFAULT_SETTINGS, getMaxRound } from '$lib/utils/competition-settings'

const COLLECTION = 'competition_state' as const
const SETTINGS_COLLECTION = 'settings' as const

type ActiveParticipantInfo = {
	id: string
	name: string
	firstName?: string
	artistName?: string
}

type SongChoice = {
	artist: string
	songTitle: string
	appleMusicSongId?: string
}

type FinalRanking = {
	rank: number
	id: string
	name: string | null
	artistName?: string
	eliminatedInRound: number | null
	avg: number
	count: number
}

function toName(u: UsersResponse): string {
	return u.firstName || u.name || u.username || u.email || u.id
}

async function computeFinalRankings(
	locals: App.Locals,
	finalRound: number
): Promise<FinalRanking[]> {
	const allParticipants = (await locals.pb.collection('users').getFullList({
		filter: 'role = "participant"'
	})) as UsersResponse[]

	const allRatings = (await locals.pb.collection('ratings').getFullList({
		expand: 'author'
	})) as (RatingsResponse & { expand?: { author?: UsersResponse } })[]

	// Sum ALL ratings per user (across all rounds) for total score
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

	const rankings: FinalRanking[] = allParticipants.map((p) => {
		// Use ALL ratings across all rounds
		const g = totalRatingsByUser.get(p.id) || { sum: 0, count: 0 }
		const avg = g.count > 0 ? g.sum / g.count : 0

		// Determine eliminatedInRound from p.round (which stores elimination round when eliminated)
		const lastRoundWithRatings = lastRoundByUser.get(p.id) || finalRound
		const eliminatedInRound = p.eliminated ? (p.round ?? lastRoundWithRatings) : null

		return {
			rank: 0,
			id: p.id,
			name: toName(p),
			artistName: p.artistName,
			eliminatedInRound,
			avg,
			count: g.count
		}
	})

	rankings.sort((a, b) => {
		const roundA = a.eliminatedInRound ?? finalRound + 1
		const roundB = b.eliminatedInRound ?? finalRound + 1
		if (roundB !== roundA) {
			return roundB - roundA
		}
		if (b.avg !== a.avg) {
			return b.avg - a.avg
		}
		if (b.count !== a.count) {
			return b.count - a.count
		}
		return a.name?.localeCompare(b.name || '') || 0
	})

	rankings.forEach((r, i) => {
		r.rank = i + 1
	})

	return rankings
}

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) {
		return json({ error: 'not_authenticated' }, { status: 401 })
	}

	try {
		// Load settings to determine finale round
		let totalRounds = DEFAULT_SETTINGS.totalRounds
		let numberOfFinalSongs = DEFAULT_SETTINGS.numberOfFinalSongs
		try {
			const settingsList = (await locals.pb
				.collection(SETTINGS_COLLECTION)
				.getList(1, 1)) as import('pocketbase').ListResult<SettingsResponse>
			if (settingsList.items[0]) {
				const parsed = parseSettings(settingsList.items[0])
				totalRounds = parsed?.totalRounds ?? DEFAULT_SETTINGS.totalRounds
				numberOfFinalSongs = parsed?.numberOfFinalSongs ?? DEFAULT_SETTINGS.numberOfFinalSongs
			}
		} catch {
			// Use defaults
		}
		const maxRound = getMaxRound(totalRounds, numberOfFinalSongs)

		const list = (await locals.pb
			.collection(COLLECTION)
			.getList(1, 1)) as import('pocketbase').ListResult<CompetitionStateResponse>
		const rec = list.items[0]
		if (!rec) {
			logger.warn('CompetitionState not found, returning defaults')
			return json({
				competitionStarted: false,
				roundState: 'result_locked',
				round: 1,
				competitionFinished: false,
				break: false,
				activeParticipant: null,
				totalRounds
			})
		}

		// Support historical round query parameter for post-competition viewing
		const queryRound = url.searchParams.get('round')
		const currentRound = Number(rec.round) || 1
		const finished = Boolean(rec.competitionFinished ?? false)

		// Use query round if provided and competition is finished, otherwise use current round
		const round = queryRound && finished ? Number(queryRound) : currentRound
		const isFinale = round >= totalRounds
		const isHistoricalQuery = queryRound && finished && Number(queryRound) !== currentRound

		type ResultRow = {
			id: string
			name: string | null
			artistName?: string
			avg: number
			count: number
			eliminated?: boolean
		}
		let winner: ResultRow | null = null
		let results: ResultRow[] = []
		let finalRankings: FinalRanking[] | null = null

		// Show results in publish_result, when querying historical rounds, or when competition is finished
		const showResults = rec.roundState === 'publish_result' || isHistoricalQuery || finished
		if (showResults) {
			try {
				if (isFinale) {
					finalRankings = await computeFinalRankings(locals, totalRounds)
					winner = finalRankings[0] ?? null
				} else {
					// Normal round: show results including who was eliminated
					// Load ALL ratings this round with author expanded
					const allRatings = (await locals.pb.collection('ratings').getFullList({
						filter: `round = ${round}`,
						expand: 'author'
					})) as (RatingsResponse & { expand?: { author?: UsersResponse } })[]

					// Get unique user IDs that have ratings this round
					const ratedUserIds = new Set(allRatings.map((r) => r.ratedUser))

					// Load all participants (including eliminated) to check their status
					const allParticipants = (await locals.pb.collection('users').getFullList({
						filter: 'role = "participant"'
					})) as UsersResponse[]

					// Filter to only those who have ratings this round
					const participantsThisRound = allParticipants.filter((p) => ratedUserIds.has(p.id))

					const grouped = new Map<string, { sum: number; count: number }>()
					for (const r of allRatings) {
						const g = grouped.get(r.ratedUser) || { sum: 0, count: 0 }
						const rating = Number(r.rating) || 0
						const authorRole = r.expand?.author?.role
						const weight = authorRole === 'juror' ? 2 : 1
						g.sum += rating * weight
						g.count += weight
						grouped.set(r.ratedUser, g)
					}
					results = participantsThisRound.map((p) => {
						const g = grouped.get(p.id) || { sum: 0, count: 0 }
						const avg = g.count > 0 ? g.sum / g.count : 0
						const name = p.firstName || p.name || p.username || p.email || p.id
						// Mark as eliminated if they were eliminated in this round
						const eliminated = p.eliminated === true && p.round === round
						return { id: p.id, name, artistName: p.artistName, avg, count: g.count, eliminated }
					})
					results.sort(
						(a, b) => b.avg - a.avg || b.count - a.count || a.name?.localeCompare(b.name || '') || 0
					)
					winner = results[0] ?? null
				}
			} catch (err) {
				logger.warn('Failed computing results', { error: (err as Error)?.message })
			}
		}

		// Fetch active participant info and song choice
		let activeParticipantInfo: ActiveParticipantInfo | null = null
		let activeSongChoice: SongChoice | null = null

		if (rec.activeParticipant) {
			try {
				const user = (await locals.pb
					.collection('users')
					.getOne(rec.activeParticipant)) as UsersResponse
				activeParticipantInfo = {
					id: user.id,
					name: user.firstName || user.name || user.username || user.email || user.id,
					firstName: user.firstName,
					artistName: user.artistName
				}

				const songChoices = (await locals.pb.collection('song_choices').getFullList({
					filter: `user = "${rec.activeParticipant}" && round = ${round}`
				})) as SongChoicesResponse[]
				if (songChoices.length > 0) {
					const sc = songChoices[0]
					activeSongChoice = {
						artist: sc.artist || '',
						songTitle: sc.songTitle || '',
						appleMusicSongId: sc.appleMusicSongId
					}
				}
			} catch (err) {
				logger.warn('Failed to fetch active participant info', {
					error: (err as Error)?.message
				})
			}
		}

		logger.info('Results state GET', {
			round: rec.round,
			state: rec.roundState,
			started: rec.competitionStarted,
			finished,
			isFinale
		})
		return json({
			competitionStarted: !!rec.competitionStarted,
			roundState: rec.roundState,
			round,
			competitionFinished: finished,
			break: rec.break ?? false,
			activeParticipant: rec.activeParticipant,
			activeParticipantInfo,
			activeSongChoice,
			winner,
			results,
			totalRounds,
			maxRound,
			numberOfFinalSongs,
			isFinale,
			finalRankings
		})
	} catch (e: unknown) {
		const err = e as Error & { status?: number; url?: string; data?: unknown; message?: string }
		if (err?.status === 404) {
			logger.info('CompetitionState collection missing, returning defaults')
			return json({
				competitionStarted: false,
				roundState: 'result_locked',
				round: 1,
				competitionFinished: false,
				break: false,
				activeParticipant: null
			})
		}
		logger.error('Results state GET failed', {
			status: err?.status,
			message: err?.message,
			url: err?.url,
			data: err?.data
		})
		return json({ error: 'fetch_failed' }, { status: 500 })
	}
}
