import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

const DEFAULT_REGISTRATION_PASSWORD = 'vocal-royale-2025'

export const POST: RequestHandler = async ({ request, locals }) => {
	const pb = locals.pb

	try {
		const body = await request.json()
		const { password } = body

		if (!password || typeof password !== 'string') {
			return json({ valid: false, error: 'Passwort erforderlich' }, { status: 400 })
		}

		// Get current settings from PocketBase
		const list = await pb.collection('settings').getList(1, 1)
		const settings = list.totalItems > 0 ? list.items[0] : null

		// Use configured password or default
		const expectedPassword = settings?.registrationPassword || DEFAULT_REGISTRATION_PASSWORD

		// Check password
		const isValid = password === expectedPassword

		return json({ valid: isValid })
	} catch (error) {
		console.error('Registration password validation error:', error)
		return json({ valid: false, error: 'Serverfehler' }, { status: 500 })
	}
}
