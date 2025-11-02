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

	// Check if competition finished and compute winner
	let competitionFinished = false as boolean
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
			if (competitionFinished) {
				const round = Number(rec.round) || 1
				const activeParticipants = users.filter(
					(u) => u.role === 'participant' && !(u.eliminated ?? false)
				)
				const ids = new Set(activeParticipants.map((p) => p.id))
				const ratings = (await locals.pb
					.collection('ratings')
					.getFullList({ filter: `round = ${round}` })) as RatingsResponse[]
				const grouped = new Map<string, { sum: number; count: number }>()
				for (const r of ratings) {
					if (!ids.has(r.ratedUser)) continue
					const g = grouped.get(r.ratedUser) || { sum: 0, count: 0 }
					g.sum += Number(r.rating) || 0
					g.count += 1
					grouped.set(r.ratedUser, g)
				}
				const rows = activeParticipants.map((p) => {
					const g = grouped.get(p.id) || { sum: 0, count: 0 }
					const avg = g.count > 0 ? g.sum / g.count : 0
					const name = p.firstName || p.name || p.username || p.email || p.id
					return { id: p.id, name, artistName: p.artistName, avg, sum: g.sum, count: g.count }
				})
				winner =
					rows
						.slice()
						.sort(
							(a, b) =>
								b.avg - a.avg || b.count - a.count || a.name?.localeCompare(b.name || '') || 0
						)[0] ?? null
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
			'home.greeting': 'Ai Gude {displayName} wie!?',
			'home.subtitle': 'Der Bre wird 30, singt für mich!',
			'home.welcome_message': 'Hallo {displayName}!',
			'home.welcome_subtext': 'Schön, dass du da bist.'
		}
	}

	return {
		user: locals.user,
		pb_healthy: healthy,
		uiContent,
		participants,
		spectators,
		jurors,
		competitionFinished,
		winner,
		// Role selection data
		maxParticipants,
		maxJurors,
		currentParticipants: participants.length,
		currentJurors: jurors.length,
		// Email verification check - must verify email first before selecting role
		needsEmailVerification: !locals.user?.verified,
		userEmail: locals.user?.email || '',
		// User needs to select role if they have verified email AND default role
		needsRoleSelection: locals.user?.verified && locals.user?.role === 'default'
	}
}
