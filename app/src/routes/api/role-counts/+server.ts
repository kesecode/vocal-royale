import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import type { SettingsResponse, UsersResponse } from '$lib/pocketbase-types'
import { logger } from '$lib/server/logger'

export const GET: RequestHandler = async ({ locals }) => {
	// Check if user is authenticated
	if (!locals.user) {
		return json({ error: 'Nicht authentifiziert' }, { status: 401 })
	}

	try {
		// Load role selection settings
		let maxParticipants = 10 // default fallback
		let maxJurors = 3 // default fallback
		try {
			const settings = (await locals.pb.collection('settings').getFullList()) as SettingsResponse[]
			if (settings[0]?.maxParticipantCount) {
				maxParticipants = settings[0].maxParticipantCount
			}
			if (settings[0]?.maxJurorCount) {
				maxJurors = settings[0].maxJurorCount
			}
		} catch {
			logger.warn('Could not load settings, using default role limits')
		}

		// Count current users by role
		const users = (await locals.pb.collection('users').getFullList()) as UsersResponse[]
		const currentParticipants = users.filter((u) => u.role === 'participant').length
		const currentJurors = users.filter((u) => u.role === 'juror').length

		return json({
			maxParticipants,
			maxJurors,
			currentParticipants,
			currentJurors
		})
	} catch (error) {
		logger.warn('Error loading role counts', { userId: locals.user.id, error })
		return json({ error: 'Fehler beim Laden der Rollenzahlen' }, { status: 500 })
	}
}
