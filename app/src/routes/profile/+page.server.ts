import { fail, redirect } from '@sveltejs/kit'
import { logger } from '$lib/server/logger'
import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals }) => {
	// Layout guard already enforces auth; just return the user.
	return { user: locals.user }
}

export const actions: Actions = {
	changePassword: async ({ request, locals }) => {
		if (!locals.user) {
			throw redirect(303, '/auth')
		}
		const form = await request.formData()
		const password = String(form.get('password') || '')
		const passwordConfirm = String(form.get('passwordConfirm') || '')
		if (!password || !passwordConfirm) {
			return fail(400, { message: 'Bitte beide Passwörter eingeben.', variant: 'error' })
		}
		if (password !== passwordConfirm) {
			return fail(400, { message: 'Passwörter stimmen nicht überein.', variant: 'error' })
		}
		try {
			await locals.pb.collection('users').update(locals.user.id, { password, passwordConfirm })
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
	}
}
