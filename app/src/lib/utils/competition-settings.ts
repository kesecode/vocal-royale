import type { SettingsRecord } from '$lib/pocketbase-types'

export interface CompetitionSettings {
	totalRounds: number
	numberOfFinalSongs: number
	maxParticipantCount: number
	maxJurorCount: number
	songChoiceDeadline: string | null
	roundEliminationPattern: string
}

export const DEFAULT_SETTINGS: CompetitionSettings = {
	totalRounds: 5,
	numberOfFinalSongs: 2,
	maxParticipantCount: 15,
	maxJurorCount: 3,
	songChoiceDeadline: null,
	roundEliminationPattern: '5,3,3,2'
}

/**
 * Calculate total number of songs needed based on rounds and finale songs
 * Formula: totalRounds + numberOfFinalSongs - 1
 *
 * Example: 3 rounds + 2 finale songs = 4 total songs
 * - Round 1: Song 1
 * - Round 2: Song 2
 * - Round 3: Song 3
 * - Finale: Song 4 (additional)
 */
export function calculateTotalSongs(totalRounds: number, numberOfFinalSongs: number): number {
	return totalRounds + numberOfFinalSongs - 1
}

/**
 * Get competition settings from PocketBase settings record
 */
export function parseSettings(settingsRecord?: SettingsRecord | null): CompetitionSettings {
	if (!settingsRecord) {
		return DEFAULT_SETTINGS
	}

	return {
		totalRounds: settingsRecord.totalRounds ?? DEFAULT_SETTINGS.totalRounds,
		numberOfFinalSongs: settingsRecord.numberOfFinalSongs ?? DEFAULT_SETTINGS.numberOfFinalSongs,
		maxParticipantCount: settingsRecord.maxParticipantCount ?? DEFAULT_SETTINGS.maxParticipantCount,
		maxJurorCount: settingsRecord.maxJurorCount ?? DEFAULT_SETTINGS.maxJurorCount,
		songChoiceDeadline: settingsRecord.songChoiceDeadline ?? DEFAULT_SETTINGS.songChoiceDeadline,
		roundEliminationPattern:
			settingsRecord.roundEliminationPattern ?? DEFAULT_SETTINGS.roundEliminationPattern
	}
}

/**
 * Get song labels for the UI
 */
export function getSongLabels(totalRounds: number, numberOfFinalSongs: number): string[] {
	const labels: string[] = []

	// Normale Runden vor dem Finale
	const normalRounds = totalRounds - 1 // Alle Runden außer der letzten
	for (let i = 1; i <= normalRounds; i++) {
		labels.push(`Runde ${i}`)
	}

	// Finale songs
	if (numberOfFinalSongs === 1) {
		labels.push('Finale')
	} else {
		for (let i = 1; i <= numberOfFinalSongs; i++) {
			labels.push(`Finale Song ${i}`)
		}
	}

	return labels
}

/**
 * Check if the song choice deadline has passed
 * @param deadline - ISO 8601 datetime string or null/undefined
 * @returns true if deadline exists and has passed, false otherwise
 */
export function isDeadlinePassed(deadline: string | null | undefined): boolean {
	if (!deadline) return false // No deadline set = always allow
	const deadlineTime = new Date(deadline).getTime()
	const now = new Date().getTime()
	return now > deadlineTime
}

/**
 * Format deadline for display in German locale
 * @param deadline - ISO 8601 datetime string or null/undefined
 * @returns Formatted string like "15.11.2025, 18:30 Uhr" or empty string if no deadline
 */
export function formatDeadline(deadline: string | null | undefined): string {
	if (!deadline) return ''
	const date = new Date(deadline)
	const dateStr = date.toLocaleDateString('de-DE', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric'
	})
	const timeStr = date.toLocaleTimeString('de-DE', {
		hour: '2-digit',
		minute: '2-digit'
	})
	return `${dateStr}, ${timeStr} Uhr`
}

/**
 * Parse the roundEliminationPattern string into an array of numbers
 * @param pattern - Comma-separated pattern like "5,3,3,2"
 * @returns Array of numbers, e.g. [5, 3, 3, 2]
 */
export function parseEliminationPattern(pattern: string): number[] {
	if (!pattern || !pattern.trim()) {
		return []
	}
	return pattern
		.split(',')
		.map((s) => Number(s.trim()) || 0)
		.filter((n) => n >= 0)
}
