import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import type { UserRole, SettingsResponse } from '$lib/pocketbase-types'
import { logger } from '$lib/server/logger'

export const POST: RequestHandler = async ({ locals, request }) => {
	// Check if user is authenticated
	if (!locals.user) {
		return json({ error: 'Nicht authentifiziert' }, { status: 401 })
	}

	// Check if user has verified their email
	if (!locals.user.verified) {
		return json({ error: 'Email-Adresse muss zuerst bestätigt werden' }, { status: 403 })
	}

	// Check if user already has a non-default role
	if (locals.user.role && locals.user.role !== 'default') {
		return json({ error: 'Rolle bereits vergeben' }, { status: 400 })
	}

	let body
	try {
		body = await request.json()
	} catch {
		return json({ error: 'Ungültiger Request Body' }, { status: 400 })
	}

	const { role } = body as { role?: string }

	// Security: Ensure admin role cannot be assigned via API
	if (role === 'admin') {
		return json({ error: 'Admin Rolle kann nicht über die App vergeben werden' }, { status: 403 })
	}

	// Validate role
	if (!role || !['participant', 'spectator', 'juror'].includes(role)) {
		return json({ error: 'Ungültige Rolle' }, { status: 400 })
	}

	try {
		// Check role limits for participant and juror
		if (role === 'participant' || role === 'juror') {
			// Load role selection settings
			let maxParticipants = 10 // default fallback
			let maxJurors = 3 // default fallback
			try {
				const settings = (await locals.pb
					.collection('settings')
					.getFullList()) as SettingsResponse[]

				if (settings[0].maxParticipantCount) {
					maxParticipants = settings[0].maxParticipantCount
				}
				if (settings[0].maxJurorCount) {
					maxJurors = settings[0].maxJurorCount
				}
			} catch {
				logger.warn('Could not load settings, using default role limits')
			}

			// Count current users with this role
			const users = await locals.pb.collection('users').getFullList()
			const currentCount = users.filter((u: { role?: string }) => u.role === role).length

			if (role === 'participant' && currentCount >= maxParticipants) {
				return json({ error: 'Maximale Anzahl Teilnehmer erreicht' }, { status: 400 })
			}

			if (role === 'juror' && currentCount >= maxJurors) {
				return json({ error: 'Maximale Anzahl Juroren erreicht' }, { status: 400 })
			}
		}

		// Update user role
		await locals.pb.collection('users').update(locals.user.id, {
			role: role as UserRole
		})

		// Update the auth store to reflect the new role immediately
		if (locals.pb.authStore.record) {
			locals.pb.authStore.record.role = role
		}

		return json({ success: true, role })
	} catch (error) {
		// Only log in production, not during tests
		if (process.env.NODE_ENV !== 'test') {
			console.error('Error updating user role:', error)
		}
		return json({ error: 'Fehler beim Speichern der Rolle' }, { status: 500 })
	}
}
