import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

export const GET: RequestHandler = async ({ locals }) => {
	const pb = locals.pb

	try {
		// Get current settings
		const list = await pb.collection('settings').getList(1, 1)
		const settings = list.totalItems > 0 ? list.items[0] : null

		return json({
			settings
		})
	} catch (error) {
		console.error('Settings GET error:', error)
		return json({ error: 'Fehler beim Laden der Einstellungen' }, { status: 500 })
	}
}

export const POST: RequestHandler = async ({ request, locals }) => {
	const pb = locals.pb

	try {
		const body = await request.json()
		const { action, settings } = body

		if (action === 'update') {
			// Validate settings
			if (!settings || typeof settings !== 'object') {
				return json({ error: 'Ungültige Einstellungen' }, { status: 400 })
			}

			// Validate roundEliminationPattern
			const pattern = settings.roundEliminationPattern
			const totalRounds = settings.totalRounds
			const maxParticipants = settings.maxParticipantCount
			// numberOfFinalSongs wird nicht mehr für Validierung benötigt (Finale hat immer 2 Teilnehmer)

			if (pattern && totalRounds && maxParticipants) {
				const validationError = validateEliminationPattern(pattern, totalRounds, maxParticipants)
				if (validationError) {
					return json({ error: validationError }, { status: 400 })
				}
			}

			// Get current settings to update
			const list = await pb.collection('settings').getList(1, 1)

			if (list.totalItems === 0) {
				// Create new settings record
				await pb.collection('settings').create(settings)
			} else {
				// Update existing settings
				const existing = list.items[0]
				await pb.collection('settings').update(existing.id, settings)
			}

			return json({ success: true })
		}

		return json({ error: 'Unbekannte Aktion' }, { status: 400 })
	} catch (error) {
		console.error('Settings POST error:', error)
		return json({ error: 'Serverfehler' }, { status: 500 })
	}
}

function validateEliminationPattern(
	pattern: string,
	totalRounds: number,
	maxParticipants: number
	// numberOfFinalSongs wird ignoriert, da im Finale immer 2 Teilnehmer erwartet werden
): string | null {
	if (!pattern.trim()) return 'Ausscheidungsmuster darf nicht leer sein'

	const parts = pattern.split(',').map((s) => s.trim())
	const expectedParts = totalRounds - 1

	if (parts.length !== expectedParts) {
		return `Für ${totalRounds} Runden werden ${expectedParts} komma-separierte Werte erwartet`
	}

	const numbers = parts.map((p) => parseInt(p, 10))
	if (numbers.some((n) => isNaN(n) || n < 0)) {
		return 'Alle Werte müssen nicht-negative Zahlen sein'
	}

	const totalEliminations = numbers.reduce((sum, n) => sum + n, 0)
	const remaining = maxParticipants - totalEliminations

	// Im Finale sind immer 2 Teilnehmer erwartet, unabhängig von numberOfFinalSongs
	if (remaining !== 2) {
		return `Bei ${maxParticipants} Teilnehmern und ${totalEliminations} Eliminierungen bleiben ${remaining} für das Finale, erwartet werden 2`
	}

	return null
}
