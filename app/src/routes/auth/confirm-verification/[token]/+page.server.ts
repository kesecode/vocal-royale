import { error, redirect } from '@sveltejs/kit'
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

		// Session aktualisieren, damit verified=true ist
		if (locals.pb.authStore.isValid) {
			await locals.pb.collection('users').authRefresh()
		}

		logger.info('Email-Verifizierung erfolgreich', { token })

		// Direkt zur Startseite redirecten
		redirect(303, '/')
	} catch (err) {
		// Redirect-Fehler durchlassen (SvelteKit verwendet Error für Redirects)
		if (err && typeof err === 'object' && 'status' in err && err.status === 303) {
			throw err
		}

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
