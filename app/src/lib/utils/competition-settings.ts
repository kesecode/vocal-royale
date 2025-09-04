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
