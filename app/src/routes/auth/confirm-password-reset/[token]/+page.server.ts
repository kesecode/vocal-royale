import { fail, redirect } from '@sveltejs/kit'
import { logger } from '$lib/server/logger'
import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params }) => {
	return { token: params.token }
}

export const actions: Actions = {
	default: async ({ request, params, locals }) => {
		const token = params.token
		const form = await request.formData()
		const password = String(form.get('password') || '')
		const passwordConfirm = String(form.get('passwordConfirm') || '')

		if (!password || !passwordConfirm) {
			return fail(400, {
				message: 'Bitte alle Felder ausfüllen.'
			})
		}

		if (password !== passwordConfirm) {
			return fail(400, {
				message: 'Passwörter stimmen nicht überein.'
			})
		}

		if (password.length < 8) {
			return fail(400, {
				message: 'Passwort muss mindestens 8 Zeichen lang sein.'
			})
		}

		try {
			await locals.pb.collection('users').confirmPasswordReset(token, password, passwordConfirm)

			logger.info('Passwort erfolgreich zurückgesetzt')
		} catch (err) {
			logger.warn('Passwort-Reset fehlgeschlagen', {
				error: String(err)
			})

			return fail(400, {
				message: 'Der Reset-Link ist ungültig oder abgelaufen.'
			})
		}

		throw redirect(303, '/auth?reason=password_reset_success')
	}
}
