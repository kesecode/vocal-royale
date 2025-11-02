import { error } from '@sveltejs/kit'
import { logger } from '$lib/server/logger'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params, locals }) => {
	const token = params.token

	if (!token) {
		throw error(400, 'Kein Verifizierungs-Token angegeben')
	}

	try {
		// Token an PocketBase senden
		await locals.pb.collection('users').confirmVerification(token)

		logger.info('Email-Verifizierung erfolgreich', { token })

		return {
			success: true,
			message: 'Deine E-Mail wurde erfolgreich verifiziert!'
		}
	} catch (err) {
		logger.warn('Email-Verifizierung fehlgeschlagen', {
			token,
			error: String(err)
		})

		return {
			success: false,
			message: 'Der Verifizierungs-Link ist ungültig oder abgelaufen.'
		}
	}
}
