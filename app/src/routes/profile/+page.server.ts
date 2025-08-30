import { fail, redirect } from '@sveltejs/kit'
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
			return { message: 'Passwort erfolgreich aktualisiert.', variant: 'success' }
		} catch {
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
			return { message: 'Künstlername gespeichert.', variant: 'success' }
		} catch {
			return fail(400, { message: 'Aktualisierung fehlgeschlagen.', variant: 'error' })
		}
	},
	logout: async ({ locals }) => {
		locals.pb.authStore.clear()
		throw redirect(303, '/auth')
	}
}
