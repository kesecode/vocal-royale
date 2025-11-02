import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { logger } from '$lib/server/logger'

// In-memory rate limiting: Map<userId, lastRequestTimestamp>
const rateLimitMap = new Map<string, number>()
const RATE_LIMIT_WINDOW_MS = 2 * 60 * 1000 // 2 Minuten

// Test helper: reset rate limiting map (only for testing)
export function _resetRateLimitForTesting() {
	rateLimitMap.clear()
}

export const POST: RequestHandler = async ({ locals }) => {
	// Check if user is authenticated
	if (!locals.user) {
		return json({ error: 'Nicht authentifiziert' }, { status: 401 })
	}

	// Check if user is already verified
	if (locals.user.verified) {
		return json({ error: 'Email-Adresse ist bereits bestätigt' }, { status: 400 })
	}

	const userId = locals.user.id
	const now = Date.now()
	const lastRequest = rateLimitMap.get(userId)

	// Rate limiting check
	if (lastRequest && now - lastRequest < RATE_LIMIT_WINDOW_MS) {
		const remainingSeconds = Math.ceil((RATE_LIMIT_WINDOW_MS - (now - lastRequest)) / 1000)
		return json(
			{
				error: `Bitte warte ${remainingSeconds} Sekunden, bevor du erneut eine Bestätigung anforderst`
			},
			{ status: 429 }
		)
	}

	try {
		// Request verification email
		await locals.pb.collection('users').requestVerification(locals.user.email)

		// Update rate limit map
		rateLimitMap.set(userId, now)

		// Clean up old entries (optional, prevents memory leak)
		for (const [id, timestamp] of rateLimitMap.entries()) {
			if (now - timestamp > RATE_LIMIT_WINDOW_MS) {
				rateLimitMap.delete(id)
			}
		}

		logger.info(`Verification email resent for user ${userId} (${locals.user.email})`)

		return json({ success: true, message: 'Bestätigungs-Email wurde gesendet' })
	} catch (e: unknown) {
		const err = e as Error
		logger.error('Error resending verification email:', {
			message: err?.message,
			userId
		})
		return json({ error: 'Fehler beim Senden der Bestätigungs-Email' }, { status: 500 })
	}
}
