import { fail, redirect } from '@sveltejs/kit'
import { logger } from '$lib/server/logger'
import type { Actions, PageServerLoad } from './$types'
import type { SettingsResponse, UsersResponse, UserRole } from '$lib/pocketbase-types'
import { isDeadlinePassed } from '$lib/utils/competition-settings'
import {
	getLatestCompetitionState,
	isCompetitionStarted,
	isCompetitionFinished
} from '$lib/server/competition-state'

const APP_COOKIE_KEY = 'pb_auth_aja30'

export const load: PageServerLoad = async ({ locals }) => {
	// Layout guard already enforces auth; just return the user.
	if (!locals.user) {
		return { user: locals.user }
	}

	try {
		// Load role selection settings
		let maxParticipants = 10 // default fallback
		let maxJurors = 3 // default fallback
		let competitionSettings: SettingsResponse | null = null
		try {
			const settings = (await locals.pb.collection('settings').getFullList()) as SettingsResponse[]
			competitionSettings = settings[0] || null
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

		let competitionState = null
		try {
			competitionState = await getLatestCompetitionState(locals.pb)
		} catch (error) {
			logger.warn('Could not load competition state for profile', { error })
		}

		return {
			user: locals.user,
			maxParticipants,
			maxJurors,
			currentParticipants,
			currentJurors,
			competitionSettings,
			competitionState
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

		// Check if competition has started or finished - block artist name changes
		const userRole = locals.user.role
		if (userRole === 'participant' || userRole === 'juror') {
			try {
				const competitionState = await getLatestCompetitionState(locals.pb)
				if (isCompetitionFinished(competitionState)) {
					return fail(403, {
						message: 'Künstlername kann nach Wettbewerbsende nicht mehr geändert werden.',
						variant: 'error'
					})
				}
				if (isCompetitionStarted(competitionState)) {
					return fail(403, {
						message: 'Künstlername kann während des laufenden Wettbewerbs nicht geändert werden.',
						variant: 'error'
					})
				}
			} catch (error) {
				logger.warn('Artist name change: failed to read competition state', { error })
				return fail(500, {
					message: 'Status konnte nicht geladen werden. Bitte erneut versuchen.',
					variant: 'error'
				})
			}
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
	logout: async ({ locals, cookies }) => {
		logger.info('Logout', { userId: locals.user?.id ?? null })
		locals.pb.authStore.clear()
		// Cookie manuell löschen, da redirect() die normale Response-Verarbeitung überspringt
		cookies.delete(APP_COOKIE_KEY, { path: '/' })
		throw redirect(303, '/auth')
	},

	deleteAccount: async ({ locals, cookies }) => {
		if (!locals.user) {
			throw redirect(303, '/auth')
		}
		const userId = locals.user.id

		try {
			const competitionState = await getLatestCompetitionState(locals.pb)
			if (isCompetitionFinished(competitionState)) {
				return fail(403, {
					message: 'Konto kann nach Wettbewerbsende nicht gelöscht werden.',
					variant: 'error'
				})
			}
			if (isCompetitionStarted(competitionState)) {
				return fail(403, {
					message: 'Konto kann während des laufenden Wettbewerbs nicht gelöscht werden.',
					variant: 'error'
				})
			}
		} catch (error) {
			logger.warn('Account deletion blocked: could not read competition state', { userId, error })
			return fail(500, { message: 'Status konnte nicht geladen werden.', variant: 'error' })
		}

		try {
			// First delete all song_choices for this user (cascade)
			const songChoices = await locals.pb.collection('song_choices').getFullList({
				filter: `user = "${userId}"`
			})
			for (const choice of songChoices) {
				await locals.pb.collection('song_choices').delete(choice.id)
			}

			// Now delete the user
			await locals.pb.collection('users').delete(userId)
		} catch {
			logger.warn('Account deletion failed', { userId })
			return fail(400, { message: 'Löschen fehlgeschlagen.', variant: 'error' })
		}

		logger.info('Account deleted', { userId })
		locals.pb.authStore.clear()
		// Cookie manuell löschen, da redirect() die normale Response-Verarbeitung überspringt
		cookies.delete(APP_COOKIE_KEY, { path: '/' })
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
			const competitionState = await getLatestCompetitionState(locals.pb)
			// Komplett sperren wenn Wettbewerb beendet
			if (isCompetitionFinished(competitionState)) {
				return fail(403, {
					message: 'Rollenwechsel nach Wettbewerbsende nicht mehr möglich.',
					variant: 'error'
				})
			}
			// Teilnehmer und Juror sperren während laufendem Wettbewerb
			if (isCompetitionStarted(competitionState) && (role === 'participant' || role === 'juror')) {
				return fail(403, {
					message: 'Teilnehmer- und Juror-Rollen sind nach Wettbewerbsstart gesperrt.',
					variant: 'error'
				})
			}
		} catch (error) {
			logger.warn('Role change: failed to read competition state', { error })
			return fail(500, {
				message: 'Status konnte nicht geladen werden. Bitte erneut versuchen.',
				variant: 'error'
			})
		}

		// Check if deadline has passed - no role changes after deadline
		try {
			const settings = (await locals.pb.collection('settings').getFullList()) as SettingsResponse[]
			const deadline = settings[0]?.songChoiceDeadline

			if (deadline && isDeadlinePassed(deadline)) {
				logger.warn('Role change prevented: deadline passed', {
					userId: locals.user.id,
					requestedRole: role,
					deadline
				})
				return fail(403, {
					message: 'Rollenwechsel nicht mehr möglich. Die Deadline ist abgelaufen.',
					variant: 'error'
				})
			}
		} catch (error) {
			logger.warn('Could not check deadline for role change', { error })
			// Fallback: Allow role change if settings cannot be loaded
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
				const currentCount = users.filter((u) => u.role === role && u.id !== locals.user?.id).length

				if (role === 'participant' && currentCount >= maxParticipants) {
					return fail(400, { message: 'Maximale Anzahl Teilnehmer erreicht.', variant: 'error' })
				}

				if (role === 'juror' && currentCount >= maxJurors) {
					return fail(400, { message: 'Maximale Anzahl Juroren erreicht.', variant: 'error' })
				}
			}

			// Store old role before update
			const oldRole = locals.user.role

			// Update user role
			await locals.pb.collection('users').update(locals.user.id, { role })

			// Delete all song choices if user was participant and is now changing to a different role
			if (oldRole === 'participant' && role !== 'participant') {
				try {
					const songChoices = await locals.pb.collection('song_choices').getFullList({
						filter: `user = "${locals.user.id}"`
					})

					// Delete each song choice record
					for (const choice of songChoices) {
						await locals.pb.collection('song_choices').delete(choice.id)
					}

					logger.info('Deleted song choices after role change from participant', {
						userId: locals.user.id,
						oldRole,
						newRole: role,
						deletedCount: songChoices.length
					})
				} catch (error) {
					logger.warn('Failed to delete song choices after role change', {
						userId: locals.user.id,
						error
					})
					// Not critical - role change has already succeeded
				}
			}

			// Update the auth store to reflect the new role immediately
			if (locals.pb.authStore.record) {
				locals.pb.authStore.record.role = role
			}

			logger.info('Role changed via profile', { userId: locals.user.id, oldRole, newRole: role })
			return { message: `Rolle erfolgreich zu "${role}" geändert.`, variant: 'success' }
		} catch (error) {
			logger.warn('Role change failed via profile', { userId: locals.user.id, role, error })
			return fail(400, { message: 'Fehler beim Ändern der Rolle.', variant: 'error' })
		}
	}
}
