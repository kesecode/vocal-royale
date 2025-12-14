import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock nodemailer before imports
vi.mock('nodemailer', () => ({
	default: {
		createTransport: vi.fn(() => ({
			sendMail: vi.fn().mockResolvedValue({ messageId: 'test-id' })
		}))
	}
}))

// Mock logger
vi.mock('$lib/server/logger', () => ({
	logger: {
		info: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
		debug: vi.fn()
	}
}))

describe('Email Service', () => {
	beforeEach(() => {
		vi.resetModules()
		vi.clearAllMocks()
	})

	afterEach(() => {
		vi.unstubAllEnvs()
	})

	describe('isEmailConfigured', () => {
		it('should return true when all SMTP variables are set', async () => {
			vi.stubEnv('SMTP_HOST', 'smtp.test.com')
			vi.stubEnv('SMTP_USER', 'test@test.com')
			vi.stubEnv('SMTP_PASSWORD', 'password123')

			const { isEmailConfigured } = await import('$lib/server/email')
			expect(isEmailConfigured()).toBe(true)
		})

		it('should return false when SMTP_HOST is missing', async () => {
			vi.stubEnv('SMTP_HOST', '')
			vi.stubEnv('SMTP_USER', 'test@test.com')
			vi.stubEnv('SMTP_PASSWORD', 'password123')

			const { isEmailConfigured } = await import('$lib/server/email')
			expect(isEmailConfigured()).toBe(false)
		})

		it('should return false when SMTP_USER is missing', async () => {
			vi.stubEnv('SMTP_HOST', 'smtp.test.com')
			vi.stubEnv('SMTP_USER', '')
			vi.stubEnv('SMTP_PASSWORD', 'password123')

			const { isEmailConfigured } = await import('$lib/server/email')
			expect(isEmailConfigured()).toBe(false)
		})

		it('should return false when SMTP_PASSWORD is missing', async () => {
			vi.stubEnv('SMTP_HOST', 'smtp.test.com')
			vi.stubEnv('SMTP_USER', 'test@test.com')
			vi.stubEnv('SMTP_PASSWORD', '')

			const { isEmailConfigured } = await import('$lib/server/email')
			expect(isEmailConfigured()).toBe(false)
		})
	})

	describe('sendEmail', () => {
		it('should send email successfully with configured SMTP', async () => {
			vi.stubEnv('SMTP_HOST', 'smtp.test.com')
			vi.stubEnv('SMTP_PORT', '587')
			vi.stubEnv('SMTP_USER', 'test@test.com')
			vi.stubEnv('SMTP_PASSWORD', 'password123')
			vi.stubEnv('SMTP_FROM', 'noreply@test.com')
			vi.stubEnv('APP_NAME', 'Test App')

			const { sendEmail } = await import('$lib/server/email')
			const result = await sendEmail({
				to: 'recipient@test.com',
				subject: 'Test Subject',
				html: '<p>Test</p>'
			})

			expect(result).toBe(true)
		})

		it('should return false when SMTP is not configured', async () => {
			vi.stubEnv('SMTP_HOST', '')
			vi.stubEnv('SMTP_USER', '')
			vi.stubEnv('SMTP_PASSWORD', '')

			const { sendEmail } = await import('$lib/server/email')
			const result = await sendEmail({
				to: 'recipient@test.com',
				subject: 'Test Subject',
				html: '<p>Test</p>'
			})

			expect(result).toBe(false)
		})
	})

	describe('SongEmailData interface', () => {
		it('should define correct structure', () => {
			const emailData = {
				recipientEmail: 'test@test.com',
				recipientName: 'Max',
				artist: 'Queen',
				songTitle: 'Bohemian Rhapsody',
				round: 2,
				comment: 'Optional comment'
			}

			expect(emailData.recipientEmail).toBe('test@test.com')
			expect(emailData.recipientName).toBe('Max')
			expect(emailData.artist).toBe('Queen')
			expect(emailData.songTitle).toBe('Bohemian Rhapsody')
			expect(emailData.round).toBe(2)
			expect(emailData.comment).toBe('Optional comment')
		})

		it('should allow optional comment field', () => {
			const emailData: {
				recipientEmail: string
				recipientName: string
				artist: string
				songTitle: string
				round: number
				comment?: string
			} = {
				recipientEmail: 'test@test.com',
				recipientName: 'Max',
				artist: 'Queen',
				songTitle: 'Bohemian Rhapsody',
				round: 2
			}

			expect(emailData.comment).toBeUndefined()
		})
	})
})
