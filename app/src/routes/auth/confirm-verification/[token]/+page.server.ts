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
		// Token an PocketBase senden
		await locals.pb.collection('users').confirmVerification(token)

		// Session aktualisieren, damit verified=true ist
		if (locals.pb.authStore.isValid) {
			await locals.pb.collection('users').authRefresh()
		}

		// Cookie manuell setzen, da redirect() die normale Response-Verarbeitung überspringt
		// und das Cookie sonst nicht aktualisiert wird
		const cookieValue = encodeURIComponent(
			JSON.stringify({
				token: locals.pb.authStore.token,
				record: locals.pb.authStore.record
			})
		)
		cookies.set(APP_COOKIE_KEY, cookieValue, {
			secure: url.protocol === 'https:',
			httpOnly: true,
			sameSite: 'lax',
			path: '/',
			maxAge: SESSION_MAX_AGE
		})

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
