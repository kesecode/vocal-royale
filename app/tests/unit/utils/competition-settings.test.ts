import { describe, it, expect } from 'vitest'
import {
	calculateTotalSongs,
	getSongLabels,
	parseSettings,
	DEFAULT_SETTINGS
} from '$lib/utils/competition-settings'

describe('competition-settings', () => {
	describe('calculateTotalSongs', () => {
		it('should calculate correct total songs for default settings', () => {
			// 5 rounds + 2 finale songs - 1 = 6 songs
			expect(calculateTotalSongs(5, 2)).toBe(6)
		})

		it('should calculate correct total songs for custom settings', () => {
			// 3 rounds + 2 finale songs - 1 = 4 songs
			expect(calculateTotalSongs(3, 2)).toBe(4)
		})

		it('should handle edge cases', () => {
			// 1 round + 1 finale song - 1 = 1 song
			expect(calculateTotalSongs(1, 1)).toBe(1)

			// 2 rounds + 3 finale songs - 1 = 4 songs
			expect(calculateTotalSongs(2, 3)).toBe(4)
		})

		it('should handle minimum values', () => {
			// 1 round + 1 finale song - 1 = 1 song (minimum possible)
			expect(calculateTotalSongs(1, 1)).toBe(1)
		})
	})

	describe('getSongLabels', () => {
		it('should generate correct labels for default settings', () => {
			// 5 rounds + 2 finale songs = 6 labels (4 regular + 2 finale)
			const labels = getSongLabels(5, 2)
			expect(labels).toEqual([
				'Runde 1',
				'Runde 2',
				'Runde 3',
				'Runde 4',
				'Finale Song 1',
				'Finale Song 2'
			])
		})

		it('should generate correct labels for custom settings', () => {
			// 3 rounds + 2 finale songs = 4 labels (2 regular + 2 finale)
			const labels = getSongLabels(3, 2)
			expect(labels).toEqual(['Runde 1', 'Runde 2', 'Finale Song 1', 'Finale Song 2'])
		})

		it('should handle single finale song', () => {
			// 3 rounds + 1 finale song = 3 labels (2 regular + 1 finale)
			const labels = getSongLabels(3, 1)
			expect(labels).toEqual(['Runde 1', 'Runde 2', 'Finale'])
		})

		it('should handle multiple finale songs', () => {
			// 2 rounds + 4 finale songs = 5 labels (1 regular + 4 finale)
			const labels = getSongLabels(2, 4)
			expect(labels).toEqual([
				'Runde 1',
				'Finale Song 1',
				'Finale Song 2',
				'Finale Song 3',
				'Finale Song 4'
			])
		})
	})

	describe('parseSettings', () => {
		it('should return defaults when no settings provided', () => {
			const result = parseSettings(null)
			expect(result).toEqual(DEFAULT_SETTINGS)
		})

		it('should return defaults when undefined settings provided', () => {
			const result = parseSettings(undefined)
			expect(result).toEqual(DEFAULT_SETTINGS)
		})

		it('should merge settings with defaults', () => {
			const mockSettings = {
				totalRounds: 3,
				numberOfFinalSongs: 1,
				maxParticipantCount: 10
				// Missing other fields
			}

			const result = parseSettings(mockSettings as unknown as Parameters<typeof parseSettings>[0])
			expect(result).toEqual({
				totalRounds: 3,
				numberOfFinalSongs: 1,
				maxParticipantCount: 10,
				maxJurorCount: DEFAULT_SETTINGS.maxJurorCount,
				songChoiceDeadline: DEFAULT_SETTINGS.songChoiceDeadline,
				roundEliminationPattern: DEFAULT_SETTINGS.roundEliminationPattern
			})
		})

		it('should handle all null values in settings record', () => {
			const mockSettings = {
				totalRounds: null,
				numberOfFinalSongs: null,
				maxParticipantCount: null,
				maxJurorCount: null,
				songChoiceDeadline: null,
				roundEliminationPattern: null
			}

			const result = parseSettings(mockSettings as unknown as Parameters<typeof parseSettings>[0])
			expect(result).toEqual(DEFAULT_SETTINGS)
		})
	})

	describe('integration tests', () => {
		it('should calculate songs and labels consistently', () => {
			const totalRounds = 4
			const numberOfFinalSongs = 3

			const totalSongs = calculateTotalSongs(totalRounds, numberOfFinalSongs)
			const labels = getSongLabels(totalRounds, numberOfFinalSongs)

			// Total songs should match number of labels
			expect(totalSongs).toBe(labels.length)
			expect(totalSongs).toBe(6) // 4 + 3 - 1
			expect(labels).toEqual([
				'Runde 1',
				'Runde 2',
				'Runde 3',
				'Finale Song 1',
				'Finale Song 2',
				'Finale Song 3'
			])
		})
	})
})
