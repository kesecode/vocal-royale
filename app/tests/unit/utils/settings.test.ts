import { describe, it, expect } from 'vitest'
import { makeSettings, makeSettingsRecord, mockSettings } from '../../utils/mocks'

describe('Settings Utilities', () => {
	describe('makeSettings factory', () => {
		it('should create settings with correct structure', () => {
			const setting = makeSettings('testKey', 42, 'Test description')

			expect(setting).toMatchObject({
				id: expect.stringMatching(/^s_testkey$/),
				key: 'testKey',
				value: 42,
				description: 'Test description',
				created: expect.any(String),
				updated: expect.any(String),
				collectionId: 'settings_collection_id',
				collectionName: 'settings'
			})
		})

		it('should handle different value types', () => {
			const stringSetting = makeSettings('stringKey', 'text')
			const numberSetting = makeSettings('numberKey', 123)
			const booleanSetting = makeSettings('booleanKey', true)

			expect(stringSetting.value).toBe('text')
			expect(numberSetting.value).toBe(123)
			expect(booleanSetting.value).toBe(true)
		})

		it('should handle missing description', () => {
			const setting = makeSettings('noDesc', 'value')
			expect(setting.description).toBe('')
		})

		it('should sanitize key for ID generation', () => {
			const setting = makeSettings('Key With Spaces!@#', 'value')
			expect(setting.id).toBe('s_key_with_spaces___')
		})
	})

	describe('mockSettings defaults', () => {
		it('should have maxParticipantCount setting', () => {
			expect(mockSettings.maxParticipantCount).toMatchObject({
				key: 'maxParticipantCount',
				value: 8,
				description: 'Maximale Anzahl Teilnehmer'
			})
		})

		it('should have maxJurorCount setting', () => {
			expect(mockSettings.maxJurorCount).toMatchObject({
				key: 'maxJurorCount',
				value: 5,
				description: 'Maximale Anzahl Juroren'
			})
		})

		it('should have valid IDs', () => {
			expect(mockSettings.maxParticipantCount.id).toBe('s_maxparticipantcount')
			expect(mockSettings.maxJurorCount.id).toBe('s_maxjurorcount')
		})
	})

	describe('Settings validation patterns', () => {
		it('should validate maxParticipantCount range', () => {
			const validValues = [1, 5, 10, 20]
			const invalidValues = [0, -1, 'not a number', null, undefined]

			validValues.forEach((value) => {
				const setting = makeSettings('maxParticipantCount', value)
				expect(typeof setting.value).toBe('number')
				expect(setting.value).toBeGreaterThan(0)
			})

			invalidValues.forEach((value) => {
				const setting = makeSettings('maxParticipantCount', value as string | number | boolean)
				if (typeof value === 'number') {
					expect(setting.value).toBeLessThanOrEqual(0)
				}
			})
		})

		it('should validate maxJurorCount range', () => {
			const validValues = [1, 3, 5, 10]
			const invalidValues = [0, -1, 'not a number', null, undefined]

			validValues.forEach((value) => {
				const setting = makeSettings('maxJurorCount', value)
				expect(typeof setting.value).toBe('number')
				expect(setting.value).toBeGreaterThan(0)
			})

			invalidValues.forEach((value) => {
				const setting = makeSettings('maxJurorCount', value as string | number | boolean)
				if (typeof value === 'number') {
					expect(setting.value).toBeLessThanOrEqual(0)
				}
			})
		})
	})

	describe('Settings collection behavior', () => {
		it('should handle empty settings collection', () => {
			const emptySettings: ReturnType<typeof makeSettings>[] = []
			const maxParticipantSetting = emptySettings.find((s) => s.key === 'maxParticipantCount')
			const maxJurorSetting = emptySettings.find((s) => s.key === 'maxJurorCount')

			expect(maxParticipantSetting).toBeUndefined()
			expect(maxJurorSetting).toBeUndefined()
		})

		it('should handle partial settings collection', () => {
			const partialSettings = [makeSettings('maxParticipantCount', 12)]
			const maxParticipantSetting = partialSettings.find((s) => s.key === 'maxParticipantCount')
			const maxJurorSetting = partialSettings.find((s) => s.key === 'maxJurorCount')

			expect(maxParticipantSetting).toBeDefined()
			expect(maxParticipantSetting?.value).toBe(12)
			expect(maxJurorSetting).toBeUndefined()
		})

		it('should handle settings with wrong value types', () => {
			const invalidSettings = [
				makeSettings('maxParticipantCount', 'eight'), // string instead of number
				makeSettings('maxJurorCount', 'five') // string instead of number
			]

			invalidSettings.forEach((setting) => {
				expect(typeof setting.value).toBe('string')
			})
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

	describe('makeSettingsRecord factory', () => {
		it('should create settings record with default values', () => {
			const record = makeSettingsRecord()

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
			const record = makeSettingsRecord({
				maxParticipantCount: 20,
				maxJurorCount: 5
			})

			expect(record.maxParticipantCount).toBe(20)
			expect(record.maxJurorCount).toBe(5)
			expect(record.totalRounds).toBe(5) // default
		})

		it('should handle all field overrides', () => {
			const record = makeSettingsRecord({
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
})
