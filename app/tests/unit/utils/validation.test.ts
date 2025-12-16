import { describe, it, expect } from 'vitest'
import type { UserRole, RoundState } from '$lib/pocketbase-types'

describe('Validation Utils', () => {
	describe('User Role Validation', () => {
		const isValidUserRole = (role: string): role is UserRole => {
			return ['participant', 'spectator', 'juror', 'admin'].includes(role as UserRole)
		}

		it('should validate correct user roles', () => {
			expect(isValidUserRole('participant')).toBe(true)
			expect(isValidUserRole('spectator')).toBe(true)
			expect(isValidUserRole('juror')).toBe(true)
			expect(isValidUserRole('admin')).toBe(true)
		})

		it('should reject invalid user roles', () => {
			expect(isValidUserRole('invalid')).toBe(false)
			expect(isValidUserRole('')).toBe(false)
			expect(isValidUserRole('PARTICIPANT')).toBe(false)
			expect(isValidUserRole('participant ')).toBe(false)
			expect(isValidUserRole(' participant')).toBe(false)
		})

		it('should handle edge cases', () => {
			expect(isValidUserRole('null')).toBe(false)
			expect(isValidUserRole('undefined')).toBe(false)
			expect(isValidUserRole('0')).toBe(false)
			expect(isValidUserRole('false')).toBe(false)
		})
	})

	describe('Round State Validation', () => {
		const isValidRoundState = (state: string): state is RoundState => {
			return [
				'singing_phase',
				'rating_phase',
				'result_locked',
				'publish_result',
				'break',
				'rating_refinement'
			].includes(state as RoundState)
		}

		it('should validate correct round states', () => {
			expect(isValidRoundState('singing_phase')).toBe(true)
			expect(isValidRoundState('rating_phase')).toBe(true)
			expect(isValidRoundState('result_locked')).toBe(true)
			expect(isValidRoundState('publish_result')).toBe(true)
			expect(isValidRoundState('break')).toBe(true)
			expect(isValidRoundState('rating_refinement')).toBe(true)
		})

		it('should reject invalid round states', () => {
			expect(isValidRoundState('invalid')).toBe(false)
			expect(isValidRoundState('')).toBe(false)
			expect(isValidRoundState('SINGING_PHASE')).toBe(false)
			expect(isValidRoundState('singing-phase')).toBe(false)
			expect(isValidRoundState('singingphase')).toBe(false)
		})

		it('should handle edge cases', () => {
			expect(isValidRoundState('phase')).toBe(false)
			expect(isValidRoundState('singing_')).toBe(false)
			expect(isValidRoundState('_phase')).toBe(false)
			expect(isValidRoundState('break_phase')).toBe(false)
		})
	})

	describe('Round Number Validation', () => {
		const isValidRound = (round: number): boolean => {
			return Number.isInteger(round) && round >= 1 && round <= 5
		}

		it('should validate correct round numbers', () => {
			expect(isValidRound(1)).toBe(true)
			expect(isValidRound(2)).toBe(true)
			expect(isValidRound(3)).toBe(true)
			expect(isValidRound(4)).toBe(true)
			expect(isValidRound(5)).toBe(true)
		})

		it('should reject invalid round numbers', () => {
			expect(isValidRound(0)).toBe(false)
			expect(isValidRound(6)).toBe(false)
			expect(isValidRound(-1)).toBe(false)
			expect(isValidRound(1.5)).toBe(false)
		})

		it('should handle edge cases', () => {
			expect(isValidRound(NaN)).toBe(false)
			expect(isValidRound(Infinity)).toBe(false)
			expect(isValidRound(-Infinity)).toBe(false)
		})
	})

	describe('Rating Validation', () => {
		const isValidRating = (rating: number): boolean => {
			return Number.isInteger(rating) && rating >= 1 && rating <= 5
		}

		it('should validate correct rating values', () => {
			expect(isValidRating(1)).toBe(true)
			expect(isValidRating(2)).toBe(true)
			expect(isValidRating(3)).toBe(true)
			expect(isValidRating(4)).toBe(true)
			expect(isValidRating(5)).toBe(true)
		})

		it('should reject invalid rating values', () => {
			expect(isValidRating(0)).toBe(false)
			expect(isValidRating(6)).toBe(false)
			expect(isValidRating(-1)).toBe(false)
			expect(isValidRating(3.5)).toBe(false)
		})

		it('should handle edge cases', () => {
			expect(isValidRating(NaN)).toBe(false)
			expect(isValidRating(Infinity)).toBe(false)
			expect(isValidRating(-Infinity)).toBe(false)
		})
	})

	describe('Email Validation', () => {
		const isValidEmail = (email: string): boolean => {
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
			return emailRegex.test(email)
		}

		it('should validate correct email addresses', () => {
			expect(isValidEmail('test@example.com')).toBe(true)
			expect(isValidEmail('user.name@domain.co.uk')).toBe(true)
			expect(isValidEmail('user+tag@example.org')).toBe(true)
			expect(isValidEmail('123@numbers.com')).toBe(true)
		})

		it('should reject invalid email addresses', () => {
			expect(isValidEmail('')).toBe(false)
			expect(isValidEmail('invalid')).toBe(false)
			expect(isValidEmail('invalid@')).toBe(false)
			expect(isValidEmail('@invalid.com')).toBe(false)
			expect(isValidEmail('invalid@.com')).toBe(false)
			expect(isValidEmail('invalid@domain')).toBe(false)
		})

		it('should handle edge cases', () => {
			expect(isValidEmail('test @example.com')).toBe(false)
			expect(isValidEmail('test@ example.com')).toBe(false)
			expect(isValidEmail('test@example .com')).toBe(false)
			expect(isValidEmail('test@example.c om')).toBe(false)
		})
	})

	describe('Comment Length Validation', () => {
		const isValidComment = (comment: string | undefined): boolean => {
			if (comment === undefined) return true
			return comment.length <= 100
		}

		it('should validate comments within length limit', () => {
			expect(isValidComment(undefined)).toBe(true)
			expect(isValidComment('')).toBe(true)
			expect(isValidComment('Short comment')).toBe(true)
			expect(isValidComment('A'.repeat(100))).toBe(true)
		})

		it('should reject comments exceeding length limit', () => {
			expect(isValidComment('A'.repeat(101))).toBe(false)
			expect(isValidComment('A'.repeat(200))).toBe(false)
		})

		it('should handle special characters', () => {
			const specialComment = 'Comment with émojis 🎵 and special chars: @#$%'
			expect(isValidComment(specialComment)).toBe(true)
		})
	})

	describe('ID Validation', () => {
		const isValidId = (id: string): boolean => {
			return typeof id === 'string' && id.length > 0 && /^[a-zA-Z0-9]+$/.test(id)
		}

		it('should validate correct IDs', () => {
			expect(isValidId('user123')).toBe(true)
			expect(isValidId('abc123def')).toBe(true)
			expect(isValidId('123456789')).toBe(true)
			expect(isValidId('ABCDEF')).toBe(true)
		})

		it('should reject invalid IDs', () => {
			expect(isValidId('')).toBe(false)
			expect(isValidId('user-123')).toBe(false)
			expect(isValidId('user_123')).toBe(false)
			expect(isValidId('user 123')).toBe(false)
			expect(isValidId('user@123')).toBe(false)
		})

		it('should handle edge cases', () => {
			expect(isValidId('123')).toBe(true)
			expect(isValidId('a')).toBe(true)
			expect(isValidId('A1B2C3')).toBe(true)
		})
	})

	describe('Batch Validation', () => {
		const validateSongChoice = (data: Record<string, unknown>) => {
			const errors: string[] = []

			if (!data.user || typeof data.user !== 'string') {
				errors.push('Invalid user ID')
			}

			if (
				typeof data.round !== 'number' ||
				!Number.isInteger(data.round) ||
				data.round < 1 ||
				data.round > 5
			) {
				errors.push('Invalid round number')
			}

			if (!data.artist || typeof data.artist !== 'string') {
				errors.push('Invalid artist name')
			}

			if (!data.songTitle || typeof data.songTitle !== 'string') {
				errors.push('Invalid song title')
			}

			if (typeof data.confirmed !== 'boolean') {
				errors.push('Invalid confirmed status')
			}

			return { isValid: errors.length === 0, errors }
		}

		it('should validate complete valid song choice', () => {
			const validChoice = {
				user: 'user123',
				round: 3,
				artist: 'Test Artist',
				songTitle: 'Test Song',
				confirmed: true
			}

			const result = validateSongChoice(validChoice)
			expect(result.isValid).toBe(true)
			expect(result.errors).toHaveLength(0)
		})

		it('should collect multiple validation errors', () => {
			const invalidChoice = {
				user: '',
				round: 0,
				artist: null,
				songTitle: undefined,
				confirmed: 'yes'
			}

			const result = validateSongChoice(invalidChoice)
			expect(result.isValid).toBe(false)
			expect(result.errors).toHaveLength(5)
		})

		it('should handle missing fields', () => {
			const incompleteChoice = {
				user: 'user123'
			}

			const result = validateSongChoice(incompleteChoice)
			expect(result.isValid).toBe(false)
			expect(result.errors.length).toBeGreaterThan(0)
		})
	})
})
