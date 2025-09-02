import { fail, redirect } from '@sveltejs/kit'
import { logger } from '$lib/server/logger'
import type { Actions, PageServerLoad } from './$types'
import type { SettingsResponse, UsersResponse, UserRole } from '$lib/pocketbase-types'

export const load: PageServerLoad = async ({ locals }) => {
	// Layout guard already enforces auth; just return the user.
	if (!locals.user) {
		return { user: locals.user }
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

		return {
			user: locals.user,
			maxParticipants,
			maxJurors,
			currentParticipants,
			currentJurors
		}
	} catch (error) {
		logger.warn('Error loading profile data', { userId: locals.user.id, error })
		return { user: locals.user }
	}
}

export const actions: Actions = {
	changePassword: async ({ request, locals }) => {
		if (!locals.user) {
			throw redirect(303, '/auth')
		}
		const form = await request.formData()
		const oldPassword = String(form.get('oldPassword') || '')
		const password = String(form.get('password') || '')
		const passwordConfirm = String(form.get('passwordConfirm') || '')
		if (!password || !passwordConfirm) {
			return fail(400, { message: 'Bitte beide Passwörter eingeben.', variant: 'error' })
		}
		if (password !== passwordConfirm) {
			return fail(400, { message: 'Passwörter stimmen nicht überein.', variant: 'error' })
		}
		try {
			await locals.pb
				.collection('users')
				.update(locals.user.id, { oldPassword, password, passwordConfirm })

			// Re-authenticate to prevent the auth token from becoming invalid after password change
			// Assumes `locals.user.email` is available; if your identifier is `username`, swap accordingly.
			await locals.pb.collection('users').authWithPassword(locals.user.email, password)

			logger.info('Password changed', { userId: locals.user.id })
			return { message: 'Passwort erfolgreich aktualisiert.', variant: 'success' }
		} catch {
			logger.warn('Password change failed', { userId: locals.user.id })
			return fail(400, { message: 'Aktualisierung fehlgeschlagen.', variant: 'error' })
		}
	},

	changeArtist: async ({ request, locals }) => {
		if (!locals.user) {
			throw redirect(303, '/auth')
		}
		const form = await request.formData()
		const artistName = String(form.get('artistName') || '').trim()
		if (!artistName) {
			return fail(400, { message: 'Bitte einen Künstlernamen eingeben.', variant: 'error' })
		}
		try {
			await locals.pb.collection('users').update(locals.user.id, { artistName })
			logger.info('Artist name updated', { userId: locals.user.id, artistName })
			return { message: 'Künstlername gespeichert.', variant: 'success' }
		} catch {
			logger.warn('Artist name update failed', { userId: locals.user.id })
			return fail(400, { message: 'Aktualisierung fehlgeschlagen.', variant: 'error' })
		}
	},
	logout: async ({ locals }) => {
		logger.info('Logout', { userId: locals.user?.id ?? null })
		locals.pb.authStore.clear()
		throw redirect(303, '/auth')
	},

	deleteAccount: async ({ locals }) => {
		if (!locals.user) {
			throw redirect(303, '/auth')
		}
		const userId = locals.user.id
		try {
			await locals.pb.collection('users').delete(userId)
		} catch {
			logger.warn('Account deletion failed', { userId })
			return fail(400, { message: 'Löschen fehlgeschlagen.', variant: 'error' })
		}

		logger.info('Account deleted', { userId })
		locals.pb.authStore.clear()
		throw redirect(303, '/auth?reason=account_deleted')
	},

	changeRole: async ({ request, locals }) => {
		if (!locals.user) {
			throw redirect(303, '/auth')
		}

		const form = await request.formData()
		const role = String(form.get('role') || '').trim() as UserRole

		// Validate role
		if (!role || !['participant', 'spectator', 'juror'].includes(role)) {
			return fail(400, { message: 'Ungültige Rolle ausgewählt.', variant: 'error' })
		}

		// Security: Ensure admin role cannot be assigned via profile
		if (role === 'admin') {
			return fail(403, {
				message: 'Admin Rolle kann nicht über das Profil vergeben werden.',
				variant: 'error'
			})
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
					if (settings[0]?.maxParticipantCount) {
						maxParticipants = settings[0].maxParticipantCount
					}
					if (settings[0]?.maxJurorCount) {
						maxJurors = settings[0].maxJurorCount
					}
				} catch {
					logger.warn('Could not load settings, using default role limits')
				}

				// Count current users with this role (excluding current user)
				const users = (await locals.pb.collection('users').getFullList()) as UsersResponse[]
				const currentCount = users.filter((u) => u.role === role && u.id !== locals.user.id).length

				if (role === 'participant' && currentCount >= maxParticipants) {
					return fail(400, { message: 'Maximale Anzahl Teilnehmer erreicht.', variant: 'error' })
				}

				if (role === 'juror' && currentCount >= maxJurors) {
					return fail(400, { message: 'Maximale Anzahl Juroren erreicht.', variant: 'error' })
				}
			}

			// Update user role
			await locals.pb.collection('users').update(locals.user.id, { role })

			// Update the auth store to reflect the new role immediately
			if (locals.pb.authStore.record) {
				locals.pb.authStore.record.role = role
			}

			logger.info('Role changed via profile', { userId: locals.user.id, newRole: role })
			return { message: `Rolle erfolgreich zu "${role}" geändert.`, variant: 'success' }
		} catch (error) {
			logger.warn('Role change failed via profile', { userId: locals.user.id, role, error })
			return fail(400, { message: 'Fehler beim Ändern der Rolle.', variant: 'error' })
		}
	}
}
