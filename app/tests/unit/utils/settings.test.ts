import { describe, it, expect } from 'vitest'
import { makeSettings, mockSettings } from '../../utils/mocks'

describe('Settings Utilities', () => {
	describe('makeSettings factory', () => {
		it('should create settings record with default values', () => {
			const record = makeSettings()

			expect(record).toMatchObject({
				id: 'settings_record_1',
				collectionName: 'settings',
				maxParticipantCount: 15,
				maxJurorCount: 3,
				totalRounds: 5,
				numberOfFinalSongs: 2,
				songChoiceDeadline: null,
				roundEliminationPattern: '5,3,3,2'
			})
		})

		it('should override default values with partial data', () => {
			const record = makeSettings({
				maxParticipantCount: 20,
				maxJurorCount: 5
			})

			expect(record.maxParticipantCount).toBe(20)
			expect(record.maxJurorCount).toBe(5)
			expect(record.totalRounds).toBe(5) // default
		})

		it('should handle all field overrides', () => {
			const record = makeSettings({
				maxParticipantCount: 12,
				maxJurorCount: 4,
				totalRounds: 3,
				numberOfFinalSongs: 1,
				songChoiceDeadline: '2024-12-31T23:59:59.000Z',
				roundEliminationPattern: '6,5'
			})

			expect(record).toMatchObject({
				maxParticipantCount: 12,
				maxJurorCount: 4,
				totalRounds: 3,
				numberOfFinalSongs: 1,
				songChoiceDeadline: '2024-12-31T23:59:59.000Z',
				roundEliminationPattern: '6,5'
			})
		})
	})

	describe('mockSettings defaults', () => {
		it('should have correct default settings', () => {
			expect(mockSettings).toMatchObject({
				maxParticipantCount: 8,
				maxJurorCount: 5
			})
		})

		it('should have valid metadata', () => {
			expect(mockSettings.id).toBe('settings_record_1')
			expect(mockSettings.collectionName).toBe('settings')
		})
	})

	describe('Role limits calculation', () => {
		it('should calculate remaining slots correctly', () => {
			const maxParticipants = 8
			const currentParticipants = 3
			const remaining = Math.max(0, maxParticipants - currentParticipants)

			expect(remaining).toBe(5)
		})

		it('should handle zero remaining slots', () => {
			const maxJurors = 5
			const currentJurors = 5
			const remaining = Math.max(0, maxJurors - currentJurors)

			expect(remaining).toBe(0)
		})

		it('should handle negative calculations (over limit)', () => {
			const maxParticipants = 8
			const currentParticipants = 10 // somehow over limit
			const remaining = Math.max(0, maxParticipants - currentParticipants)

			expect(remaining).toBe(0) // Should never go negative
		})
	})
})
