import type { PageServerLoad } from './$types'
import type {
	UsersResponse,
	CompetitionStateResponse,
	RatingsResponse
} from '$lib/pocketbase-types'

export const load: PageServerLoad = async ({ locals }) => {
	let healthy = false
	try {
		await locals.pb.health.check()
		healthy = true
	} catch {
		healthy = false
	}

	const users = (await locals.pb.collection('users').getFullList()) as UsersResponse[]
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
		const list = (await locals.pb
			.collection('competition_state')
			.getList(1, 1, {
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

	return {
		user: locals.user,
		pb_healthy: healthy,
		participants,
		spectators,
		jurors,
		competitionFinished,
		winner
	}
}
