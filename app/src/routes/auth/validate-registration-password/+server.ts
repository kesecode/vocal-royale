import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import PocketBase from 'pocketbase'
import type { TypedPocketBase } from '$lib/pocketbase-types'
import { env } from '$env/dynamic/private'
import { logger } from '$lib/server/logger'

const DEFAULT_REGISTRATION_PASSWORD = 'vocal-royale-2025'
const BASE_URL = env.PB_URL || 'http://127.0.0.1:8090'

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json()
		const { password } = body

		if (!password || typeof password !== 'string') {
			return json({ valid: false, error: 'Passwort erforderlich' }, { status: 400 })
		}

		// Use admin credentials to read settings (unauthenticated users can't read settings)
		const adminPb = new PocketBase(BASE_URL) as TypedPocketBase
		const adminEmail = env.ADMIN_EMAIL || 'admin@vocal.royale'
		const adminPassword = env.ADMIN_PASSWORD || 'ChangeMeNow!'

		let expectedPassword = DEFAULT_REGISTRATION_PASSWORD

		try {
			await adminPb.collection('users').authWithPassword(adminEmail, adminPassword)
			const list = await adminPb.collection('settings').getList(1, 1)
			const settings = list.totalItems > 0 ? list.items[0] : null
			logger.info('Registration password check', {
				hasSettings: !!settings,
				registrationPassword: settings?.registrationPassword,
				usingDefault: !settings?.registrationPassword
			})
			expectedPassword = settings?.registrationPassword || DEFAULT_REGISTRATION_PASSWORD
		} catch (err) {
			logger.warn('Registration password: admin auth failed', { error: (err as Error)?.message })
			// If admin auth fails or settings can't be read, use default password
		} finally {
			adminPb.authStore.clear()
		}

		// Check password
		const isValid = password === expectedPassword
		logger.info('Registration password validation', {
			isValid,
			expectedLength: expectedPassword.length
		})

		return json({ valid: isValid })
	} catch (error) {
		console.error('Registration password validation error:', error)
		return json({ valid: false, error: 'Serverfehler' }, { status: 500 })
	}
}
