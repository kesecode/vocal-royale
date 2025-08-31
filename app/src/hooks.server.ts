import PocketBase from 'pocketbase'
import type { TypedPocketBase } from '$lib/pocketbase-types'
import type { Handle } from '@sveltejs/kit'
import { redirect } from '@sveltejs/kit'
import { logger } from '$lib/server/logger'
import configData from '$lib/config/config.json'
import { env } from '$env/dynamic/private'
import type { UsersResponse } from '$lib/pocketbase-types'

type AppConfig = {
	PB_URL?: string
}
const config: AppConfig = configData as AppConfig

const BASE_URL = env.PB_URL || config.PB_URL || 'http://127.0.0.1:8090'

export const handle: Handle = async ({ event, resolve }) => {
	const pb = new PocketBase(BASE_URL) as TypedPocketBase

	// Load auth state from cookie (if present)
	const cookie = event.request.headers.get('cookie') ?? ''
	// Use an app-specific cookie key to avoid collisions with
	// PocketBase Admin's default `pb_auth` cookie on the same domain.
	const APP_COOKIE_KEY = 'pb_auth_aja30'
	pb.authStore.loadFromCookie(cookie, APP_COOKIE_KEY)

	// Expose on locals for load/functions
	event.locals.pb = pb
	event.locals.user = pb.authStore.record as UsersResponse | null

	// Guard: only '/auth' is public; enforce role-based route access
	const pathname = event.url.pathname
	const isAuthRoute = pathname === '/auth' || pathname.startsWith('/auth/')
	const isLoggedIn = Boolean(event.locals.user)
	const isAsset =
		pathname.startsWith('/_app/') ||
		pathname.startsWith('/build/') ||
		pathname.startsWith('/assets/') ||
		pathname === '/favicon.ico'
	const nextParam = encodeURIComponent(event.url.pathname + event.url.search)

	if (!isLoggedIn && !isAuthRoute && !isAsset) {
		logger.debug('Guard redirect to /auth', { pathname })
		throw redirect(303, `/auth?reason=auth_required&next=${nextParam}`)
	}
	if (isLoggedIn && isAuthRoute) {
		logger.debug('Guard redirect to / (already logged in)', { pathname })
		throw redirect(303, '/')
	}

	// Role-based route allowlist
	if (isLoggedIn && !isAsset) {
		const role = event.locals.user?.role as string | undefined
		const allowCommon =
			pathname === '/' || pathname === '/profile' || pathname.startsWith('/profile')
		const allowForbidden = pathname === '/forbidden'

		const allowParticipant = pathname.startsWith('/song-choice')
		const allowSpectatorJuror = pathname.startsWith('/rating')
		const allowAdmin = pathname.startsWith('/admin')

		let allowed = allowCommon || allowForbidden
		if (role === 'participant') allowed ||= allowParticipant
		else if (role === 'spectator' || role === 'juror') allowed ||= allowSpectatorJuror
		else if (role === 'admin') allowed ||= allowAdmin

		if (!allowed) {
			logger.debug('Guard role deny', { pathname, role })
			// Redirect to dedicated forbidden page
			throw redirect(303, '/forbidden')
		}
	}

	const response = await resolve(event)

	// Sync auth cookie back to client
	response.headers.append(
		'set-cookie',
		pb.authStore.exportToCookie({
			secure: event.url.protocol === 'https:',
			httpOnly: true,
			sameSite: 'Lax',
			path: '/'
		}, APP_COOKIE_KEY)
	)

	return response
}
