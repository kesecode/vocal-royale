import type { CompetitionStateResponse } from '$lib/pocketbase-types'
import { logger } from '$lib/server/logger'

type PocketBaseClient = App.Locals['pb']

export async function getLatestCompetitionState(
	pb: PocketBaseClient
): Promise<CompetitionStateResponse | null> {
	try {
		const list = await pb.collection('competition_state').getList(1, 1, { sort: '-updated' })
		return (list.items?.[0] as CompetitionStateResponse | undefined) ?? null
	} catch (error) {
		const err = error as Error & { status?: number }
		if (err?.status === 404) return null
		logger.error('Failed to load competition_state', { message: err?.message })
		throw err
	}
}

export function isCompetitionStarted(state: CompetitionStateResponse | null | undefined): boolean {
	return Boolean(state?.competitionStarted)
}

export function isBetweenRounds(state: CompetitionStateResponse | null | undefined): boolean {
	if (!state?.competitionStarted) return true
	return state.roundState === 'break' || state.roundState === 'result_locked'
}
