import { redirect } from '@sveltejs/kit'
import type { LayoutServerLoad } from './$types'
import { logger } from '$lib/server/logger'
import type { AppSettingsResponse, AppAssetsResponse } from '$lib/pocketbase-types'

export const load: LayoutServerLoad = async ({ locals, url }) => {
	const isAuthRoute = url.pathname === '/auth' || url.pathname.startsWith('/auth/')
	const isLoggedIn = Boolean(locals.user)

	if (!isLoggedIn && !isAuthRoute) {
		const next = encodeURIComponent(url.pathname + url.search)
		logger.debug('Layout guard redirect to /auth', { pathname: url.pathname })
		throw redirect(303, `/auth?reason=auth_required&next=${next}`)
	}

	if (isLoggedIn && isAuthRoute) {
		logger.debug('Layout guard redirect to / (already logged in)', { pathname: url.pathname })
		throw redirect(303, '/')
	}

	const reason = url.searchParams.get('reason') || null

	// Load app settings and favicon (globally available)
	const pb = locals.pb

	// Default app settings (fallback)
	const defaultAppSettings: Record<string, string> = {
		app_name: 'Vocal Royale',
		app_url: 'https://app.example.com'
	}

	let appSettings: Record<string, string> = { ...defaultAppSettings }
	let favicon: { url: string; type: string } | null = null

	try {
		const settingsList = await pb.collection('app_settings').getFullList<AppSettingsResponse>()
		if (settingsList && settingsList.length > 0) {
			// Merge with defaults to ensure all keys exist
			const dbSettings = Object.fromEntries(settingsList.map((s) => [s.key, s.value]))
			appSettings = { ...defaultAppSettings, ...dbSettings }
		}
	} catch (error) {
		logger.warn('Failed to load app_settings, using defaults', { error })
	}

	try {
		const faviconList = await pb.collection('app_assets').getFullList<AppAssetsResponse>({
			filter: 'asset_type = "favicon" && is_active = true',
			sort: '-created',
			limit: 1
		})

		if (faviconList.length > 0) {
			const faviconRecord = faviconList[0]
			favicon = {
				url: pb.files.getURL(faviconRecord, faviconRecord.file),
				type: getFileType(faviconRecord.file)
			}
		}
	} catch (error) {
		logger.warn('Failed to load favicon, using default', { error })
	}

	return { user: locals.user, reason, appSettings, favicon }
}

function getFileType(filename: string): string {
	const ext = filename.split('.').pop()?.toLowerCase()
	const types: Record<string, string> = {
		ico: 'image/x-icon',
		png: 'image/png',
		svg: 'image/svg+xml',
		jpg: 'image/jpeg',
		jpeg: 'image/jpeg',
		gif: 'image/gif',
		webp: 'image/webp'
	}
	return types[ext || ''] || 'image/x-icon'
}
