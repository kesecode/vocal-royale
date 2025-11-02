import { fail } from '@sveltejs/kit'
import { logger } from '$lib/server/logger'
import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async () => {
	return {}
}

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const form = await request.formData()
		const email = String(form.get('email') || '').trim()

		if (!email) {
			return fail(400, {
				message: 'Bitte E-Mail-Adresse angeben.'
			})
		}

		try {
			await locals.pb.collection('users').requestPasswordReset(email)

			logger.info('Passwort-Reset angefordert', { email })

			return {
				success: true,
				message: 'Wenn ein Konto mit dieser E-Mail existiert, wurde eine E-Mail gesendet.'
			}
		} catch (err) {
			logger.warn('Passwort-Reset-Anfrage fehlgeschlagen', {
				email,
				error: String(err)
			})

			// Security: Immer gleiche Nachricht zurückgeben (verhindert Email-Enumeration)
			return {
				success: true,
				message: 'Wenn ein Konto mit dieser E-Mail existiert, wurde eine E-Mail gesendet.'
			}
		}
	}
}
