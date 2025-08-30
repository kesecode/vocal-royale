import { fail, redirect } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals }) => {
	return { user: locals.user }
}

export const actions: Actions = {
	signup: async ({ request, locals }) => {
		const form = await request.formData()
		const email = String(form.get('email') || '').trim()
		const firstName = String(form.get('firstName') || '').trim()
		const lastName = String(form.get('lastName') || '').trim()
		const artistName = String(form.get('artistName') || '').trim()
		const password = String(form.get('password') || '')
		const passwordConfirm = String(form.get('passwordConfirm') || '')
		const next = String(form.get('next') || '').trim()

		if (!email || !password || !passwordConfirm || !firstName || !lastName || !artistName) {
			return fail(400, { message: 'Bitte alle Felder ausfüllen.' })
		}
		if (password !== passwordConfirm) {
			return fail(400, { message: 'Passwörter stimmen nicht überein.' })
		}

		try {
			const name = `${firstName} ${lastName}`.trim()
			await locals.pb.collection('users').create({
				email,
				password,
				passwordConfirm,
				firstName,
				lastName,
				artistName,
				name,
				role: 'participant'
			})

			// Auto-Login nach Registrierung
			await locals.pb.collection('users').authWithPassword(email, password)
		} catch {
			return fail(400, { message: 'Registrierung fehlgeschlagen.' })
		}

		throw redirect(303, next || '/')
	},

	login: async ({ request, locals }) => {
		const form = await request.formData()
		const email = String(form.get('email') || '').trim()
		const password = String(form.get('password') || '')
		const next = String(form.get('next') || '').trim()

		if (!email || !password) {
			return fail(400, { message: 'Bitte E-Mail und Passwort angeben.' })
		}

		try {
			await locals.pb.collection('users').authWithPassword(email, password)
		} catch {
			return fail(400, { message: 'Passwort falsch oder Benutzer existiert nicht.' })
		}

		throw redirect(303, next || '/')
	},

	logout: async ({ locals }) => {
		locals.pb.authStore.clear()
		throw redirect(303, '/auth')
	}
}
