import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import type { UserRole, SettingsResponse } from '$lib/pocketbase-types'

export const POST: RequestHandler = async ({ locals, request }) => {
	// Check if user is authenticated
	if (!locals.user) {
		return json({ error: 'Nicht authentifiziert' }, { status: 401 })
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
			// Load settings
			let maxParticipants = 8 // default fallback
			let maxJurors = 5 // default fallback

			try {
				const settings = await locals.pb.collection('settings').getFullList()
				const maxParticipantSetting = settings.find(
					(s: SettingsResponse) => s.key === 'maxParticipantCount'
				)
				const maxJurorSetting = settings.find((s: SettingsResponse) => s.key === 'maxJurorCount')

				if (maxParticipantSetting && typeof maxParticipantSetting.value === 'number') {
					maxParticipants = maxParticipantSetting.value
				}
				if (maxJurorSetting && typeof maxJurorSetting.value === 'number') {
					maxJurors = maxJurorSetting.value
				}
			} catch {
				// Use defaults if settings collection doesn't exist yet
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
