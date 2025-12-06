import { error, redirect } from '@sveltejs/kit'
import { logger } from '$lib/server/logger'
import { env } from '$env/dynamic/private'
import type { PageServerLoad } from './$types'

const SESSION_MAX_AGE = Number(env.SESSION_MAX_AGE || 60 * 60 * 48)
const APP_COOKIE_KEY = 'pb_auth_aja30'

export const load: PageServerLoad = async ({ params, locals, cookies, url }) => {
	const token = params.token

	if (!token) {
		throw error(400, 'Kein Verifizierungs-Token angegeben')
	}

	try {
		// Token an PocketBase senden (funktioniert auch ohne Login!)
		await locals.pb.collection('users').confirmVerification(token)
		logger.info('Email-Verifizierung erfolgreich', { token })

		// Fall 1: User ist eingeloggt
		if (locals.pb.authStore.isValid) {
			// Session aktualisieren, damit verified=true ist
			await locals.pb.collection('users').authRefresh()

			// Cookie manuell setzen, da redirect() die normale Response-Verarbeitung überspringt
			// Format muss mit PocketBase's loadFromCookie kompatibel sein
			const cookieValue = JSON.stringify({
				token: locals.pb.authStore.token,
				record: locals.pb.authStore.record
			})
			cookies.set(APP_COOKIE_KEY, cookieValue, {
				secure: url.protocol === 'https:',
				httpOnly: true,
				sameSite: 'lax',
				path: '/',
				maxAge: SESSION_MAX_AGE
			})

			// Zur Startseite (Modal verschwindet weil verified=true)
			redirect(303, '/')
		}

		// Fall 2: User ist ausgeloggt - Success-Seite anzeigen
		return {
			success: true,
			message: 'Deine Email-Adresse wurde erfolgreich bestätigt! Du kannst dich jetzt einloggen.'
		}
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
