import type { PageServerLoad } from './$types'
import type { CompetitionStateResponse, UsersResponse } from '$lib/pocketbase-types'

type AdminResponse = {
	state: CompetitionStateResponse | null
	activeParticipant: UsersResponse | null
	activeSongChoice: { artist: string; songTitle: string; appleMusicSongId?: string } | null
	isProduction: boolean
}

export const load = (async ({ fetch }) => {
	const res = await fetch('/admin/api')
	if (!res.ok) {
		throw new Error('Failed to fetch admin state')
	}
	const data: AdminResponse = await res.json()
	return {
		competitionState: data.state,
		activeUser: data.activeParticipant,
		activeSongChoice: data.activeSongChoice,
		isTestEnv: process.env.NODE_ENV === 'test',
		isProduction: data.isProduction
	}
}) satisfies PageServerLoad
