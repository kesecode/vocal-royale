import type { PageServerLoad } from './$types'
import type {
	UsersResponse,
	CompetitionStateResponse,
	RatingsResponse,
	SettingsResponse,
	UiContentResponse
} from '$lib/pocketbase-types'
import { logger } from '$lib/server/logger'

export const load: PageServerLoad = async ({ locals }) => {
	let healthy = false
	try {
		await locals.pb.health.check()
		healthy = true
	} catch {
		healthy = false
	}

	let users: UsersResponse[] = []
	try {
		users = (await locals.pb.collection('users').getFullList()) as UsersResponse[]
	} catch {
		// PocketBase not reachable or forbidden – keep empty and render gracefully
	}
	const mkName = (u: UsersResponse) => u.firstName || u.name || u.username || u.email || u.id

	const participants = users
		.filter((u) => u.role === 'participant')
		.map((u) => ({
			id: u.id,
			name: mkName(u),
			artistName: u.artistName,
			eliminated: Boolean(u.eliminated ?? false)
		}))
		.sort((a, b) => a.name.localeCompare(b.name, 'de'))
	const spectators = users
		.filter((u) => u.role === 'spectator')
		.map((u) => ({ id: u.id, name: mkName(u) }))
		.sort((a, b) => a.name.localeCompare(b.name, 'de'))
	const jurors = users
		.filter((u) => u.role === 'juror')
		.map((u) => ({ id: u.id, name: mkName(u) }))
		.sort((a, b) => a.name.localeCompare(b.name, 'de'))

	// Load role selection settings
	let maxParticipants = 10 // default fallback
	let maxJurors = 3 // default fallback
	try {
		const settings = (await locals.pb.collection('settings').getFullList()) as SettingsResponse[]

		if (settings[0].maxParticipantCount) {
			maxParticipants = settings[0].maxParticipantCount
		}
		if (settings[0].maxJurorCount) {
			maxJurors = settings[0].maxJurorCount
		}
	} catch {
		logger.warn('Could not load settings, using default role limits')
	}

	// Check if competition finished and compute winner (only in publish_result)
	let competitionFinished = false as boolean
	let roundState = '' as string
	let winner: {
		id: string
		name: string | null
		artistName?: string
		avg: number
		sum: number
		count: number
	} | null = null
	try {
		const list = (await locals.pb.collection('competition_state').getList(1, 1, {
			sort: '-updated'
		})) as import('pocketbase').ListResult<CompetitionStateResponse>
		const rec = list.items[0]
		if (rec) {
			competitionFinished = Boolean(rec.competitionFinished ?? false)
			roundState = rec.roundState || ''
			// Only compute winner if roundState is publish_result
			if (competitionFinished && roundState === 'publish_result') {
				// Get all participants (including eliminated - we need finalist with best avg)
				const allParticipants = users.filter((u) => u.role === 'participant')
				// Load ALL ratings across ALL rounds with author expanded for juror weighting
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

				const finalRound = Number(rec.round) || 1
				const rows = allParticipants.map((p) => {
					const g = totalRatingsByUser.get(p.id) || { sum: 0, count: 0 }
					const avg = g.count > 0 ? g.sum / g.count : 0
					const name = p.firstName || p.name || p.username || p.email || p.id
					const lastRoundWithRatings = lastRoundByUser.get(p.id) || finalRound
					const isFinalist = !p.eliminated || lastRoundWithRatings === finalRound
					const eliminatedInRound =
						p.eliminatedInRound ?? (isFinalist ? null : lastRoundWithRatings)
					return {
						id: p.id,
						name,
						artistName: p.artistName,
						avg,
						sum: g.sum,
						count: g.count,
						eliminatedInRound
					}
				})

				// Sort: Primary by reached round (finalists first), Secondary by avg
				winner =
					rows.slice().sort((a, b) => {
						const roundA = a.eliminatedInRound ?? finalRound + 1
						const roundB = b.eliminatedInRound ?? finalRound + 1
						if (roundB !== roundA) return roundB - roundA
						if (b.avg !== a.avg) return b.avg - a.avg
						if (b.count !== a.count) return b.count - a.count
						return a.name?.localeCompare(b.name || '') || 0
					})[0] ?? null
			}
		}
	} catch {
		// ignore and keep defaults
	}

	// Load UI content for home page
	let uiContent: Record<string, string> = {}
	try {
		const contentItems = (await locals.pb.collection('ui_content').getFullList({
			filter: 'category = "home" && is_active = true'
		})) as UiContentResponse[]

		uiContent = contentItems.reduce(
			(acc, item) => {
				acc[item.key] = item.value
				return acc
			},
			{} as Record<string, string>
		)
	} catch {
		logger.warn('Could not load UI content, using default texts')
		// Fallback to hardcoded texts
		uiContent = {
			'home.greeting': 'Ai Gude {displayName}, wie!?',
			'home.subtitle': 'Schön, dass du da bist!'
		}
	}

	const isTestEnv = process.env.NODE_ENV === 'test'

	return {
		user: locals.user,
		pb_healthy: healthy,
		uiContent,
		participants,
		spectators,
		jurors,
		competitionFinished,
		roundState,
		winner,
		// Role selection data
		maxParticipants,
		maxJurors,
		currentParticipants: participants.length,
		currentJurors: jurors.length,
		// Email verification check - must verify email first before selecting role (except for admins); skip in test env
		needsEmailVerification: !isTestEnv && !locals.user?.verified && locals.user?.role !== 'admin',
		userEmail: locals.user?.email || '',
		// User needs to select role if they have default role AND verified email
		needsRoleSelection: locals.user?.role === 'default' && (isTestEnv || locals.user?.verified)
	}
}
